/**
 * Types & constants for Farmer Server Actions.
 *
 * Kept out of `actions.ts` because Next.js requires "use server" files to
 * export only async functions. Importing types/constants from this sibling
 * file is fine because the constraint applies only to runtime exports of
 * "use server" modules.
 */

export type FarmerFieldKey =
  | "branchId"
  | "code"
  | "fullName"
  | "phone"
  | "nationalId"
  | "bankName"
  | "bankAccountNo"
  | "notes";

export type FarmerFormValues = Partial<Record<FarmerFieldKey, string>>;

export type FarmerActionState = {
  error?: string;
  fieldErrors?: Partial<Record<FarmerFieldKey, string>>;
  values?: FarmerFormValues;
};
