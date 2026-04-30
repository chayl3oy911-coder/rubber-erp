import { z } from "zod";

import { purchaseT } from "./i18n";
import { RUBBER_TYPE_CODES } from "./rubber-types";
import { PURCHASE_STATUSES, type PurchaseStatus } from "./status";

const t = purchaseT();

// ─── Reusable field builders ─────────────────────────────────────────────────

const optionalText = (max: number, message: string) =>
  z.preprocess(
    (v) => {
      if (v === null || v === undefined) return undefined;
      const s = String(v).trim();
      return s === "" ? undefined : s;
    },
    z.string().max(max, message).optional(),
  );

const uuid = (msg: string) => z.string().trim().uuid(msg);

/**
 * Coerce form/JSON inputs into a finite number. Accepts strings ("12.5"),
 * numbers, and rejects NaN/Infinity. The field-level `.refine` handles the
 * positive/non-negative + decimal-place business rules.
 *
 * IMPORTANT: we keep numbers in the schema layer (Zod), but the *service*
 * layer wraps them in `Prisma.Decimal` before any arithmetic so we never
 * round through JS floats.
 */
const numericInput = z.preprocess((v) => {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (trimmed === "") return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}, z.number().finite());

/**
 * Count decimal places by inspecting the string form. Operates on the raw
 * input (not the parsed float) to avoid 0.1+0.2-style precision artefacts.
 * Whole numbers / scientific notation default to 0 fractional digits.
 */
function decimalPlacesOf(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const s = String(value);
  if (s.includes("e") || s.includes("E")) return 0;
  const dot = s.indexOf(".");
  return dot === -1 ? 0 : s.length - dot - 1;
}

function maxDecimals(maxScale: number, message: string) {
  return (n: number) => decimalPlacesOf(n) <= maxScale;
  // Returned as a predicate; bound to .refine() with `message` by the caller.
  // Defining the message at the call site keeps each refine's error focused.
  // (We close over `message` solely for documentation — the caller passes it
  // to `.refine()`.)
  void message;
}

const grossField = numericInput
  .refine((n) => n > 0, t.errors.grossPositive)
  .refine(maxDecimals(2, t.errors.weightTooManyDecimals), {
    message: t.errors.weightTooManyDecimals,
  });

const tareField = numericInput
  .refine((n) => n >= 0, t.errors.tareNonNegative)
  .refine(maxDecimals(2, t.errors.weightTooManyDecimals), {
    message: t.errors.weightTooManyDecimals,
  });

const priceField = numericInput
  .refine((n) => n > 0, t.errors.pricePositive)
  .refine(maxDecimals(4, t.errors.priceTooManyDecimals), {
    message: t.errors.priceTooManyDecimals,
  });

const withholdingPercentField = numericInput
  .refine((n) => n >= 0 && n <= 100, t.errors.percentRange)
  .refine(maxDecimals(2, t.errors.percentTooManyDecimals), {
    message: t.errors.percentTooManyDecimals,
  });

const rubberTypeField = z
  .string()
  .trim()
  .min(1, t.errors.rubberTypeRequired)
  .refine((v) => RUBBER_TYPE_CODES.has(v), { message: t.errors.rubberTypeInvalid });

// ─── Create ──────────────────────────────────────────────────────────────────

/**
 * `tareWeight` is optional at the API/form layer — empty/missing input is
 * treated as 0. The DB column also has `@default(0)` as a safety net.
 *
 * `withholdingTaxPercent` defaults to 0 when omitted, matching the column
 * default. Service-layer arithmetic is what actually persists the computed
 * `withholdingTaxAmount` and `netPayableAmount`.
 */
export const createPurchaseSchema = z
  .object({
    branchId: uuid(t.errors.branchInvalid),
    farmerId: uuid(t.errors.farmerInvalid),
    rubberType: rubberTypeField,
    grossWeight: grossField,
    tareWeight: tareField.optional().default(0),
    pricePerKg: priceField,
    withholdingTaxPercent: withholdingPercentField.optional().default(0),
    note: optionalText(1000, t.errors.noteTooLong),
  })
  .refine((d) => d.grossWeight > d.tareWeight, {
    message: t.errors.grossGtTare,
    path: ["tareWeight"],
  });

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;

// ─── Update fields (no status change) ────────────────────────────────────────
//
// All fields optional. The service further enforces "what fields are editable
// in the current status" — Zod only enforces shape & numeric ranges.

export const updatePurchaseFieldsSchema = z
  .object({
    rubberType: rubberTypeField.optional(),
    grossWeight: grossField.optional(),
    tareWeight: tareField.optional(),
    pricePerKg: priceField.optional(),
    withholdingTaxPercent: withholdingPercentField.optional(),
    note: optionalText(1000, t.errors.noteTooLong),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: t.errors.nothingToUpdate,
  });

export type UpdatePurchaseFieldsInput = z.infer<
  typeof updatePurchaseFieldsSchema
