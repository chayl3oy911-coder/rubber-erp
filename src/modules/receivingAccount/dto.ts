import type {
  Branch,
  ReceivingBankAccount,
  ReceivingEntity,
} from "@prisma/client";

import type { ReceivingEntityType } from "./types";

export type ReceivingEntityBranchDTO = {
  id: string;
  code: string;
  name: string;
};

export type ReceivingBankAccountDTO = {
  id: string;
  receivingEntityId: string;
  bankName: string;
  bankAccountNo: string;
  bankAccountName: string;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ReceivingEntityDTO = {
  id: string;
  branchId: string | null;
  branch: ReceivingEntityBranchDTO | null;
  type: ReceivingEntityType;
  name: string;
  taxId: string | null;
  address: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdById: string | null;
  bankAccounts: ReceivingBankAccountDTO[];
  /**
   * Convenience accessor: the (active) primary bank account, or `null` if
   * the entity has none. UI surfaces this inline; the full list still
   * lives under `bankAccounts`.
   */
  primaryBankAccount: ReceivingBankAccountDTO | null;
  /**
   * Active bank-account count — used by UI to render the "X / 10" hint and
   * to disable the "+ add" button without re-counting on the client.
   */
  activeBankAccountCount: number;
};

type ReceivingEntityWithRelations = ReceivingEntity & {
  branch?: Pick<Branch, "id" | "code" | "name"> | null;
  bankAccounts?: ReceivingBankAccount[] | null;
};

export function toReceivingBankAccountDTO(
  account: ReceivingBankAccount,
): ReceivingBankAccountDTO {
  return {
    id: account.id,
    receivingEntityId: account.receivingEntityId,
    bankName: account.bankName,
    bankAccountNo: account.bankAccountNo,
    bankAccountName: account.bankAccountName,
    isPrimary: account.isPrimary,
    isActive: account.isActive,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}

export function toReceivingEntityDTO(
  entity: ReceivingEntityWithRelations,
): ReceivingEntityDTO {
  // Stable sort: primary first, then active before inactive, then oldest
  // first. Keeps both the list/edit pages and the sales picker
  // deterministic regardless of how Prisma decided to return rows.
  const sortedAccounts = (entity.bankAccounts ?? [])
    .slice()
    .sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return a.createdAt.getTime() - b.createdAt.getTime();
    })
    .map(toReceivingBankAccountDTO);
  const primary =
    sortedAccounts.find((a) => a.isPrimary && a.isActive) ?? null;
  const activeCount = sortedAccounts.filter((a) => a.isActive).length;

  return {
    id: entity.id,
    branchId: entity.branchId,
    branch: entity.branch
      ? {
          id: entity.branch.id,
          code: entity.branch.code,
          name: entity.branch.name,
        }
      : null,
    type: entity.type as ReceivingEntityType,
    name: entity.name,
    taxId: entity.taxId,
    address: entity.address,
    isDefault: entity.isDefault,
    isActive: entity.isActive,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
    createdById: entity.createdById,
    bankAccounts: sortedAccounts,
    primaryBankAccount: primary,
    activeBankAccountCount: activeCount,
  };
}
