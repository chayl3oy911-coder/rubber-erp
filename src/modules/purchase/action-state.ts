/**
 * Types for Purchase Server Actions.
 *
 * Kept out of `actions.ts` because Next.js requires "use server" files to
 * export only async functions.
 */

export type PurchaseFieldKey =
  | "branchId"
  | "customerId"
  | "rubberType"
  | "grossWeight"
  | "tareWeight"
  | "pricePerKg"
  | "withholdingTaxPercent"
  | "note"
  | "cancelReason";

export type PurchaseFormValues = Partial<Record<PurchaseFieldKey, string>>;

export type PurchaseActionState = {
  error?: string;
  fieldErrors?: Partial<Record<PurchaseFieldKey, string>>;
  values?: PurchaseFormValues;
};
