import { z } from "zod";

import { RUBBER_TYPE_CODES } from "@/modules/purchase/rubber-types";

import { stockT } from "./i18n";
import {
  STOCK_ADJUSTMENT_DIRECTIONS,
  STOCK_ADJUSTMENT_REASONS,
  STOCK_INTAKE_BULK_MAX,
  STOCK_INTAKE_SKIP_REASON_MAX,
  STOCK_INTAKE_SKIP_REASON_MIN,
  STOCK_INTAKE_VIEWS,
  STOCK_LOT_STATUSES,
  type StockAdjustmentDirection,
  type StockAdjustmentReason,
  type StockIntakeView,
  type StockLotStatus,
} from "./types";

const t = stockT();

// ─── Reusable field builders ─────────────────────────────────────────────────

const uuid = (msg: string) => z.string().trim().uuid(msg);

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

const requiredText = (max: number, requiredMsg: string, tooLongMsg: string) =>
  z.preprocess(
    (v) => {
      if (v === null || v === undefined) return undefined;
      const s = String(v).trim();
      return s === "" ? undefined : s;
    },
    z
      .string()
      .min(1, requiredMsg)
      .max(max, tooLongMsg),
  );

// ─── Adjustment ──────────────────────────────────────────────────────────────

const quantityField = numericInput
  .refine((n) => n > 0, t.errors.quantityPositive)
  .refine((n) => decimalPlacesOf(n) <= 2, t.errors.quantityTooManyDecimals);

// `z.enum` (vs `z.string().refine(...)`) is essential here: refine is a
// runtime predicate only and does NOT narrow the inferred TS type — Zod
// would still infer `string`. By feeding the readonly tuple from
// `./types`, Zod narrows the output to the literal union, so
// `AdjustStockInput["reasonType"]` becomes `StockAdjustmentReason` and
// `AdjustStockInput["adjustmentType"]` becomes `StockAdjustmentDirection`
// without any `as` casts in the service layer.
//
// The `as unknown as [T, ...T[]]` shape matches Zod 4's tuple-required
// signature (same trick used in `purchase/schemas.ts → purchaseStatusEnum`).
const reasonField = z.enum(
  STOCK_ADJUSTMENT_REASONS as unknown as [
    StockAdjustmentReason,
    ...StockAdjustmentReason[],
  ],
  { error: t.errors.reasonInvalid },
);

const directionField = z.enum(
  STOCK_ADJUSTMENT_DIRECTIONS as unknown as [
    StockAdjustmentDirection,
    ...StockAdjustmentDirection[],
  ],
  { error: t.errors.adjustmentDirectionInvalid },
);

export const adjustStockSchema = z.object({
  stockLotId: uuid(t.errors.stockLotIdInvalid),
  adjustmentType: directionField,
  quantity: quantityField,
  reasonType: reasonField,
  note: requiredText(1000, t.errors.noteRequired, t.errors.noteTooLong),
});

export type AdjustStockInput = z.infer<typeof adjustStockSchema>;

// ─── Create from purchase ────────────────────────────────────────────────────

export const createLotFromPurchaseSchema = z.object({
  purchaseTicketId: uuid(t.errors.purchaseTicketIdInvalid),
});

export type CreateLotFromPurchaseInput = z.infer<
  typeof createLotFromPurchaseSchema
>;

// ─── List query — Stock Lots ─────────────────────────────────────────────────

const MAX_PAGE_SIZE = 200;
const DEFAULT_PAGE_SIZE = 50;

const optionalUuid = z
  .preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : undefined),
    z.string().uuid(t.errors.branchInvalid).optional(),
  )
  .optional();

const optionalSearch = z
  .preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().min(1).max(120).optional(),
  )
  .optional();

const csvEnum = (
  values: ReadonlyArray<string>,
  invalidMsg: string,
) =>
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
          z
            .string()
            .refine((s) => values.includes(s), { message: invalidMsg }),
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

