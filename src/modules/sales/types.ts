/**
 * Sales module — domain types and label helpers.
 *
 * String-coded in Postgres (matching PurchaseTicket/StockLot convention).
 * The readonly tuples below are the single source of truth — Zod schemas
 * derive their enum types from these so the inferred TS type narrows to
 * the literal union without any `as` casts in the service layer.
 */

import type { SalesLocale } from "./i18n";
import { salesT } from "./i18n";

// ─── SalesOrder.status ───────────────────────────────────────────────────────

export const SALES_ORDER_STATUSES = [
  "DRAFT",
  "CONFIRMED",
  "CANCELLED",
] as const;
export type SalesOrderStatus = (typeof SALES_ORDER_STATUSES)[number];

const SALES_ORDER_STATUS_SET: ReadonlySet<string> = new Set(
  SALES_ORDER_STATUSES,
);

export function isSalesOrderStatus(value: string): value is SalesOrderStatus {
  return SALES_ORDER_STATUS_SET.has(value);
}

export function salesOrderStatusLabel(
  status: string,
  locale: SalesLocale = "th",
): string {
  const t = salesT(locale);
  if (!isSalesOrderStatus(status)) return status;
  return t.status[status];
}

// ─── SalesOrder.saleType ─────────────────────────────────────────────────────

export const SALE_TYPES = ["SALE", "CONSIGNMENT"] as const;
export type SaleType = (typeof SALE_TYPES)[number];

const SALE_TYPE_SET: ReadonlySet<string> = new Set(SALE_TYPES);

export function isSaleType(value: string): value is SaleType {
  return SALE_TYPE_SET.has(value);
}

export function saleTypeLabel(
  saleType: string,
  locale: SalesLocale = "th",
): string {
  const t = salesT(locale);
  if (!isSaleType(saleType)) return saleType;
  return t.saleType[saleType];
}

// ─── Status transition planning ─────────────────────────────────────────────
//
// Single source of truth for "what transitions are allowed" — used by both
// schema validation (just shape) and the service (real logic). Mirrors the
// pattern used by `purchase/status.ts`.

export type SalesTransitionAction = "confirm" | "cancel";

type SalesTransitionPlan = {
  action: SalesTransitionAction;
};

export function planSalesTransition(
  from: SalesOrderStatus,
  to: SalesOrderStatus,
): SalesTransitionPlan | null {
  if (from === to) return null;
  if (from === "DRAFT" && to === "CONFIRMED") return { action: "confirm" };
  if (from === "DRAFT" && to === "CANCELLED") return { action: "cancel" };
  if (from === "CONFIRMED" && to === "CANCELLED") return { action: "cancel" };
  return null;
}
