import "server-only";

import { Prisma } from "@prisma/client";

import { bankLabel } from "@/shared/banks";
import type { AuthenticatedUser } from "@/shared/auth/types";
import { prisma } from "@/shared/lib/prisma";

import {
  toReceivingEntityDTO,
  type ReceivingEntityDTO,
} from "./dto";
import { receivingAccountT } from "./i18n";
import {
  RECEIVING_ENTITY_PAGE_SIZE_DEFAULT,
  RECEIVING_ENTITY_PAGE_SIZE_MAX,
  type BankAccountInput,
  type CreateReceivingEntityInput,
  type ListReceivingEntitiesQuery,
  type UpdateReceivingEntityInput,
} from "./schemas";
import {
  MAX_BANK_ACCOUNTS_PER_RECEIVING_ENTITY,
  type ReceivingEntityType,
} from "./types";

const t = receivingAccountT();

// ─── Custom errors ──────────────────────────────────────────────────────────
//
// Out-of-scope reads/updates intentionally surface as `NotFound` so we
// don't leak the existence of records the caller has no right to see —
// same pattern as the customer module. `BranchNotInScope` only fires on
// CREATE where the caller actively picks a branch.

export class ReceivingEntityNotFoundError extends Error {
  constructor() {
    super(t.errors.notFound);
    this.name = "ReceivingEntityNotFoundError";
  }
}

export class ReceivingEntityBranchNotInScopeError extends Error {
  constructor() {
    super(t.errors.branchNotInScope);
    this.name = "ReceivingEntityBranchNotInScopeError";
  }
}

export class ReceivingBankAccountConflictError extends Error {
  readonly bankName: string;
  readonly bankAccountNo: string;
  constructor(bankName: string, bankAccountNo: string) {
    const display = `${bankLabel(bankName) ?? bankName} · ${bankAccountNo}`;
    super(t.errors.bankAccountConflict(display));
    this.bankName = bankName;
    this.bankAccountNo = bankAccountNo;
    this.name = "ReceivingBankAccountConflictError";
  }
}

export class ReceivingBankAccountValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReceivingBankAccountValidationError";
  }
}

export class ReceivingPrimaryReassignRequiredError extends Error {
  constructor() {
    super(t.errors.primaryReassignRequired);
    this.name = "ReceivingPrimaryReassignRequiredError";
  }
}

export class ReceivingDefaultReassignRequiredError extends Error {
  constructor() {
    super(t.errors.defaultReassignRequired);
    this.name = "ReceivingDefaultReassignRequiredError";
  }
}

// ─── Audit helpers ──────────────────────────────────────────────────────────

export type ReceivingAuditMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
  source?: "api" | "action";
};

type EntitySnapshot = {
  id: string;
  branchId: string | null;
  type: string;
  name: string;
  taxId: string | null;
  address: string | null;
  isDefault: boolean;
  isActive: boolean;
};

function entitySnapshot(e: EntitySnapshot): Prisma.InputJsonValue {
  return {
    id: e.id,
    branchId: e.branchId,
    type: e.type,
    name: e.name,
    taxId: e.taxId,
    address: e.address,
    isDefault: e.isDefault,
    isActive: e.isActive,
  } as Prisma.InputJsonValue;
}

type BankAccountSnapshot = {
  id: string;
  receivingEntityId: string;
  bankName: string;
  bankAccountNo: string;
  bankAccountName: string;
  isPrimary: boolean;
  isActive: boolean;
};

function bankAccountSnapshot(
  account: BankAccountSnapshot,
): Prisma.InputJsonValue {
  return {
    id: account.id,
    receivingEntityId: account.receivingEntityId,
    bankName: account.bankName,
    bankAccountNo: account.bankAccountNo,
    bankAccountName: account.bankAccountName,
    isPrimary: account.isPrimary,
    isActive: account.isActive,
  } as Prisma.InputJsonValue;
}

