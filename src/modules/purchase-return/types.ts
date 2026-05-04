/**
 * Purchase Return — domain types and label helpers.
 *
 * Strings are stored as `String` columns (matching the convention for
 * `PurchaseTicket.status` / `StockLot.status`); the readonly tuples below
 * are the single source of truth for what's allowed.
 */

import type { PurchaseReturnLocale } from "./i18n";
import { purchaseReturnT } from "./i18n";

// ─── PurchaseReturn.status ───────────────────────────────────────────────────

export const PURCHASE_RETURN_STATUSES = [
  "DRAFT",
  "CONFIRMED",
  "CANCELLED",
] as const;
export type PurchaseReturnStatus = (typeof PURCHASE_RETURN_STATUSES)[number];

const PURCHASE_RETURN_STATUS_SET: ReadonlySet<string> = new Set(
  PURCHASE_RETURN_STATUSES,
);

export function isPurchaseReturnStatus(
  value: string,
): value is PurchaseReturnStatus {
  return PURCHASE_RETURN_STATUS_SET.has(value);
}

export function purchaseReturnStatusLabel(
  status: string,
  locale: PurchaseReturnLocale = "th",
): string {
  const t = purchaseReturnT(locale);
  if (!isPurchaseReturnStatus(status)) return status;
  return t.status[status];
}

// ─── PurchaseReturn.returnReasonType ────────────────────────────────────────

export const PURCHASE_RETURN_REASONS = [
  "PRODUCT_ISSUE",
  "QC_ERROR",
  "WRONG_ENTRY",
  "SUPPLIER_RETURN",
  "OTHER",
] as const;
export type PurchaseReturnReason = (typeof PURCHASE_RETURN_REASONS)[number];

const PURCHASE_RETURN_REASON_SET: ReadonlySet<string> = new Set(
  PURCHASE_RETURN_REASONS,
);

export function isPurchaseReturnReason(
  value: string,
): value is PurchaseReturnReason {
  return PURCHASE_RETURN_REASON_SET.has(value);
}

export function purchaseReturnReasonLabel(
  reason: string,
  locale: PurchaseReturnLocale = "th",
): string {
  const t = purchaseReturnT(locale);
  if (!isPurchaseReturnReason(reason)) return reason;
  return t.reason[reason];
}

// ─── PurchaseReturn.refundStatus (forward-compat — no logic this step) ──────

export const PURCHASE_RETURN_REFUND_STATUSES = [
  "PENDING",
  "NOT_REQUIRED",
  "REFUNDED",
  "CREDITED",
] as const;
export type PurchaseReturnRefundStatus =
  (typeof PURCHASE_RETURN_REFUND_STATUSES)[number];

const PURCHASE_RETURN_REFUND_STATUS_SET: ReadonlySet<string> = new Set(
  PURCHASE_RETURN_REFUND_STATUSES,
);

export function isPurchaseReturnRefundStatus(
  value: string,
): value is PurchaseReturnRefundStatus {
  return PURCHASE_RETURN_REFUND_STATUS_SET.has(value);
}

// ─── Validation constants ───────────────────────────────────────────────────

/** Reason note minimum length when reasonType === "OTHER". */
export const PURCHASE_RETURN_REASON_NOTE_MIN_OTHER = 5;
export const PURCHASE_RETURN_REASON_NOTE_MAX = 500;

/** Cancel reason min/max — same scale as skip reason for consistency. */
export const PURCHASE_RETURN_CANCEL_REASON_MIN = 5;
export const PURCHASE_RETURN_CANCEL_REASON_MAX = 500;

/** Auto-generated returnNo prefix. */
export const PURCHASE_RETURN_PREFIX = "PRT";
export const PURCHASE_RETURN_PADDING = 6;
