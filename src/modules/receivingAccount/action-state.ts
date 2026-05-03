import type { ReceivingEntityType } from "./types";

export type ReceivingEntityScalarFieldKey =
  | "branchId"
  | "type"
  | "name"
  | "taxId"
  | "address"
  | "isDefault"
  | "isActive";

export type ReceivingBankAccountFieldKey =
  | "bankName"
  | "bankAccountNo"
  | "bankAccountName"
  | "isPrimary"
  | "isActive";

/**
 * Per-row error map. `general` is for issues that don't map to a single
 * field (e.g. duplicate key in list, primary count off).
 */
export type ReceivingBankAccountErrors = {
  general?: string;
  rows?: Array<Partial<Record<ReceivingBankAccountFieldKey, string>>>;
};

export type ReceivingFormBankAccountValues = {
  /** Existing row id (only present on edit). */
  id?: string;
  bankName?: string;
  bankAccountNo?: string;
  bankAccountName?: string;
  isPrimary: boolean;
  isActive: boolean;
};

export type ReceivingEntityFormValues = {
  /** Empty string here means "company-wide" (= branchId NULL). */
  branchId?: string;
  type?: ReceivingEntityType;
  name?: string;
  taxId?: string;
  address?: string;
  isDefault?: boolean;
  isActive?: boolean;
  bankAccounts?: ReceivingFormBankAccountValues[];
};

export type ReceivingEntityActionState = {
  fieldErrors?: Partial<Record<ReceivingEntityScalarFieldKey, string>>;
  bankAccountErrors?: ReceivingBankAccountErrors;
  error?: string;
  values?: ReceivingEntityFormValues;
};

export const EMPTY_RECEIVING_ENTITY_STATE: ReceivingEntityActionState = {};
