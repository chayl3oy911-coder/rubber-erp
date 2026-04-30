import "server-only";

import { Prisma } from "@prisma/client";

import type { AuthenticatedUser } from "@/shared/auth/types";
import { prisma } from "@/shared/lib/prisma";

import { toBranchDTO, type BranchDTO } from "./dto";
import type { CreateBranchInput, UpdateBranchInput } from "./schemas";

export class BranchNotFoundError extends Error {
  constructor() {
    super("ไม่พบสาขาที่ระบุ");
    this.name = "BranchNotFoundError";
  }
}

export class BranchCodeConflictError extends Error {
  constructor(code: string) {
    super(`รหัสสาขา "${code}" ถูกใช้งานแล้ว`);
    this.name = "BranchCodeConflictError";
  }
}

export type AuditMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
  source?: "api" | "action";
};

type BranchSnapshot = {
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
};

function snapshot(branch: BranchSnapshot): Prisma.InputJsonValue {
  return {
    code: branch.code,
    name: branch.name,
    address: branch.address,
    phone: branch.phone,
    isActive: branch.isActive,
  } as Prisma.InputJsonValue;
}

function buildAuditMetadata(
  meta?: AuditMeta,
  extra?: Record<string, unknown>
): Prisma.InputJsonValue {
  return {
    source: meta?.source ?? "api",
    ...(extra ?? {}),
  } as Prisma.InputJsonValue;
}

export async function listBranches(
  actor: AuthenticatedUser,
  opts?: { includeInactive?: boolean }
): Promise<BranchDTO[]> {
  const where: Prisma.BranchWhereInput = {};
  if (!opts?.includeInactive) {
    where.isActive = true;
  }
  if (!actor.isSuperAdmin) {
    where.id = { in: [...actor.branchIds] };
  }
  const branches = await prisma.branch.findMany({
    where,
    orderBy: [{ isActive: "desc" }, { code: "asc" }],
  });
  return branches.map(toBranchDTO);
}

export async function getBranch(
  actor: AuthenticatedUser,
  branchId: string
): Promise<BranchDTO | null> {
  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) return null;
  if (!actor.isSuperAdmin && !actor.branchIds.includes(branch.id)) {
    return null;
  }
  return toBranchDTO(branch);
}

export async function createBranch(
  actor: AuthenticatedUser,
  input: CreateBranchInput,
  meta?: AuditMeta
): Promise<BranchDTO> {
  try {
    const created = await prisma.$transaction(async (tx) => {
      const branch = await tx.branch.create({
        data: {
          code: input.code,
          name: input.name,
          address: input.address ?? null,
          phone: input.phone ?? null,
          isActive: true,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          branchId: branch.id,
          entityType: "Branch",
          entityId: branch.id,
          action: "create",
          before: Prisma.DbNull,
          after: snapshot(branch),
          metadata: buildAuditMetadata(meta),
          ipAddress: meta?.ipAddress ?? null,
          userAgent: meta?.userAgent ?? null,
        },
      });
      return branch;
    });
    return toBranchDTO(created);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new BranchCodeConflictError(input.code);
    }
    throw error;
  }
}

export async function updateBranch(
  actor: AuthenticatedUser,
  branchId: string,
  input: UpdateBranchInput,
  meta?: AuditMeta
): Promise<BranchDTO> {
  const existing = await prisma.branch.findUnique({
    where: { id: branchId },
  });
  if (!existing) throw new BranchNotFoundError();
  if (!actor.isSuperAdmin && !actor.branchIds.includes(existing.id)) {
    throw new BranchNotFoundError();
  }

  const data: Prisma.BranchUpdateInput = {};
  const changedFields: string[] = [];

  if (input.code !== undefined && input.code !== existing.code) {
    data.code = input.code;
    changedFields.push("code");
  }
  if (input.name !== undefined && input.name !== existing.name) {
    data.name = input.name;
    changedFields.push("name");
  }
  if (input.address !== undefined && input.address !== existing.address) {
    data.address = input.address ?? null;
    changedFields.push("address");
  }
  if (input.phone !== undefined && input.phone !== existing.phone) {
    data.phone = input.phone ?? null;
    changedFields.push("phone");
  }
  if (input.isActive !== undefined && input.isActive !== existing.isActive) {
    data.isActive = input.isActive;
    changedFields.push("isActive");
  }

  if (changedFields.length === 0) {
    return toBranchDTO(existing);
  }

  let action: "update" | "activate" | "deactivate" = "update";
  const isOnlyActivityChange =
    changedFields.length === 1 && changedFields[0] === "isActive";
  if (isOnlyActivityChange && input.isActive === true) action = "activate";
  if (isOnlyActivityChange && input.isActive === false) action = "deactivate";

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const branch = await tx.branch.update({
        where: { id: branchId },
        data,
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          branchId: branch.id,
          entityType: "Branch",
          entityId: branch.id,
          action,
          before: snapshot(existing),
          after: snapshot(branch),
          metadata: buildAuditMetadata(meta, { changedFields }),
          ipAddress: meta?.ipAddress ?? null,
          userAgent: meta?.userAgent ?? null,
        },
      });
      return branch;
    });
    return toBranchDTO(updated);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new BranchCodeConflictError(input.code ?? existing.code);
    }
    throw error;
  }
}

export async function setBranchActive(
  actor: AuthenticatedUser,
  branchId: string,
  isActive: boolean,
  meta?: AuditMeta
): Promise<BranchDTO> {
  return updateBranch(actor, branchId, { isActive }, meta);
}