function buildAuditMetadata(
  meta?: ReceivingAuditMeta,
  extra?: Record<string, unknown>,
): Prisma.InputJsonValue {
  return {
    source: meta?.source ?? "api",
    ...(extra ?? {}),
  } as Prisma.InputJsonValue;
}

// ─── Includes / projections ─────────────────────────────────────────────────

const RECEIVING_ENTITY_BRANCH_SELECT = {
  id: true,
  code: true,
  name: true,
} as const;

const RECEIVING_ENTITY_INCLUDE = {
  branch: { select: RECEIVING_ENTITY_BRANCH_SELECT },
  bankAccounts: true,
} as const;

// ─── Scope helpers ──────────────────────────────────────────────────────────
//
// "Scope" semantics:
//   - branchId = null  → company-wide (visible to every actor)
//   - branchId = uuid  → only visible if the actor has that branch in scope
//                        (or is super_admin)
//
// `ensureBranchInScopeForCreate` is *only* called on create where the caller
// chose a branchId. For company-wide creation (branchId omitted) we further
// restrict who can create — see `ensureCompanyWideAuthorisation`.

function ensureBranchInScopeForCreate(
  actor: AuthenticatedUser,
  branchId: string,
): void {
  if (actor.isSuperAdmin) return;
  if (!actor.branchIds.includes(branchId)) {
    throw new ReceivingEntityBranchNotInScopeError();
  }
}

function ensureCompanyWideAuthorisation(actor: AuthenticatedUser): void {
  if (actor.isSuperAdmin) return;
  // hq_admin owns company-wide entries (per Step 10 plan §10). Anyone else
  // attempting a `branchId = null` create gets a scope error.
  if (actor.permissions.has("settings.receivingAccount.update")) return;
  throw new ReceivingEntityBranchNotInScopeError();
}

function isVisibleToActor(
  actor: AuthenticatedUser,
  entityBranchId: string | null,
): boolean {
  if (actor.isSuperAdmin) return true;
  if (entityBranchId === null) return true;
  return actor.branchIds.includes(entityBranchId);
}

// ─── List ───────────────────────────────────────────────────────────────────

export type ListReceivingEntitiesResult = {
  entities: ReceivingEntityDTO[];
  total: number;
  page: number;
  pageSize: number;
};

