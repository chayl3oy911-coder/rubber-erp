import "server-only";

import { Prisma } from "@prisma/client";

import type { AuthenticatedUser } from "@/shared/auth/types";
import { prisma } from "@/shared/lib/prisma";

import { toFarmerDTO, type FarmerDTO } from "./dto";
import { farmerT } from "./i18n";
import {
  FARMER_AUTO_CODE_PADDING,
  FARMER_AUTO_CODE_PREFIX,
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

export class FarmerCodeAutoGenError extends Error {
  constructor() {
    super(t.errors.codeAutoGenFailed);
    this.name = "FarmerCodeAutoGenError";
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

/**
 * Compute the next auto-generated farmer code for `branchId`.
 *
 * Picks `MAX(numeric_suffix) + 1` over codes matching `^FAR[0-9]+$` in the
 * given branch, then zero-pads to {@link FARMER_AUTO_CODE_PADDING} digits.
 *
 * Concurrency: not pessimistic-locked. Two simultaneous callers may compute
 * the same value; the unique constraint (`@@unique([branchId, code])`) is
 * the actual safeguard. The caller (`createFarmer`) handles P2002 by
 * retrying the whole transaction.
 *
 * The regex caps the digit count at 9 so the cast to INTEGER never overflows
 * (max 999,999,999). Codes outside that pattern are simply ignored when
 * computing the max.
 */
async function generateNextFarmerCode(
  tx: Prisma.TransactionClient,
  branchId: string,
): Promise<string> {
  const rows = await tx.$queryRaw<Array<{ maxNum: number | null }>>`
    SELECT MAX(CAST(SUBSTRING(code FROM 4) AS INTEGER)) AS "maxNum"
    FROM "Farmer"
    WHERE "branchId" = ${branchId}::uuid
      AND code ~ '^FAR[0-9]{1,9}$'
  `;
  const maxNum = rows[0]?.maxNum ?? 0;
  const next = (typeof maxNum === "number" ? maxNum : 0) + 1;
  return `${FARMER_AUTO_CODE_PREFIX}${String(next).padStart(
    FARMER_AUTO_CODE_PADDING,
    "0",
  )}`;
}

const CREATE_RETRY_LIMIT = 5;

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

  const userProvidedCode = typeof input.code === "string" && input.code.length > 0;

  // For auto-generated codes, retry the whole transaction on a P2002
  // collision: another caller may have grabbed the same number between our
  // SELECT MAX and INSERT. The retry re-reads MAX so subsequent attempts
  // converge. For user-provided codes, P2002 is a real conflict — bubble it
  // up immediately so the UI/API can return 409.
  for (let attempt = 0; attempt < CREATE_RETRY_LIMIT; attempt++) {
    try {
      const created = await prisma.$transaction(async (tx) => {
        const codeToUse = userProvidedCode
          ? (input.code as string)
          : await generateNextFarmerCode(tx, input.branchId);

        const farmer = await tx.farmer.create({
          data: {
            branchId: input.branchId,
            code: codeToUse,
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
            metadata: buildAuditMetadata(
              meta,
              userProvidedCode ? undefined : { autoGeneratedCode: true },
            ),
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
        if (userProvidedCode) {
          throw new FarmerCodeConflictError(input.code as string);
        }
        // Auto-gen race — try again with a fresh MAX read.
        continue;
      }
      throw error;
    }
  }

  throw new FarmerCodeAutoGenError();
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