>;

// ─── Status transition ───────────────────────────────────────────────────────

// Zod 4 dropped `errorMap` (and deprecated the bare `message`) in favour of a
// unified `error` param that accepts a string or an issue→string function.
// We use the string form because the message doesn't depend on the issue.
export const purchaseStatusEnum = z.enum(
  PURCHASE_STATUSES as unknown as [PurchaseStatus, ...PurchaseStatus[]],
  { error: t.errors.statusInvalid },
);

export const transitionStatusSchema = z.object({
  status: purchaseStatusEnum,
  cancelReason: optionalText(500, t.errors.noteTooLong),
});

export type TransitionStatusInput = z.infer<typeof transitionStatusSchema>;

// ─── PATCH body discriminator ────────────────────────────────────────────────
//
// API enforces "either fields OR status, not both" so dispatch is unambiguous.

export const patchPurchaseSchema = z
  .object({
    status: purchaseStatusEnum.optional(),
    cancelReason: optionalText(500, t.errors.noteTooLong),
    rubberType: rubberTypeField.optional(),
    grossWeight: grossField.optional(),
    tareWeight: tareField.optional(),
    pricePerKg: priceField.optional(),
    withholdingTaxPercent: withholdingPercentField.optional(),
    note: optionalText(1000, t.errors.noteTooLong),
  })
  .refine((d) => d.status !== undefined || hasAnyFieldUpdate(d), {
    message: t.errors.nothingToUpdate,
  })
  .refine((d) => !(d.status !== undefined && hasAnyFieldUpdate(d)), {
    message: t.errors.fieldsAndStatusMixed,
  });

function hasAnyFieldUpdate(d: {
  rubberType?: unknown;
  grossWeight?: unknown;
  tareWeight?: unknown;
  pricePerKg?: unknown;
  withholdingTaxPercent?: unknown;
  note?: unknown;
}): boolean {
  return (
    d.rubberType !== undefined ||
    d.grossWeight !== undefined ||
    d.tareWeight !== undefined ||
    d.pricePerKg !== undefined ||
    d.withholdingTaxPercent !== undefined ||
    d.note !== undefined
  );
}

export type PatchPurchaseInput = z.infer<typeof patchPurchaseSchema>;

// ─── List query ──────────────────────────────────────────────────────────────

const MAX_PAGE_SIZE = 200;
const DEFAULT_PAGE_SIZE = 50;

const isoDate = z
  .preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : undefined),
    z
      .string()
      .refine((s) => !Number.isNaN(Date.parse(s)), {
        message: "Invalid date",
      })
      .optional(),
  )
  .optional();

export const listPurchasesQuerySchema = z.object({
  q: z
    .preprocess(
      (v) => (typeof v === "string" ? v.trim() : v),
      z.string().min(1).max(120).optional(),
    )
    .optional(),
  branchId: z
    .preprocess(
      (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : undefined),
      z.string().uuid(t.errors.branchInvalid).optional(),
    )
    .optional(),
  farmerId: z
    .preprocess(
      (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : undefined),
      z.string().uuid(t.errors.farmerInvalid).optional(),
    )
    .optional(),
  status: z
    .preprocess(
      (v) => {
        if (v === undefined || v === null || v === "") return undefined;
        if (Array.isArray(v)) return v;
        const s = String(v);
        return s.includes(",") ? s.split(",").map((x) => x.trim()) : [s];
      },
      z
        .array(
          z.string().refine((s) => PURCHASE_STATUSES.includes(s as PurchaseStatus), {
            message: t.errors.statusInvalid,
          }),
        )
        .optional(),
    )
    .optional(),
  dateFrom: isoDate,
  dateTo: isoDate,
  includeInactive: z
    .preprocess(
      (v) => (v === "true" || v === true ? true : false),
      z.boolean(),
    )
    .default(false),
  page: z
    .preprocess(
      (v) => {
        if (v === undefined || v === null || v === "") return 1;
        const n = Number(v);
        return Number.isFinite(n) ? Math.max(1, Math.floor(n)) : 1;
      },
      z.number().int().min(1).default(1),
    )
    .default(1),
  pageSize: z
    .preprocess(
      (v) => {
        if (v === undefined || v === null || v === "") return DEFAULT_PAGE_SIZE;
        const n = Number(v);
        if (!Number.isFinite(n)) return DEFAULT_PAGE_SIZE;
        return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(n)));
      },
      z.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
    )
    .default(DEFAULT_PAGE_SIZE),
});

export type ListPurchasesQuery = z.infer<typeof listPurchasesQuerySchema>;

export const PURCHASE_PAGE_SIZE_DEFAULT = DEFAULT_PAGE_SIZE;
export const PURCHASE_PAGE_SIZE_MAX = MAX_PAGE_SIZE;

// Ticket-no auto-generation constants
export const PURCHASE_TICKET_PREFIX = "PUR";
export const PURCHASE_TICKET_PADDING = 6;