export async function listReceivingEntities(
  actor: AuthenticatedUser,
  opts: ListReceivingEntitiesQuery,
): Promise<ListReceivingEntitiesResult> {
  const page = Math.max(1, opts.page);
  const pageSize = Math.min(
    RECEIVING_ENTITY_PAGE_SIZE_MAX,
    Math.max(1, opts.pageSize),
  );

  const where: Prisma.ReceivingEntityWhereInput = {};

  if (!opts.includeInactive) {
    where.isActive = true;
  }

  // Branch scope: combine actor scope with the optional branchId filter.
  if (!actor.isSuperAdmin) {
    if (opts.branchId && !actor.branchIds.includes(opts.branchId)) {
      // Caller asked for a branch they can't see — return empty rather
      // than 403, matching the customer module's "don't leak existence".
      return { entities: [], total: 0, page, pageSize };
    }
  }

  const branchScopeFilters: Prisma.ReceivingEntityWhereInput[] = [];
  if (opts.branchScope === "company") {
    branchScopeFilters.push({ branchId: null });
  } else if (opts.branchScope === "branch") {
    if (opts.branchId) {
      branchScopeFilters.push({ branchId: opts.branchId });
    } else if (!actor.isSuperAdmin) {
      branchScopeFilters.push({ branchId: { in: [...actor.branchIds] } });
    }
  } else {
    // "all" — actor's branches OR company-wide. Super admin sees everything
    // unless `opts.branchId` narrows to a single branch.
    if (actor.isSuperAdmin) {
      if (opts.branchId) {
        branchScopeFilters.push({
          OR: [{ branchId: opts.branchId }, { branchId: null }],
        });
      }
    } else {
      branchScopeFilters.push({
        OR: [
          { branchId: null },
          ...(opts.branchId
            ? [{ branchId: opts.branchId }]
            : [{ branchId: { in: [...actor.branchIds] } }]),
        ],
      });
    }
  }

  if (branchScopeFilters.length > 0) {
    where.AND = branchScopeFilters;
  }

  if (opts.q) {
    const q = opts.q.trim();
    if (q.length > 0) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { taxId: { contains: q, mode: "insensitive" } },
        {
          bankAccounts: {
            some: {
              OR: [
                { bankAccountNo: { contains: q, mode: "insensitive" } },
                { bankAccountName: { contains: q, mode: "insensitive" } },
              ],
            },
          },
        },
      ];
    }
  }

  const [rows, total] = await Promise.all([
    prisma.receivingEntity.findMany({
      where,
      include: RECEIVING_ENTITY_INCLUDE,
      orderBy: [
        { isDefault: "desc" },
        { isActive: "desc" },
        { name: "asc" },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.receivingEntity.count({ where }),
  ]);

  return {
    entities: rows.map(toReceivingEntityDTO),
    total,
    page,
    pageSize,
  };
}

// ─── Get one ────────────────────────────────────────────────────────────────

export async function getReceivingEntity(
  actor: AuthenticatedUser,
  id: string,
): Promise<ReceivingEntityDTO | null> {
  const entity = await prisma.receivingEntity.findUnique({
    where: { id },
    include: RECEIVING_ENTITY_INCLUDE,
  });
  if (!entity) return null;
  if (!isVisibleToActor(actor, entity.branchId)) return null;
  return toReceivingEntityDTO(entity);
}

// ─── Bank-account list invariants (defence-in-depth alongside Zod) ──────────

function assertBankAccountListInvariants(
  rows: ReadonlyArray<BankAccountInput>,
): void {
  if (rows.length === 0) return;
  if (rows.length > MAX_BANK_ACCOUNTS_PER_RECEIVING_ENTITY) {
    throw new ReceivingBankAccountValidationError(
      t.errors.tooManyBankAccounts,
    );
  }
  const activeRows = rows.filter((r) => r.isActive);
  if (activeRows.length > 0) {
    const primaries = activeRows.filter((r) => r.isPrimary).length;
    if (primaries === 0) {
      throw new ReceivingBankAccountValidationError(t.errors.noPrimaryAccount);
    }
    if (primaries > 1) {
      throw new ReceivingBankAccountValidationError(
        t.errors.multiplePrimaryAccounts,
      );
    }
  }
  for (const r of rows) {
    if (r.isPrimary && !r.isActive) {
      throw new ReceivingBankAccountValidationError(
        t.errors.inactiveCannotBePrimary,
      );
    }
  }
  const seen = new Set<string>();
  for (const r of rows) {
    const key = `${r.bankName}|${r.bankAccountNo.trim()}`;
    if (seen.has(key)) {
      throw new ReceivingBankAccountValidationError(
        t.errors.duplicateBankAccountInList,
      );
    }
    seen.add(key);
  }
}

// ─── Create ─────────────────────────────────────────────────────────────────

export async function createReceivingEntity(
  actor: AuthenticatedUser,
  input: CreateReceivingEntityInput,
  meta?: ReceivingAuditMeta,
): Promise<ReceivingEntityDTO> {
  if (input.branchId === undefined) {
    ensureCompanyWideAuthorisation(actor);
  } else {
    ensureBranchInScopeForCreate(actor, input.branchId);
  }

  assertBankAccountListInvariants(input.bankAccounts);

  // P2002 on the partial unique indexes is theoretically possible if two
  // operators race to create defaults in the same scope, or two banks rows
  // happen to collide. We surface those as friendly errors below.
  try {
    const createdId = await prisma.$transaction(async (tx) => {
      // 1. If isDefault=true, clear other defaults in the same scope so the
      //    partial unique index doesn't fire.
      if (input.isDefault) {
        await clearDefaultsInScopeTx(tx, input.branchId ?? null);
      }

      const entity = await tx.receivingEntity.create({
        data: {
          branchId: input.branchId ?? null,
          type: input.type,
          name: input.name,
          taxId: input.taxId ?? null,
          address: input.address ?? null,
          isDefault: input.isDefault,
          isActive: true,
          createdById: actor.id,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          branchId: entity.branchId,
          entityType: "ReceivingEntity",
          entityId: entity.id,
          action: "create",
          before: Prisma.DbNull,
          after: entitySnapshot(entity),
          metadata: buildAuditMetadata(meta, {
            isDefault: entity.isDefault,
            type: entity.type,
            scope: entity.branchId === null ? "company-wide" : "branch",
          }),
          ipAddress: meta?.ipAddress ?? null,
          userAgent: meta?.userAgent ?? null,
        },
      });

      for (const account of input.bankAccounts) {
        const created = await tx.receivingBankAccount.create({
          data: {
            receivingEntityId: entity.id,
            bankName: account.bankName,
            bankAccountNo: account.bankAccountNo,
            bankAccountName: account.bankAccountName,
            isPrimary: account.isPrimary,
            isActive: account.isActive,
          },
        });
        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            branchId: entity.branchId,
            entityType: "ReceivingBankAccount",
            entityId: created.id,
            action: "create",
            before: Prisma.DbNull,
            after: bankAccountSnapshot(created),
            metadata: buildAuditMetadata(meta, {
              receivingEntityId: entity.id,
              isPrimary: created.isPrimary,
            }),
            ipAddress: meta?.ipAddress ?? null,
            userAgent: meta?.userAgent ?? null,
          },
        });
      }

      return entity.id;
    });

    const reloaded = await prisma.receivingEntity.findUnique({
      where: { id: createdId },
      include: RECEIVING_ENTITY_INCLUDE,
    });
    return toReceivingEntityDTO(reloaded!);
  } catch (error) {
    throw mapPrismaError(error, input.bankAccounts);
  }
}

