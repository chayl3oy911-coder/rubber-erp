import { z } from "zod";

import { purchaseReturnT } from "./i18n";
import {
  PURCHASE_RETURN_CANCEL_REASON_MAX,
  PURCHASE_RETURN_CANCEL_REASON_MIN,
  PURCHASE_RETURN_REASON_NOTE_MAX,
  PURCHASE_RETURN_REASON_NOTE_MIN_OTHER,
  PURCHASE_RETURN_REASONS,
  PURCHASE_RETURN_STATUSES,
} from "./types";

const t = purchaseReturnT();

// ─── Field helpers ──────────────────────────────────────────────────────────

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

const optionalText = (max: number) =>
  z.preprocess(
    (v) => {
      if (v === null || v === undefined) return undefined;
      const s = String(v).trim();
      return s === "" ? undefined : s;
    },
    z.string().max(max).optional(),
  );

// ─── Create (POST /api/purchase-returns) ───────────────────────────────────

export const createPurchaseReturnSchema = z
  .object({
    stockLotId: uuid(t.errors.notFound),
    returnReasonType: z.enum(PURCHASE_RETURN_REASONS, {
      message: t.errors.reasonRequired,
    }),
    returnReasonNote: optionalText(PURCHASE_RETURN_REASON_NOTE_MAX),
    returnWeight: numericInput
      .refine((v) => v > 0, t.errors.weightNotPositive)
      // 2dp matches StockLot.remainingWeight (Decimal(12, 2)).
      .refine((v) => decimalPlacesOf(v) <= 2, "ทศนิยมต้องไม่เกิน 2 ตำแหน่ง"),
  })
  .superRefine((data, ctx) => {
    if (data.returnReasonType === "OTHER") {
      const note = data.returnReasonNote ?? "";
      if (note.trim().length < PURCHASE_RETURN_REASON_NOTE_MIN_OTHER) {
        ctx.addIssue({
          path: ["returnReasonNote"],
          code: z.ZodIssueCode.custom,
          message: t.errors.reasonNoteRequired,
        });
      }
    }
  });

export type CreatePurchaseReturnInput = z.infer<
  typeof createPurchaseReturnSchema
>;

// ─── Confirm (POST /api/purchase-returns/[id]/confirm) ─────────────────────
//
// Body is intentionally empty — the confirm endpoint only takes the URL `id`.
// Keeping a schema anyway lets the handler validate `{}` and stays consistent
// with the rest of the API.
export const confirmPurchaseReturnSchema = z.object({}).strict();

// ─── Cancel (POST /api/purchase-returns/[id]/cancel) ───────────────────────

export const cancelPurchaseReturnSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(PURCHASE_RETURN_CANCEL_REASON_MIN, t.errors.cancelReasonTooShort)
    .max(PURCHASE_RETURN_CANCEL_REASON_MAX),
});

export type CancelPurchaseReturnInput = z.infer<
  typeof cancelPurchaseReturnSchema
>;

// ─── List (GET /api/purchase-returns) ──────────────────────────────────────

// ─── Cancel after skip (POST /api/purchase-tickets/[id]/cancel-after-skip) ─

export const cancelPurchaseAfterSkipSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(PURCHASE_RETURN_CANCEL_REASON_MIN, t.errors.cancelReasonTooShort)
    .max(PURCHASE_RETURN_CANCEL_REASON_MAX),
});

export type CancelPurchaseAfterSkipInput = z.infer<
  typeof cancelPurchaseAfterSkipSchema
>;

// ─── List (GET /api/purchase-returns) ──────────────────────────────────────

export const listPurchaseReturnsQuerySchema = z.object({
  status: z.enum(PURCHASE_RETURN_STATUSES).optional(),
  branchId: uuid("branchId").optional(),
  ticketId: uuid("ticketId").optional(),
  lotId: uuid("lotId").optional(),
  cursor: uuid("cursor").optional(),
  limit: z
    .preprocess(
      (v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : v),
      z.number().int().min(1).max(100),
    )
    .optional(),
});

export type ListPurchaseReturnsQuery = z.infer<
  typeof listPurchaseReturnsQuerySchema
>;
