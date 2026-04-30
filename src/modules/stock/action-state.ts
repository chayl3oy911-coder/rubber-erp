/**
 * Stock module — Server Action state types.
 *
 * Lives in its own file (not `actions.ts`) because Next.js `"use server"`
 * files may only export async functions — types/objects must live elsewhere.
 */

import type {
  StockAdjustmentDirection,
  StockAdjustmentReason,
} from "./types";

export type AdjustStockFieldKey =
  | "stockLotId"
  | "adjustmentType"
  | "quantity"
  | "reasonType"
  | "note";

export type AdjustStockFormValues = {
  stockLotId?: string;
  adjustmentType?: StockAdjustmentDirection;
  quantity?: string;
  reasonType?: StockAdjustmentReason;
  note?: string;
};

export type AdjustStockActionState = {
  fieldErrors?: Partial<Record<AdjustStockFieldKey, string>>;
  error?: string;
  values?: AdjustStockFormValues;
};

export type CreateLotActionState = {
  error?: string;
};