// ─── Update ─────────────────────────────────────────────────────────────────

export async function updateReceivingEntity(
  actor: AuthenticatedUser,
  id: string,
  input: UpdateReceivingEntityInput,
  meta?: ReceivingAuditMeta,
): Promise<ReceivingEntityDTO> {
  const existing = await prisma.receivingEntity.findUnique({
    where: { id },
    include: RECEIVING_ENTITY_INCLUDE,
  });
  if (!existing) throw new ReceivingEntityNotFoundError();
  if (!isVisibleToActor(actor, existing.branchId)) {
    throw new ReceivingEntityNotFoundError();
  }

  if (input.bankAccounts !== undefined) {
    assertBankAccountListInvariants(input.bankAccounts);
  }

  // Pre-flight rules ─────────────────────────────────────────────────────
  // Inactive cannot also be the default. If caller is deactivating an
  // active default WITHOUT also clearing isDefault → reject.
  const willBeActive =
    input.isActive !== undefined ? input.isActive : existing.isActive;
  const willBeDefault =
    input.isDefault !== undefined ? input.isDefault : existing.isDefault;
  if (!willBeActive && willBeDefault) {
    throw new ReceivingBankAccountValidationError(
      t.errors.inactiveCannotBeDefault,
    );
  }
  if (existing.isDefault && existing.isActive && !willBeActive) {
    throw new ReceivingDefaultReassignRequiredError();
  }

  const data: Prisma.ReceivingEntityUpdateInput = {};
  const changedFields: string[] = [];

  if (input.type !== undefined && input.type !== existing.type) {
    data.type = input.type;
    changedFields.push("type");
  }
  if (input.name !== undefined && input.name !== existing.name) {
    data.name = input.name;
    changedFields.push("name");
  }
  if (input.taxId !== undefined && (input.taxId ?? null) !== existing.taxId) {
    data.taxId = input.taxId ?? null;
    changedFields.push("taxId");
  }
  if (
    input.address !== undefined &&
    (input.address ?? null) !== existing.address
  ) {
    data.address = input.address ?? null;
    changedFields.push("address");
  }
  if (
    input.isDefault !== undefined &&
    input.isDefault !== existing.isDefault
  ) {
    data.isDefault = input.isDefault;
    changedFields.push("isDefault");
  }
  if (input.isActive !== undefined && input.isActive !== existing.isActive) {
    data.isActive = input.isActive;
    changedFields.push("isActive");
  }

  const wantsBankSync = input.bankAccounts !== undefined;
  const hasFieldChange = changedFields.length > 0;

  if (!hasFieldChange && !wantsBankSync) {
    return toReceivingEntityDTO(existing);
  }

  let action: "update" | "activate" | "deactivate" | "set_default" = "update";
  const isOnlyActiveFlip =
    changedFields.length === 1 &&
    changedFields[0] === "isActive" &&
    !wantsBankSync;
  if (isOnlyActiveFlip && input.isActive === true) action = "activate";
  if (isOnlyActiveFlip && input.isActive === false) action = "deactivate";
  const isOnlyDefaultFlip =
    changedFields.length === 1 &&
    changedFields[0] === "isDefault" &&
    !wantsBankSync;
  if (isOnlyDefaultFlip && input.isDefault === true) action = "set_default";

  try {
    await prisma.$transaction(async (tx) => {
      // Default flip → clear other defaults in same scope first.
      if (
        input.isDefault === true &&
        input.isDefault !== existing.isDefault
      ) {
        await clearDefaultsInScopeTx(tx, existing.branchId, existing.id);
      }

      if (hasFieldChange) {
        const entity = await tx.receivingEntity.update({
          where: { id: existing.id },
          data,
        });
        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            branchId: entity.branchId,
            entityType: "ReceivingEntity",
            entityId: entity.id,
            action,
            before: entitySnapshot(existing),
            after: entitySnapshot(entity),
            metadata: buildAuditMetadata(meta, { changedFields }),
            ipAddress: meta?.ipAddress ?? null,
            userAgent: meta?.userAgent ?? null,
          },
        });
      }

      if (wantsBankSync) {
        await syncBankAccountsTx(
          tx,
          actor.id,
          existing.branchId,
          existing.id,
          existing.bankAccounts ?? [],
          input.bankAccounts ?? [],
          meta,
        );
      }
    });
  } catch (error) {
    throw mapPrismaError(error, input.bankAccounts ?? []);
  }

  const reloaded = await prisma.receivingEntity.findUnique({
    where: { id },
    include: RECEIVING_ENTITY_INCLUDE,
  });
  return toReceivingEntityDTO(reloaded!);
}

