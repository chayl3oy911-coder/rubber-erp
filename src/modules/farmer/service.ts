import "server-only";

import { Prisma } from "@prisma/client";

import type { AuthenticatedUser } from "@/shared/auth/types";
import { prisma } from "@/shared/lib/prisma";

import { toFarmerDTO, type FarmerDTO } from "./dto";
import { farmerT } from "./i18n";
import {
  FARMER_PAGE_SIZE_DEFAULT,
  FARMER_PAGE_SIZE_MAX,
  type CreateFarmerInput,
  type UpdateFarmerInput,
} from "./schemas";

const t = farmerT();

// ─── Custom errors ───────────────────────────────────────────────────────────
//
// Out-of-scope branch access intentionally surfaces as `FarmerNotFoundError`
// (404 in the API) so we never leak the existence of records the caller has
// no right to see. `BranchNotInScopeError` only fires on *create* where the
// caller explicitly picks a branch — a 403 there is expected.

export class FarmerNotFoundError extends Error {
  constructor() {
    super(t.errors.notFound);
    this.name = "FarmerNotFoundError";
  }
}

export class FarmerCodeConflictError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(t.errors.codeConflict(code));
    this.code = code;
    this.name = "FarmerCodeConflictError";
  }
}

export class BranchNotInScopeError extends Error {
  constructor() {
    super(t.errors.branchNotInScope);
    this.name = "BranchNotInScopeError";
  }
}

// ─── Audit helpers ───────────────────────────────────────────────────────────

export type AuditMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
  source?: "api" | "action";
};

type FarmerSnapshot = {
  branchId: string;
  code: string;
  fullName: string;
  phone: string | null;
  nationalId: string | null;
  bankName: string | null;
  bankAccountNo: string | null;
  notes: string | null;
  isActive: boolean;
};

function snapshot(farmer: FarmerSnapshot): Prisma.InputJsonValue {
  return {
    branchId: farmer.branchId,
    code: farmer.code,
    fullName: farmer.fullName,
    phone: farmer.phone,
    nationalId: farmer.nationalId,
    bankName: farmer.bankName,
    bankAccountNo: farmer.bankAccountNo,
    notes: farmer.notes,
    isActive: farmer.isActive,
  } as Prisma.InputJsonValue;
}

function buildAuditMetadata(
  meta?: AuditMeta,
  extra?: Record<string, unknown>,
): Prisma.InputJsonValue {
  return {
    source: meta?.source ?? "api",
    ...(extra ?? {}),
  } as Prisma.InputJsonValue;
}

const FARMER_BRANCH_SELECT = {
  id: true,
  code: true,
  name: true,
} as const;

// ─── Scope helpers ───────────────────────────────────────────────────────────