export const listStockLotsQuerySchema = z.object({
  q: optionalSearch,
  branchId: optionalUuid,
  rubberType: z
    .preprocess(
      (v) =>
        typeof v === "string" && v.trim() !== "" ? v.trim() : undefined,
      z
        .string()
        .refine((s) => RUBBER_TYPE_CODES.has(s), {
          message: t.errors.rubberTypeInvalid,
        })
        .optional(),
    )
    .optional(),
  status: csvEnum(STOCK_LOT_STATUSES, t.errors.statusInvalid),
  includeInactive: includeInactiveField,
  page: pageField,
  pageSize: pageSizeField,
});

export type ListStockLotsQuery = z.infer<typeof listStockLotsQuerySchema>;

// ─── Movements list query ────────────────────────────────────────────────────

export const listMovementsQuerySchema = z.object({
  page: pageField,
  pageSize: pageSizeField,
});

export type ListMovementsQuery = z.infer<typeof listMovementsQuerySchema>;

// ─── Eligible-purchases list query ───────────────────────────────────────────

// `view` selects between PENDING (default) and SKIPPED rows. We intentionally
// keep this a stringly-typed enum on the wire (?view=pending|skipped) so the
// URL stays readable; the schema narrows to the literal union.
const viewField = z
  .preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : undefined),
    z
      .enum(
        STOCK_INTAKE_VIEWS as unknown as [StockIntakeView, ...StockIntakeView[]],
        { error: t.errors.intakeViewInvalid },
      )
      .optional(),
  )
  .optional();

export const listEligiblePurchasesQuerySchema = z.object({
  q: optionalSearch,
  branchId: optionalUuid,
  view: viewField,
  page: pageField,
  pageSize: pageSizeField,
});

export type ListEligiblePurchasesQuery = z.infer<
  typeof listEligiblePurchasesQuerySchema
>;

// ─── Bulk create from purchase ───────────────────────────────────────────────

// Single create reuses this same schema with `[id]`, so the bulk endpoint is
// authoritative. We dedupe on the server too (defence-in-depth) but the
// schema-level dedupe via `Set` keeps the wire payload small.
export const bulkCreateLotsFromPurchaseSchema = z.object({
  ticketIds: z
    .array(uuid(t.errors.purchaseTicketIdInvalid))
    .min(1, t.errors.bulkTicketIdsEmpty)
    .max(STOCK_INTAKE_BULK_MAX, t.errors.bulkTicketIdsTooMany),
});

export type BulkCreateLotsFromPurchaseInput = z.infer<
  typeof bulkCreateLotsFromPurchaseSchema
>;

// ─── Skip / undo-skip ────────────────────────────────────────────────────────

const skipReasonField = z.preprocess(
  (v) => {
    if (v === null || v === undefined) return undefined;
    const s = String(v).trim();
    return s === "" ? undefined : s;
  },
  z
    .string()
    .min(STOCK_INTAKE_SKIP_REASON_MIN, t.errors.skipReasonTooShort)
    .max(STOCK_INTAKE_SKIP_REASON_MAX, t.errors.skipReasonTooLong),
);

export const skipStockIntakeSchema = z.object({
  purchaseTicketId: uuid(t.errors.purchaseTicketIdInvalid),
  reason: skipReasonField,
});

export type SkipStockIntakeInput = z.infer<typeof skipStockIntakeSchema>;

export const undoSkipStockIntakeSchema = z.object({
  purchaseTicketId: uuid(t.errors.purchaseTicketIdInvalid),
});

export type UndoSkipStockIntakeInput = z.infer<
  typeof undoSkipStockIntakeSchema
>;

// Re-exported helpers so the rest of the module shares the same status/type
// universes without re-importing from `./types`.
export const STOCK_LOT_STATUS_VALUES: ReadonlyArray<StockLotStatus> =
  STOCK_LOT_STATUSES;

export const STOCK_PAGE_SIZE_DEFAULT = DEFAULT_PAGE_SIZE;
export const STOCK_PAGE_SIZE_MAX = MAX_PAGE_SIZE;

// Lot-no auto-generation constants
export const STOCK_LOT_PREFIX = "LOT";
export const STOCK_LOT_PADDING = 6;