// ─── Set default (dedicated helper) ─────────────────────────────────────────
//
// Wraps `updateReceivingEntity` so the audit log emits a `set_default`
// action and the call site can be a single-purpose API endpoint.

export async function setReceivingEntityDefault(
  actor: AuthenticatedUser,
  id: string,
  isDefault: boolean,
  meta?: ReceivingAuditMeta,
): Promise<ReceivingEntityDTO> {
  return updateReceivingEntity(actor, id, { isDefault }, meta);
}

// ─── Diff sync for bank accounts ────────────────────────────────────────────
//
// Sync semantics (mirrors customer/syncBankAccountsTx):
//   - row.id is provided & matches existing → UPDATE in place
//   - row matches existing by (bankName, bankAccountNo) → UPDATE in place
//   - existing not present in submission → DELETE (cascade-safe; entity
//     remains; the soft-delete pattern is handled by `isActive=false` on
//     the entity itself, not on every bank row)
//
// We DELETE rows that disappear from the submission rather than soft-
// delete because the user can keep them around by toggling isActive=false
// in the form. Disappearing means the user explicitly removed the row.

async function syncBankAccountsTx(
  tx: Prisma.TransactionClient,
  actorId: string,
  branchId: string | null,
  receivingEntityId: string,
  existing: ReadonlyArray<{
    id: string;
    receivingEntityId: string;
    bankName: string;
    bankAccountNo: string;
    bankAccountName: string;
    isPrimary: boolean;
    isActive: boolean;
  }>,
  desired: ReadonlyArray<BankAccountInput>,
  meta?: ReceivingAuditMeta,
): Promise<void> {
  const keyOf = (b: { bankName: string; bankAccountNo: string }) =>
    `${b.bankName}|${b.bankAccountNo.trim()}`;

  const existingById = new Map(existing.map((e) => [e.id, e]));
  const existingByKey = new Map(existing.map((e) => [keyOf(e), e]));

  // Resolve which submitted rows match which existing rows (id wins
  // over composite key — caller may have edited bankAccountNo in place).
  type ResolvedMatch = {
    row: BankAccountInput;
    match: (typeof existing)[number] | null;
  };
  const resolved: ResolvedMatch[] = desired.map((row) => {
    if (row.id) {
      const byId = existingById.get(row.id);
      if (byId) return { row, match: byId };
    }
    return { row, match: existingByKey.get(keyOf(row)) ?? null };
  });

  const matchedExistingIds = new Set(
    resolved
      .map((r) => r.match?.id)
      .filter((x): x is string => typeof x === "string"),
  );

  // Phase 1 — DELETE rows that disappeared from the submission. We do this
  // BEFORE inserts/updates so that `(receivingEntityId, bankName, bankAccountNo)`
  // uniqueness can't ambush an in-place edit (e.g. user swaps two rows'
  // numbers). The active-primary partial index also needs the old primary
  // gone before a different row claims primary.
  for (const e of existing) {
    if (matchedExistingIds.has(e.id)) continue;
    await tx.receivingBankAccount.delete({ where: { id: e.id } });
    await tx.auditLog.create({
      data: {
        actorId,
        branchId,
        entityType: "ReceivingBankAccount",
        entityId: e.id,
        action: "delete",
        before: bankAccountSnapshot({ ...e, receivingEntityId }),
        after: Prisma.DbNull,
        metadata: buildAuditMetadata(meta, { receivingEntityId }),
        ipAddress: meta?.ipAddress ?? null,
        userAgent: meta?.userAgent ?? null,
      },
    });
  }

  // Phase 2 — Existing rows that are about to LOSE their primary status
  // must be flipped first so the partial unique index is happy when a
  // different row gains primary in phase 3. (Postgres validates the index
  // after each row write; a brief invariant violation between two writes
  // would otherwise raise P2002 even within a transaction.)
  for (const { row, match } of resolved) {
    if (!match) continue;
    if (match.isPrimary && !row.isPrimary) {
      await tx.receivingBankAccount.update({
        where: { id: match.id },
        data: { isPrimary: false },
      });
      // Mutate local snapshot so phase 3 sees the new state.
      match.isPrimary = false;
    }
    if (match.isActive && !row.isActive) {
      // Deactivating a row also drops its primary flag (invariant).
      await tx.receivingBankAccount.update({
        where: { id: match.id },
        data: { isActive: false, isPrimary: false },
      });
      match.isActive = false;
      match.isPrimary = false;
    }
  }

  // Phase 3 — UPDATE remaining matched rows (idempotent if nothing changed)
  // and INSERT new rows.
  for (const { row, match } of resolved) {
    if (match) {
      const wantsAccountNo = row.bankAccountNo.trim() !== match.bankAccountNo;
      const wantsBankName = row.bankName !== match.bankName;
      const wantsAccountName = row.bankAccountName !== match.bankAccountName;
      const wantsPrimary = row.isPrimary !== match.isPrimary;
      const wantsActive = row.isActive !== match.isActive;
      if (
        !wantsAccountNo &&
        !wantsBankName &&
        !wantsAccountName &&
        !wantsPrimary &&
        !wantsActive
      ) {
        continue;
      }
      const updated = await tx.receivingBankAccount.update({
        where: { id: match.id },
        data: {
          bankName: row.bankName,
          bankAccountNo: row.bankAccountNo.trim(),
          bankAccountName: row.bankAccountName,
          isPrimary: row.isPrimary,
          isActive: row.isActive,
        },
      });
      const action: "update" | "activate" | "deactivate" | "set_primary" =
        wantsActive && row.isActive
          ? "activate"
          : wantsActive && !row.isActive
            ? "deactivate"
            : wantsPrimary && row.isPrimary
              ? "set_primary"
              : "update";
      await tx.auditLog.create({
        data: {
          actorId,
          branchId,
          entityType: "ReceivingBankAccount",
          entityId: updated.id,
          action,
          before: bankAccountSnapshot(match),
          after: bankAccountSnapshot(updated),
          metadata: buildAuditMetadata(meta, {
            receivingEntityId,
            changedFields: [
              ...(wantsBankName ? ["bankName"] : []),
              ...(wantsAccountNo ? ["bankAccountNo"] : []),
              ...(wantsAccountName ? ["bankAccountName"] : []),
              ...(wantsPrimary ? ["isPrimary"] : []),
              ...(wantsActive ? ["isActive"] : []),
            ],
          }),
          ipAddress: meta?.ipAddress ?? null,
          userAgent: meta?.userAgent ?? null,
        },
      });
      continue;
    }

    // Brand-new row.
    const created = await tx.receivingBankAccount.create({
      data: {
        receivingEntityId,
        bankName: row.bankName,
        bankAccountNo: row.bankAccountNo.trim(),
        bankAccountName: row.bankAccountName,
        isPrimary: row.isPrimary,
        isActive: row.isActive,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        branchId,
        entityType: "ReceivingBankAccount",
        entityId: created.id,
        action: "create",
        before: Prisma.DbNull,
        after: bankAccountSnapshot(created),
        metadata: buildAuditMetadata(meta, {
          receivingEntityId,
          isPrimary: created.isPrimary,
        }),
        ipAddress: meta?.ipAddress ?? null,
        userAgent: meta?.userAgent ?? null,
      },
    });
  }
}

