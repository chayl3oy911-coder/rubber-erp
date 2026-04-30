import type { SaleType, SalesOrderStatus } from "./types";

export type SalesFieldKey =
  | "branchId"
  | "stockLotId"
  | "buyerName"
  | "saleType"
  | "grossWeight"
  | "drcPercent"
  | "pricePerKg"
  | "withholdingTaxPercent"
  | "expectedReceiveDate"
  | "note";

export type SalesFormValues = {
  branchId?: string;
  stockLotId?: string;
  buyerName?: string;
  saleType?: SaleType;
  grossWeight?: string;
  drcPercent?: string;
  pricePerKg?: string;
  withholdingTaxPercent?: string;
  expectedReceiveDate?: string;
  note?: string;
};

export type SalesActionState = {
  fieldErrors?: Partial<Record<SalesFieldKey, string>>;
  error?: string;
  values?: SalesFormValues;
};

export const EMPTY_SALES_STATE: SalesActionState = {};

export type SalesStatusActionState = {
  error?: string;
};

export const EMPTY_SALES_STATUS_STATE: SalesStatusActionState = {};

// Re-export to keep call sites tidy.
export type { SaleType, SalesOrderStatus };
