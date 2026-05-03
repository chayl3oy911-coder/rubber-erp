import type { SaleType, SalesOrderStatus } from "./types";

export type SalesFieldKey =
  | "branchId"
  | "buyerName"
  | "saleType"
  | "drcPercent"
  | "pricePerKg"
  | "withholdingTaxPercent"
  | "expectedReceiveDate"
  | "note"
  | "lines"
  | "receivingEntityId"
  | "receivingBankAccountId";

/**
 * Single line in form state — UI uses this for both the create form and
 * the line-replace edit form. `grossWeight` is a string because the user
 * types it; the action will Zod-coerce.
 *
 * `lotNo` / `rubberType` / `effectiveCostPerKg` / `remainingWeight` are
 * snapshot copies from the StockLot row at the moment the user added it
 * to the bill — kept around so we can render the line table without an
 * extra fetch when a validation error bounces back from the server.
 */
export type SalesLineFormValue = {
  stockLotId: string;
  lotNo: string;
  rubberType: string;
  effectiveCostPerKg: string;
  remainingWeight: string;
  grossWeight: string;
};

export type SalesFormValues = {
  branchId?: string;
  buyerName?: string;
  saleType?: SaleType;
  drcPercent?: string;
  pricePerKg?: string;
  withholdingTaxPercent?: string;
  expectedReceiveDate?: string;
  note?: string;
  lines?: SalesLineFormValue[];
  receivingEntityId?: string;
  receivingBankAccountId?: string;
};

export type SalesActionState = {
  fieldErrors?: Partial<Record<SalesFieldKey, string>>;
  /** Per-line errors keyed by line index (matches order in `values.lines`). */
  lineErrors?: Record<number, string>;
  error?: string;
  values?: SalesFormValues;
};

export const EMPTY_SALES_STATE: SalesActionState = {};

export type SalesStatusActionState = {
  error?: string;
};

export const EMPTY_SALES_STATUS_STATE: SalesStatusActionState = {};

export type { SaleType, SalesOrderStatus };