// ─── Default-scope helper ───────────────────────────────────────────────────
//
// Clear `isDefault` for every other ACTIVE entity in the same scope. We
// don't touch inactive rows because the partial unique index ignores them
// and resurrecting an inactive entity later could surprise the user
// (better to clear at activation time, which the activate path handles).

async function clearDefaultsInScopeTx(
  tx: Prisma.TransactionClient,
  branchId: string | null,
  exceptId?: string,
): Promise<void> {
  await tx.receivingEntity.updateMany({
    where: {
      branchId,
      isDefault: true,
      isActive: true,
      ...(exceptId ? { NOT: { id: exceptId } } : {}),
    },
    data: { isDefault: false },
  });
}

// ─── Sales-side helpers ─────────────────────────────────────────────────────
//
// `resolveDefaultReceivingForSale` is invoked by the sales service when
// the request omits `receivingEntityId` / `receivingBankAccountId`. We pick
// the entity flagged `isDefault` whose scope covers `salesBranchId` (own
// branch wins over company-wide), then pick its primary active bank
// account. If either is missing, the caller throws a friendly error.

export type ResolvedReceiving = {
  entityId: string;
  bankAccountId: string;
  entityNameSnapshot: string;
  entityTypeSnapshot: string;
  taxIdSnapshot: string | null;
  bankNameSnapshot: string;
  bankAccountNoSnapshot: string;
  bankAccountNameSnapshot: string;
};

