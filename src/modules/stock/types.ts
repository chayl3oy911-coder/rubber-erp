/**
 * Stock module — domain types and label helpers.
 *
 * Strings are stored as `String` columns in Postgres (matching the
 * `PurchaseTicket.status` convention) — the readonly tuples below are the
 * single source of truth for what's allowed. When a value-set finally
 * stabilises we may promote individual fields to a Postgres enum.
 *
 * Movement types and reason types are deliberately complete here even though
 * Step 8 only *implements* PURCHASE_IN / ADJUST_IN / ADJUST_OUT — the rest
 * (SALES_OUT / PRODUCTION_*, etc.) are reserved so future modules can write
 * movements without touching this file or the schema.
 */

import type { StockLocale } from "./i18n";
import { stockT } from "./i18n";

// ─── StockLot.status ─────────────────────────────────────────────────────────

export const STOCK_LOT_STATUSES = ["ACTIVE", "DEPLETED", "CANCELLED"] as const;
export type StockLotStatus = (typeof STOCK_LOT_STATUSES)[number];

const STOCK_LOT_STATUS_SET: ReadonlySet<string> = new Set(STOCK_LOT_STATUSES);

export function isStockLotStatus(value: string): value is StockLotStatus {
  return STOCK_LOT_STATUS_SET.has(value);
}

export function stockLotStatusLabel(
  status: string,
  locale: StockLocale = "th",
): string {
  const t = stockT(locale);
  if (!isStockLotStatus(status)) return status;
  return t.status[status];
}

// ─── StockMovement.movementType ──────────────────────────────────────────────

export const STOCK_MOVEMENT_TYPES = [
  "PURCHASE_IN",
  "ADJUST_IN",
  "ADJUST_OUT",
  "SALES_OUT",
  "PRODUCTION_OUT",
  "PRODUCTION_IN",
  "CANCEL_REVERSE",
] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

const STOCK_MOVEMENT_TYPE_SET: ReadonlySet<string> = new Set(
  STOCK_MOVEMENT_TYPES,
);

export function isStockMovementType(value: string): value is StockMovementType {
  return STOCK_MOVEMENT_TYPE_SET.has(value);
}

/** Step 8 — only these three are issued by the service layer. */
export const STOCK_MOVEMENT_TYPES_STEP8: ReadonlyArray<StockMovementType> = [
  "PURCHASE_IN",
  "ADJUST_IN",
  "ADJUST_OUT",
];

export function stockMovementTypeLabel(
  type: string,
  locale: StockLocale = "th",
): string {
  const t = stockT(locale);
  if (!isStockMovementType(type)) return type;
  return t.movementType[type];
}

/** Direction relative to the lot's `remainingWeight`. */
export function movementDirection(type: StockMovementType): "in" | "out" {
  switch (type) {
    case "PURCHASE_IN":
    case "ADJUST_IN":
    case "PRODUCTION_IN":
    case "CANCEL_REVERSE":
      return "in";
    case "ADJUST_OUT":
    case "SALES_OUT":
    case "PRODUCTION_OUT":
      return "out";
  }
}

// ─── StockMovement.reasonType (adjustment reasons) ──────────────────────────

export const STOCK_ADJUSTMENT_REASONS = [
  "WATER_LOSS",
  "DAMAGE",
  "SCALE_ERROR",
  "MANUAL_CORRECTION",
  "OTHER",
] as const;
export type StockAdjustmentReason = (typeof STOCK_ADJUSTMENT_REASONS)[number];

const STOCK_ADJUSTMENT_REASON_SET: ReadonlySet<string> = new Set(
  STOCK_ADJUSTMENT_REASONS,
);

export function isStockAdjustmentReason(
  value: string,
): value is StockAdjustmentReason {
  return STOCK_ADJUSTMENT_REASON_SET.has(value);
}

export function stockReasonLabel(
  reason: string | null | undefined,
  locale: StockLocale = "th",
): string | null {
  if (!reason) return null;
  const t = stockT(locale);
  if (!isStockAdjustmentReason(reason)) return reason;
  return t.reason[reason];
}

// ─── Adjustment direction (UI) ──────────────────────────────────────────────

export const STOCK_ADJUSTMENT_DIRECTIONS = ["ADJUST_IN", "ADJUST_OUT"] as const;
export type StockAdjustmentDirection =
  (typeof STOCK_ADJUSTMENT_DIRECTIONS)[number];

export function isStockAdjustmentDirection(
  value: string,
): value is StockAdjustmentDirection {
  return value === "ADJUST_IN" || value === "ADJUST_OUT";
}
