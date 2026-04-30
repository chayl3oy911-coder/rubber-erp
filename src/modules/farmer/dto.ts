import type { Branch, Farmer } from "@prisma/client";

export type FarmerBranchDTO = {
  id: string;
  code: string;
  name: string;
};

export type FarmerDTO = {
  id: string;
  branchId: string;
  branch: FarmerBranchDTO | null;
  code: string;
  fullName: string;
  phone: string | null;
  nationalId: string | null;
  bankName: string | null;
  bankAccountNo: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type FarmerWithBranch = Farmer & {
  branch?: Pick<Branch, "id" | "code" | "name"> | null;
};

export function toFarmerDTO(farmer: FarmerWithBranch): FarmerDTO {
  return {
    id: farmer.id,
    branchId: farmer.branchId,
    branch: farmer.branch
      ? {
          id: farmer.branch.id,
          code: farmer.branch.code,
          name: farmer.branch.name,
        }
      : null,
    code: farmer.code,
    fullName: farmer.fullName,
    phone: farmer.phone,
    nationalId: farmer.nationalId,
    bankName: farmer.bankName,
    bankAccountNo: farmer.bankAccountNo,
    notes: farmer.notes,
    isActive: farmer.isActive,
    createdAt: farmer.createdAt.toISOString(),
    updatedAt: farmer.updatedAt.toISOString(),
  };
}