export async function resolveDefaultReceivingForSale(
  tx: Prisma.TransactionClient,
  salesBranchId: string,
): Promise<ResolvedReceiving | null> {
  const entity = await tx.receivingEntity.findFirst({
    where: {
      isDefault: true,
      isActive: true,
      OR: [{ branchId: salesBranchId }, { branchId: null }],
    },
    // Branch-scoped beats company-wide when both have a default flagged.
    orderBy: [{ branchId: "desc" }],
    include: {
      bankAccounts: {
        where: { isPrimary: true, isActive: true },
        take: 1,
      },
    },
  });
  if (!entity || entity.bankAccounts.length === 0) return null;
  const bank = entity.bankAccounts[0]!;
  return {
    entityId: entity.id,
    bankAccountId: bank.id,
    entityNameSnapshot: entity.name,
    entityTypeSnapshot: entity.type,
    taxIdSnapshot: entity.taxId,
    bankNameSnapshot: bank.bankName,
    bankAccountNoSnapshot: bank.bankAccountNo,
    bankAccountNameSnapshot: bank.bankAccountName,
  };
}

/**
 * Validate a (entityId, bankAccountId) pair supplied by the user against
 * scope + active flags, and return the snapshot fields ready to write.
 *
 * Returns `null` when either id is invalid/inactive/out-of-scope so the
 * sales service can throw a precise error class to the caller.
 */
