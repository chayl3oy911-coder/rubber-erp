import type {
  Branch,
  Customer,
  CustomerBankAccount,
} from "@prisma/client";

export type CustomerBranchDTO = {
  id: string;
  code: string;
  name: string;
};

export type CustomerBankAccountDTO = {
  id: string;
  bankName: string;
  bankAccountNo: string;
  accountName: string | null;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CustomerDTO = {
  id: string;
  branchId: string;
  branch: CustomerBranchDTO | null;
  code: string;
  fullName: string;
  phone: string | null;
  nationalId: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  bankAccounts: CustomerBankAccountDTO[];
  /**
   * Convenience accessor: the primary bank account, or `null` if none. Mirrors
   * the list-page UX which surfaces this account inline. The full list is
   * always available in `bankAccounts`.
   */
  primaryBankAccount: CustomerBankAccountDTO | null;
};

type CustomerWithRelations = Customer & {
  branch?: Pick<Branch, "id" | "code" | "name"> | null;
  bankAccounts?: CustomerBankAccount[] | null;
};

export function toCustomerBankAccountDTO(
  account: CustomerBankAccount,
): CustomerBankAccountDTO {
  return {
    id: account.id,
    bankName: account.bankName,
    bankAccountNo: account.bankAccountNo,
    accountName: account.accountName,
    isPrimary: account.isPrimary,
    isActive: account.isActive,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}

export function toCustomerDTO(customer: CustomerWithRelations): CustomerDTO {
  // Stable sort: primary first, then most-recently-created. Keeps list/edit
  // pages deterministic regardless of how Prisma decided to return rows.
  const sortedAccounts = (customer.bankAccounts ?? [])
    .slice()
    .sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      return a.createdAt.getTime() - b.createdAt.getTime();
    })
    .map(toCustomerBankAccountDTO);
  const primary = sortedAccounts.find((a) => a.isPrimary) ?? null;

  return {
    id: customer.id,
    branchId: customer.branchId,
    branch: customer.branch
      ? {
          id: customer.branch.id,
          code: customer.branch.code,
          name: customer.branch.name,
        }
      : null,
    code: customer.code,
    fullName: customer.fullName,
    phone: customer.phone,
    nationalId: customer.nationalId,
    notes: customer.notes,
    isActive: customer.isActive,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
    bankAccounts: sortedAccounts,
    primaryBankAccount: primary,
  };
}
