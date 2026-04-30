export type BranchFieldKey = "code" | "name" | "address" | "phone";

export type BranchFormValues = {
  code?: string;
  name?: string;
  address?: string;
  phone?: string;
};

export type BranchActionState = {
  error?: string;
  fieldErrors?: Partial<Record<BranchFieldKey, string>>;
  values?: BranchFormValues;
};