export async function loadReceivingForSale(
  tx: Prisma.TransactionClient,
  actor: AuthenticatedUser,
  salesBranchId: string,
  entityId: string,
  bankAccountId: string,
): Promise<ResolvedReceiving | null> {
  const entity = await tx.receivingEntity.findUnique({
    where: { id: entityId },
    include: {
      bankAccounts: { where: { id: bankAccountId } },
    },
  });
  if (!entity || !entity.isActive) return null;
  if (entity.branchId !== null && entity.branchId !== salesBranchId) {
    return null;
  }
  if (
    entity.branchId !== null &&
    !actor.isSuperAdmin &&
    !actor.branchIds.includes(entity.branchId)
  ) {
    return null;
  }
  const bank = entity.bankAccounts[0];
  if (!bank || !bank.isActive) return null;
  if (bank.receivingEntityId !== entity.id) return null;
  return {
    entityId: entity.id,
    bankAccountId: bank.id,
    entityNameSnapshot: entity.name,
    entityTypeSnapshot: entity.type,
    taxIdSnapshot: entity.taxId,
    bankNameSnapshot: bank.bankName,
    bankAccountNoSnapshot: bank.bankAccountNo,
    bankAccountNameSnapshot: bank.bankAccountName,
  };
}

// ─── Prisma error mapping ───────────────────────────────────────────────────
//
// Service speaks in domain errors; routes/actions catch + map to HTTP/UI.
// `mapPrismaError` consolidates the P2002 cases that can fire from
// `(receivingEntityId, bankName, bankAccountNo)` uniqueness or from the
// two partial indexes.

function mapPrismaError(
  error: unknown,
  bankAccounts: ReadonlyArray<BankAccountInput>,
): Error {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    const target = error.meta?.target;
    const targets = Array.isArray(target)
      ? target.map(String)
      : typeof target === "string"
        ? [target]
        : [];
    const isBankConflict =
      targets.includes("bankName") && targets.includes("bankAccountNo");
    if (isBankConflict) {
      const culprit = bankAccounts[0];
      if (culprit) {
        return new ReceivingBankAccountConflictError(
          culprit.bankName,
          culprit.bankAccountNo,
        );
      }
      return new ReceivingBankAccountConflictError("", "");
    }
  }
  return error instanceof Error ? error : new Error(String(error));
}

// ─── Re-exports for downstream consumers ────────────────────────────────────

export {
  RECEIVING_ENTITY_PAGE_SIZE_DEFAULT,
  RECEIVING_ENTITY_PAGE_SIZE_MAX,
  MAX_BANK_ACCOUNTS_PER_RECEIVING_ENTITY,
};

export type { ReceivingEntityType };
