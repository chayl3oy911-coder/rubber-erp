import { z } from "zod";

import { salesT } from "./i18n";
import {
  SALE_TYPES,
  SALES_ORDER_STATUSES,
  type SaleType,
  type SalesOrderStatus,
} from "./types";

const t = salesT();

// ─── Reusable field builders ─────────────────────────────────────────────────

const uuid = (msg: string) => z.string().trim().uuid(msg);

const optionalText = (max: number, message: string) =>
  z.preprocess(
    (v) => {
      if (v === null || v === undefined) return undefined;
      const s = String(v).trim();
      return s === "" ? undefined : s;
    },
    z.string().max(max, message).optional(),
  );

const requiredText = (max: number, requiredMsg: string, tooLongMsg: string) =>
  z.preprocess(
    (v) => {
      if (v === null || v === undefined) return undefined;
      const s = String(v).trim();
      return s === "" ? undefined : s;
    },
    z.string().min(1, requiredMsg).max(max, tooLongMsg),
  );

/**
 * Coerce form/JSON inputs into a finite number. Strings become numbers,
 * NaN/Infinity is rejected. Arithmetic happens in the service layer using
 * `Prisma.Decimal` — we never round through JS floats.
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

function decimalPlacesOf(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const s = String(value);
  if (s.includes("e") || s.includes("E")) return 0;
  const dot = s.indexOf(".");
  return dot === -1 ? 0 : s.length - dot - 1;
}

// ─── Field schemas ──────────────────────────────────────────────────────────

const grossField = numericInput
  .refine((n) => n > 0, t.errors.grossPositive)
  .refine((n) => decimalPlacesOf(n) <= 2, t.errors.weightTooManyDecimals);

const drcField = numericInput
  .refine((n) => n > 0 && n <= 100, t.errors.drcRange)
  .refine((n) => decimalPlacesOf(n) <= 2, t.errors.drcTooManyDecimals);

const priceField = numericInput
  .refine((n) => n > 0, t.errors.pricePositive)
  .refine((n) => decimalPlacesOf(n) <= 4, t.errors.priceTooManyDecimals);

const percentField = numericInput
  .refine((n) => n >= 0 && n <= 100, t.errors.percentRange)
  .refine((n) => decimalPlacesOf(n) <= 2, t.errors.percentTooManyDecimals);

// `z.enum` (vs `z.string().refine(...)`) is essential: refine is only a
// runtime predicate and does NOT narrow inferred TS type. Same trick used
// in `purchase/schemas.ts → purchaseStatusEnum` and `stock/schemas.ts`.
const saleTypeField = z.enum(
  SALE_TYPES as unknown as [SaleType, ...SaleType[]],
  { error: t.errors.saleTypeInvalid },
);

const statusField = z.enum(
  SALES_ORDER_STATUSES as unknown as [
    SalesOrderStatus,
    ...SalesOrderStatus[],
  ],
  { error: t.errors.statusInvalid },
);

// `expectedReceiveDate` accepts ISO strings (YYYY-MM-DD or full ISO) and
// coerces to a `Date`. Empty / blank → undefined so optional() applies.
const optionalDate = z
  .preprocess(
    (v) => {
      if (v === null || v === undefined) return undefined;
      if (v instanceof Date) return v;
      if (typeof v === "string") {
        const trimmed = v.trim();
        if (trimmed === "") return undefined;
        const parsed = new Date(trimmed);
        return Number.isNaN(parsed.getTime()) ? trimmed : parsed;
      }
      return v;
    },
    z.date({ error: t.errors.expectedDateInvalid }).optional(),
  )
  .optional();

// ─── Create ──────────────────────────────────────────────────────────────────

export const createSalesSchema = z.object({
  branchId: uuid(t.errors.branchInvalid),
  stockLotId: uuid(t.errors.stockLotIdInvalid),
  buyerName: requiredText(200, t.errors.buyerNameRequired, t.errors.buyerNameTooLong),
  saleType: saleTypeField,
  grossWeight: grossField,
  drcPercent: drcField,
  pricePerKg: priceField,
  withholdingTaxPercent: percentField.optional().default(0),
  expectedReceiveDate: optionalDate,
  note: optionalText(1000, t.errors.noteTooLong),
});

export type CreateSalesInput = z.infer<typeof createSalesSchema>;

// ─── Update fields (DRAFT only) ──────────────────────────────────────────────
//
// All fields optional. The service further enforces "what fields are editable
// in the current status".

export const updateSalesFieldsSchema = z
  .object({
    buyerName: requiredText(
      200,
      t.errors.buyerNameRequired,
      t.errors.buyerNameTooLong,
    ).optional(),
    saleType: saleTypeField.optional(),
    grossWeight: grossField.optional(),
    drcPercent: drcField.optional(),
    pricePerKg: priceField.optional(),
    withholdingTaxPercent: percentField.optional(),
    expectedReceiveDate: optionalDate,
    note: optionalText(1000, t.errors.noteTooLong),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: t.errors.nothingToUpdate,
  });

export type UpdateSalesFieldsInput = z.infer<typeof updateSalesFieldsSchema>;

// ─── Status transition ───────────────────────────────────────────────────────

export const transitionStatusSchema = z.object({
  status: statusField,
  cancelReason: optionalText(500, t.errors.cancelReasonTooLong),
});

export type TransitionSalesStatusInput = z.infer<typeof transitionStatusSchema>;

// ─── PATCH body discriminator ────────────────────────────────────────────────
//
// API enforces "either fields OR status, not both" so dispatch is unambiguous.

export const patchSalesSchema = z
  .object({
    status: statusField.optional(),
    cancelReason: optionalText(500, t.errors.cancelReasonTooLong),
    buyerName: requiredText(
      200,
      t.errors.buyerNameRequired,
      t.errors.buyerNameTooLong,
    ).optional(),
    saleType: saleTypeField.optional(),
    grossWeight: grossField.optional(),
    drcPercent: drcField.optional(),
    pricePerKg: priceField.optional(),
    withholdingTaxPercent: percentField.optional(),
    expectedReceiveDate: optionalDate,
    note: optionalText(1000, t.errors.noteTooLong),
  })
  .refine((d) => d.status !== undefined || hasAnyFieldUpdate(d), {
    message: t.errors.nothingToUpdate,
  })
  .refine((d) => !(d.status !== undefined && hasAnyFieldUpdate(d)), {
    message: t.errors.fieldsAndStatusMixed,
  });

function hasAnyFieldUpdate(d: {
  buyerName?: unknown;
  saleType?: unknown;
  grossWeight?: unknown;
  drcPercent?: unknown;
  pricePerKg?: unknown;
  withholdingTaxPercent?: unknown;
  expectedReceiveDate?: unknown;
  note?: unknown;
}): boolean {
  return (
    d.buyerName !== undefined ||
    d.saleType !== undefined ||
    d.grossWeight !== undefined ||
    d.drcPercent !== undefined ||
    d.pricePerKg !== undefined ||
    d.withholdingTaxPercent !== undefined ||
    d.expectedReceiveDate !== undefined ||
    d.note !== undefined
  );
}

export type PatchSalesInput = z.infer<typeof patchSalesSchema>;

// ─── List query ──────────────────────────────────────────────────────────────

const MAX_PAGE_SIZE = 200;
const DEFAULT_PAGE_SIZE = 50;

const isoDate = z
  .preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : undefined),
    z
      .string()
      .refine((s) => !Number.isNaN(Date.parse(s)), {
        message: t.errors.expectedDateInvalid,
      })
      .optional(),
  )
  .optional();

const optionalUuid = z
  .preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : undefined),
    z.string().uuid(t.errors.branchInvalid).optional(),
  )
  .optional();

const csvEnum = (values: ReadonlyArray<string>, invalidMsg: string) =>
  z
    .preprocess(
      (v) => {
        if (v === undefined || v === null || v === "") return undefined;
        if (Array.isArray(v)) return v;
        const s = String(v);
        return s.includes(",") ? s.split(",").map((x) => x.trim()) : [s];
      },
      z
        .array(
          z.string().refine((s) => values.includes(s), { message: invalidMsg }),
        )
        .optional(),
    )
    .optional();

const pageField = z
  .preprocess(
    (v) => {
      if (v === undefined || v === null || v === "") return 1;
      const n = Number(v);
      return Number.isFinite(n) ? Math.max(1, Math.floor(n)) : 1;
    },
    z.number().int().min(1).default(1),
  )
  .default(1);

const pageSizeField = z
  .preprocess(
    (v) => {
      if (v === undefined || v === null || v === "") return DEFAULT_PAGE_SIZE;
      const n = Number(v);
      if (!Number.isFinite(n)) return DEFAULT_PAGE_SIZE;
      return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(n)));
    },
    z.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  )
  .default(DEFAULT_PAGE_SIZE);

const includeInactiveField = z
  .preprocess(
    (v) => (v === "true" || v === true ? true : false),
    z.boolean(),
  )
  .default(false);

export const listSalesQuerySchema = z.object({
  q: z
    .preprocess(
      (v) => (typeof v === "string" ? v.trim() : v),
      z.string().min(1).max(120).optional(),
    )
    .optional(),
  branchId: optionalUuid,
  stockLotId: optionalUuid,
  status: csvEnum(SALES_ORDER_STATUSES, t.errors.statusInvalid),
  saleType: csvEnum(SALE_TYPES, t.errors.saleTypeInvalid),
  dateFrom: isoDate,
  dateTo: isoDate,
  includeInactive: includeInactiveField,
  page: pageField,
  pageSize: pageSizeField,
});

export type ListSalesQuery = z.infer<typeof listSalesQuerySchema>;

// ─── Movements list query ────────────────────────────────────────────────────

export const listSalesMovementsQuerySchema = z.object({
  page: pageField,
  pageSize: pageSizeField,
});

export type ListSalesMovementsQuery = z.infer<typeof listSalesMovementsQuerySchema>;

// ─── Eligible lots query (for /sales/new lot picker) ─────────────────────────

export const listEligibleLotsForSaleQuerySchema = z.object({
  q: z
    .preprocess(
      (v) => (typeof v === "string" ? v.trim() : v),
      z.string().min(1).max(120).optional(),
    )
    .optional(),
  branchId: optionalUuid,
  // Capped tightly — this powers a simple <select>; it's not a paginated UI.
  // Future: convert to a debounced picker if `> limit` lots are common.
  limit: z
    .preprocess(
      (v) => {
        if (v === undefined || v === null || v === "") return 100;
        const n = Number(v);
        if (!Number.isFinite(n)) return 100;
        return Math.min(200, Math.max(1, Math.floor(n)));
      },
      z.number().int().min(1).max(200).default(100),
    )
    .default(100),
});

export type ListEligibleLotsForSaleQuery = z.infer<
  typeof listEligibleLotsForSaleQuerySchema
>;

export const SALES_PAGE_SIZE_DEFAULT = DEFAULT_PAGE_SIZE;
export const SALES_PAGE_SIZE_MAX = MAX_PAGE_SIZE;

// SalesNo auto-generation constants
export const SALES_NO_PREFIX = "SAL";
export const SALES_NO_PADDING = 6;