function ensureBranchInScope(
  actor: AuthenticatedUser,
  branchId: string,
): void {
  if (actor.isSuperAdmin) return;
  if (!actor.branchIds.includes(branchId)) {
    throw new BranchNotInScopeError();
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export type ListFarmersOptions = {
  q?: string;
  branchId?: string;
  includeInactive?: boolean;
  page?: number;
  pageSize?: number;
};

export type ListFarmersResult = {
  farmers: FarmerDTO[];
  total: number;
  page: number;
  pageSize: number;
};

export async function listFarmers(
  actor: AuthenticatedUser,
  opts: ListFarmersOptions = {},
): Promise<ListFarmersResult> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(
    FARMER_PAGE_SIZE_MAX,
    Math.max(1, opts.pageSize ?? FARMER_PAGE_SIZE_DEFAULT),
  );

  const where: Prisma.FarmerWhereInput = {};

  if (!opts.includeInactive) {
    where.isActive = true;
  }

  if (!actor.isSuperAdmin) {
    // User scope: limit to their branches. If they explicitly filter by a
    // branchId outside scope, force an empty result rather than leaking
    // existence.
    if (opts.branchId && !actor.branchIds.includes(opts.branchId)) {
      return { farmers: [], total: 0, page, pageSize };
    }
    where.branchId = opts.branchId
      ? opts.branchId
      : { in: [...actor.branchIds] };
  } else if (opts.branchId) {
    where.branchId = opts.branchId;
  }

  if (opts.q) {
    const q = opts.q.trim();
    if (q.length > 0) {
      where.OR = [
        { code: { contains: q, mode: "insensitive" } },
        { fullName: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
      ];
    }
  }

  const [rows, total] = await Promise.all([
    prisma.farmer.findMany({
      where,
      include: { branch: { select: FARMER_BRANCH_SELECT } },
      orderBy: [{ isActive: "desc" }, { code: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.farmer.count({ where }),
  ]);

  return {
    farmers: rows.map(toFarmerDTO),
    total,
    page,
    pageSize,
  };
}

export async function getFarmer(
  actor: AuthenticatedUser,
  farmerId: string,
): Promise<FarmerDTO | null> {
  const farmer = await prisma.farmer.findUnique({
    where: { id: farmerId },
    include: { branch: { select: FARMER_BRANCH_SELECT } },
  });
  if (!farmer) return null;
  if (!actor.isSuperAdmin && !actor.branchIds.includes(farmer.branchId)) {
    return null;
  }
  return toFarmerDTO(farmer);
}

export async function createFarmer(
  actor: AuthenticatedUser,
  input: CreateFarmerInput,
  meta?: AuditMeta,
): Promise<FarmerDTO> {
  ensureBranchInScope(actor, input.branchId);

  try {
    const created = await prisma.$transaction(async (tx) => {
      const farmer = await tx.farmer.create({
        data: {
          branchId: input.branchId,
          code: input.code,
          fullName: input.fullName,
          phone: input.phone ?? null,
          nationalId: input.nationalId ?? null,
          bankName: input.bankName ?? null,
          bankAccountNo: input.bankAccountNo ?? null,
          notes: input.notes ?? null,
          isActive: true,
        },
        include: { branch: { select: FARMER_BRANCH_SELECT } },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          branchId: farmer.branchId,
          entityType: "Farmer",
          entityId: farmer.id,
          action: "create",
          before: Prisma.DbNull,
          after: snapshot(farmer),
          metadata: buildAuditMetadata(meta),
          ipAddress: meta?.ipAddress ?? null,
          userAgent: meta?.userAgent ?? null,
        },
      });
      return farmer;
    });
    return toFarmerDTO(created);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new FarmerCodeConflictError(input.code);
    }
    throw error;
  }
}

export async function updateFarmer(
  actor: AuthenticatedUser,
  farmerId: string,
  input: UpdateFarmerInput,
  meta?: AuditMeta,
): Promise<FarmerDTO> {
  const existing = await prisma.farmer.findUnique({
    where: { id: farmerId },
    include: { branch: { select: FARMER_BRANCH_SELECT } },
  });
  if (!existing) throw new FarmerNotFoundError();
  if (
    !actor.isSuperAdmin &&
    !actor.branchIds.includes(existing.branchId)
  ) {
    throw new FarmerNotFoundError();
  }

  const data: Prisma.FarmerUpdateInput = {};
  const changedFields: string[] = [];

  if (input.code !== undefined && input.code !== existing.code) {
    data.code = input.code;
    changedFields.push("code");
  }
  if (input.fullName !== undefined && input.fullName !== existing.fullName) {
    data.fullName = input.fullName;
    changedFields.push("fullName");
  }
  if (input.phone !== undefined && (input.phone ?? null) !== existing.phone) {
    data.phone = input.phone ?? null;
    changedFields.push("phone");
  }
  if (
    input.nationalId !== undefined &&
    (input.nationalId ?? null) !== existing.nationalId
  ) {
    data.nationalId = input.nationalId ?? null;
    changedFields.push("nationalId");
  }
  if (
    input.bankName !== undefined &&
    (input.bankName ?? null) !== existing.bankName
  ) {
    data.bankName = input.bankName ?? null;
    changedFields.push("bankName");
  }
  if (
    input.bankAccountNo !== undefined &&
    (input.bankAccountNo ?? null) !== existing.bankAccountNo
  ) {
    data.bankAccountNo = input.bankAccountNo ?? null;
    changedFields.push("bankAccountNo");
  }
  if (input.notes !== undefined && (input.notes ?? null) !== existing.notes) {
    data.notes = input.notes ?? null;
    changedFields.push("notes");
  }
  if (input.isActive !== undefined && input.isActive !== existing.isActive) {
    data.isActive = input.isActive;
    changedFields.push("isActive");
  }

  if (changedFields.length === 0) {
    return toFarmerDTO(existing);
  }

  let action: "update" | "activate" | "deactivate" = "update";
  const isOnlyActivityChange =
    changedFields.length === 1 && changedFields[0] === "isActive";
  if (isOnlyActivityChange && input.isActive === true) action = "activate";
  if (isOnlyActivityChange && input.isActive === false) action = "deactivate";

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const farmer = await tx.farmer.update({
        where: { id: farmerId },
        data,
        include: { branch: { select: FARMER_BRANCH_SELECT } },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          branchId: farmer.branchId,
          entityType: "Farmer",
          entityId: farmer.id,
          action,
          before: snapshot(existing),
          after: snapshot(farmer),
          metadata: buildAuditMetadata(meta, { changedFields }),
          ipAddress: meta?.ipAddress ?? null,
          userAgent: meta?.userAgent ?? null,
        },
      });
      return farmer;
    });
    return toFarmerDTO(updated);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new FarmerCodeConflictError(input.code ?? existing.code);
    }
    throw error;
  }
}

export async function setFarmerActive(
  actor: AuthenticatedUser,
  farmerId: string,
  isActive: boolean,
  meta?: AuditMeta,
): Promise<FarmerDTO> {
  return updateFarmer(actor, farmerId, { isActive }, meta);
}
