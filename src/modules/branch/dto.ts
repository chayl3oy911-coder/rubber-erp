import type { Branch } from "@prisma/client";

export type BranchDTO = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export function toBranchDTO(branch: Branch): BranchDTO {
  return {
    id: branch.id,
    code: branch.code,
    name: branch.name,
    address: branch.address,
    phone: branch.phone,
    isActive: branch.isActive,
    createdAt: branch.createdAt.toISOString(),
    updatedAt: branch.updatedAt.toISOString(),
  };
}
