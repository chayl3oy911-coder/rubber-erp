/**
 * Types for Customer Server Actions.
 *
 * Kept out of `actions.ts` because Next.js requires "use server" files to
 * export only async functions. Importing types from this sibling file is
 * fine — the runtime constraint applies only to "use server" exports.
 */

export type CustomerScalarFieldKey =
  | "branchId"
  | "code"
  | "fullName"
  | "phone"
  | "nationalId"
  | "notes";

/**
 * Bank-account form errors are addressed by index because the client form
 * lays them out as a repeating row group. The action serializes them back
 * onto the matching row. Keys look like `bankAccounts[0].bankName`.
 */
export type CustomerBankAccountFieldKey =
  | "bankName"
  | "bankAccountNo"
  | "accountName"
  | "isPrimary";

export type CustomerFieldKey = CustomerScalarFieldKey | "bankAccounts";

export type CustomerFormBankAccountValues = {
  bankName?: string;
  bankAccountNo?: string;
  accountName?: string;
  isPrimary?: boolean;
};

export type CustomerFormValues = {
  branchId?: string;
  code?: string;
  fullName?: string;
  phone?: string;
  nationalId?: string;
  notes?: string;
  bankAccounts?: CustomerFormBankAccountValues[];
};

/**
 * Per-row bank-account error map. Indexed by row position in the submitted
 * `bankAccounts` array. The "general" key carries list-level issues such as
 * "too many accounts" or "no primary".
 */
export type CustomerBankAccountErrors = {
  general?: string;
  rows?: Array<Partial<Record<CustomerBankAccountFieldKey, string>>>;
};

export type CustomerActionState = {
  error?: string;
  fieldErrors?: Partial<Record<CustomerScalarFieldKey, string>>;
  bankAccountErrors?: CustomerBankAccountErrors;
  values?: CustomerFormValues;
};
