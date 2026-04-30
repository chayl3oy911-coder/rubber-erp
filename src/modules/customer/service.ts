import "server-only";

import { Prisma } from "@prisma/client";

import type { AuthenticatedUser } from "@/shared/auth/types";
import { prisma } from "@/shared/lib/prisma";

import { customerBankLabel } from "./banks";
import { toCustomerDTO, type CustomerDTO } from "./dto";
import { customerT } from "./i18n";
import {
  CUSTOMER_AUTO_CODE_PADDING,
  CUSTOMER_AUTO_CODE_PREFIX,
  CUSTOMER_PAGE_SIZE_DEFAULT,
  CUSTOMER_PAGE_SIZE_MAX,
  MAX_BANK_ACCOUNTS_PER_CUSTOMER,
  type BankAccountInput,
  type CreateCustomerInput,
  type UpdateCustomerInput,
} from "./schemas";

const t = customerT();

// ─── Custom errors ───────────────────────────────────────────────────────────
//
// Out-of-scope branch access intentionally surfaces as `CustomerNotFoundError`
// (404 in the API) so we never leak the existence of records the caller has
// no right to see. `BranchNotInScopeError` only fires on *create* where the
// caller explicitly picks a branch — a 403 there is expected.

export class CustomerNotFoundError extends Error {
  constructor() {
    super(t.errors.notFound);
    this.name = "CustomerNotFoundError";
  }
}

export class CustomerCodeConflictError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(t.errors.codeConflict(code));
    this.code = code;
    this.name = "CustomerCodeConflictError";
  }
}

export class BranchNotInScopeError extends Error {
  constructor() {
    super(t.errors.branchNotInScope);
    this.name = "BranchNotInScopeError";
  }
}

export class CustomerCodeAutoGenError extends Error {
  constructor() {
    super(t.errors.codeAutoGenFailed);
    this.name = "CustomerCodeAutoGenError";
  }
}

export class CustomerBankAccountConflictError extends Error {
  readonly bankName: string;
  readonly bankAccountNo: string;
  constructor(bankName: string, bankAccountNo: string) {
    const display = `${customerBankLabel(bankName) ?? bankName} · ${bankAccountNo}`;
    super(t.errors.bankAccountConflict(display));
    this.bankName = bankName;
    this.bankAccountNo = bankAccountNo;
    this.name = "CustomerBankAccountConflictError";
  }
}

export class CustomerBankAccountValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CustomerBankAccountValidationError";
  }
}

export class CustomerNotFoundForPurchaseError extends Error {
  constructor() {
    super(t.errors.notFound);
    this.name = "CustomerNotFoundForPurchaseError";
  }
}

// ─── Audit helpers ───────────────────────────────────────────────────────────

export type AuditMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
  source?: "api" | "action";
};

type CustomerSnapshot = {
  branchId: string;
  code: string;
  fullName: string;
  phone: string | null;
  nationalId: string | null;
  notes: string | null;
  isActive: boolean;
};

function customerSnapshot(c: CustomerSnapshot): Prisma.InputJsonValue {
  return {
    branchId: c.branchId,
    code: c.code,
    fullName: c.fullName,
    phone: c.phone,
    nationalId: c.nationalId,
    notes: c.notes,
    isActive: c.isActive,
  } as Prisma.InputJsonValue;
}

type BankAccountSnapshotInput = {
  id: string;
  customerId: string;
  bankName: string;
  bankAccountNo: string;
  accountName: string | null;
  isPrimary: boolean;
  isActive: boolean;
};

function bankAccountSnapshot(
  account: BankAccountSnapshotInput,
): Prisma.InputJsonValue {
  return {
    id: account.id,
    customerId: account.customerId,
    bankName: account.bankName,
    bankAccountNo: account.bankAccountNo,
    accountName: account.accountName,
    isPrimary: account.isPrimary,
    isActive: account.isActive,
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

const CUSTOMER_BRANCH_SELECT = {
  id: true,
  code: true,
  name: true,
} as const;

const CUSTOMER_INCLUDE = {
  branch: { select: CUSTOMER_BRANCH_SELECT },
  bankAccounts: true,
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
 * Compute the next auto-generated customer code for `branchId`.
 *
 * Picks `MAX(numeric_suffix) + 1` over codes matching `^CUS[0-9]+$` in the
 * given branch, then zero-pads to {@link CUSTOMER_AUTO_CODE_PADDING} digits.
 *
 * Concurrency: not pessimistic-locked. Two simultaneous callers may compute
 * the same value; the unique constraint (`@@unique([branchId, code])`) is
 * the actual safeguard. The caller (`createCustomer`) handles P2002 by
 * retrying the whole transaction.
 *
 * The regex caps the digit count at 9 so the cast to INTEGER never overflows
 * (max 999,999,999). Codes outside that pattern are simply ignored when
 * computing the max.
 */
async function generateNextCustomerCode(
  tx: Prisma.TransactionClient,
  branchId: string,
): Promise<string> {
  const rows = await tx.$queryRaw<Array<{ maxNum: number | null }>>`
    SELECT MAX(CAST(SUBSTRING(code FROM 4) AS INTEGER)) AS "maxNum"
    FROM "Customer"
    WHERE "branchId" = ${branchId}::uuid
      AND code ~ '^CUS[0-9]{1,9}$'
  `;
  const maxNum = rows[0]?.maxNum ?? 0;
  const next = (typeof maxNum === "number" ? maxNum : 0) + 1;
  return `${CUSTOMER_AUTO_CODE_PREFIX}${String(next).padStart(
    CUSTOMER_AUTO_CODE_PADDING,
    "0",
  )}`;
}

const CREATE_RETRY_LIMIT = 5;

// ─── Bank account list utilities ─────────────────────────────────────────────
//
// Service double-checks the schema-level invariants because:
//   1. The DB has `@@unique([bankName, bankAccountNo])` GLOBAL — we surface
//      that as `CustomerBankAccountConflictError` rather than P2002.
//   2. Schema-level "exactly one primary" is per-list; we re-validate after
//      potential `autoPromoteFirstPrimary` in case the caller bypassed it.

function assertBankAccountListInvariants(
  rows: ReadonlyArray<BankAccountInput>,
): void {
  if (rows.length === 0) return;
  if (rows.length > MAX_BANK_ACCOUNTS_PER_CUSTOMER) {
    throw new CustomerBankAccountValidationError(t.errors.tooManyBankAccounts);
  }
  const primaries = rows.filter((r) => r.isPrimary).length;
  if (primaries === 0) {
    throw new CustomerBankAccountValidationError(t.errors.noPrimaryAccount);
  }
  if (primaries > 1) {
    throw new CustomerBankAccountValidationError(
      t.errors.multiplePrimaryAccounts,
    );
  }
  const seen = new Set<string>();
  for (const r of rows) {
    const key = `${r.bankName}|${r.bankAccountNo.trim()}`;
    if (seen.has(key)) {
      throw new CustomerBankAccountValidationError(
        t.errors.duplicateBankAccountInList,
      );
    }
    seen.add(key);
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export type ListCustomersOptions = {
  q?: string;
  branchId?: string;
  includeInactive?: boolean;
  page?: number;
  pageSize?: number;
};

export type ListCustomersResult = {
  customers: CustomerDTO[];
  total: number;
  page: number;
  pageSize: number;
};

export async function listCustomers(
  actor: AuthenticatedUser,
  opts: ListCustomersOptions = {},
): Promise<ListCustomersResult> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(
    CUSTOMER_PAGE_SIZE_MAX,
    Math.max(1, opts.pageSize ?? CUSTOMER_PAGE_SIZE_DEFAULT),
  );

  const where: Prisma.CustomerWhereInput = {};

  if (!opts.includeInactive) {
    where.isActive = true;
  }

  if (!actor.isSuperAdmin) {
    if (opts.branchId && !actor.branchIds.includes(opts.branchId)) {
      return { customers: [], total: 0, page, pageSize };
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
    prisma.customer.findMany({
      where,
      include: CUSTOMER_INCLUDE,
      orderBy: [{ isActive: "desc" }, { code: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    customers: rows.map(toCustomerDTO),
    total,
    page,
    pageSize,
  };
}

export async function getCustomer(
  actor: AuthenticatedUser,
  customerId: string,
): Promise<CustomerDTO | null> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: CUSTOMER_INCLUDE,
  });
  if (!customer) return null;
  if (!actor.isSuperAdmin && !actor.branchIds.includes(customer.branchId)) {
    return null;
  }
  return toCustomerDTO(customer);
}

export async function createCustomer(
  actor: AuthenticatedUser,
  input: CreateCustomerInput,
  meta?: AuditMeta,
): Promise<CustomerDTO> {
  ensureBranchInScope(actor, input.branchId);

  assertBankAccountListInvariants(input.bankAccounts);

  const userProvidedCode =
    typeof input.code === "string" && input.code.length > 0;

  for (let attempt = 0; attempt < CREATE_RETRY_LIMIT; attempt++) {
    try {
      const created = await prisma.$transaction(async (tx) => {
        const codeToUse = userProvidedCode
          ? (input.code as string)
          : await generateNextCustomerCode(tx, input.branchId);

        const customer = await tx.customer.create({
          data: {
            branchId: input.branchId,
            code: codeToUse,
            fullName: input.fullName,
            phone: input.phone ?? null,
            nationalId: input.nationalId ?? null,
            notes: input.notes ?? null,
            isActive: true,
          },
          include: { branch: { select: CUSTOMER_BRANCH_SELECT } },
        });
        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            branchId: customer.branchId,
            entityType: "Customer",
            entityId: customer.id,
            action: "create",
            before: Prisma.DbNull,
            after: customerSnapshot(customer),
            metadata: buildAuditMetadata(
              meta,
              userProvidedCode ? undefined : { autoGeneratedCode: true },
            ),
            ipAddress: meta?.ipAddress ?? null,
            userAgent: meta?.userAgent ?? null,
          },
        });

        for (const account of input.bankAccounts) {
          const created = await tx.customerBankAccount.create({
            data: {
              customerId: customer.id,
              bankName: account.bankName,
              bankAccountNo: account.bankAccountNo,
              accountName: account.accountName ?? null,
              isPrimary: account.isPrimary,
              isActive: true,
            },
          });
          await tx.auditLog.create({
            data: {
              actorId: actor.id,
              branchId: customer.branchId,
              entityType: "CustomerBankAccount",
              entityId: created.id,
              action: "create",
              before: Prisma.DbNull,
              after: bankAccountSnapshot(created),
              metadata: buildAuditMetadata(meta, { customerId: customer.id }),
              ipAddress: meta?.ipAddress ?? null,
              userAgent: meta?.userAgent ?? null,
            },
          });
        }

        return customer.id;
      });

      const reloaded = await prisma.customer.findUnique({
        where: { id: created },
        include: CUSTOMER_INCLUDE,
      });
      return toCustomerDTO(reloaded!);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        // Could be either the (branchId, code) collision or the global
        // (bankName, bankAccountNo) collision. Disambiguate via meta.target.
        const target = error.meta?.target;
        const targets = Array.isArray(target)
          ? target.map(String)
          : typeof target === "string"
            ? [target]
            : [];

        const isBankConflict =
          targets.includes("bankName") &&
          targets.includes("bankAccountNo");
        if (isBankConflict) {
          // Find which submitted bank account collided so we can show a
          // precise message. Querying the pre-existing row is cheapest.
          for (const a of input.bankAccounts) {
            const exists = await prisma.customerBankAccount.findUnique({
              where: {
                bankName_bankAccountNo: {
                  bankName: a.bankName,
                  bankAccountNo: a.bankAccountNo,
                },
              },
              select: { id: true },
            });
            if (exists) {
              throw new CustomerBankAccountConflictError(
                a.bankName,
                a.bankAccountNo,
              );
            }
          }
          throw new CustomerBankAccountConflictError("", "");
        }

        if (userProvidedCode) {
          throw new CustomerCodeConflictError(input.code as string);
        }
        // Auto-gen race — retry with a fresh MAX read.
        continue;
      }
      throw error;
    }
  }

  throw new CustomerCodeAutoGenError();
}

export async function updateCustomer(
  actor: AuthenticatedUser,
  customerId: string,
  input: UpdateCustomerInput,
  meta?: AuditMeta,
): Promise<CustomerDTO> {
  const existing = await prisma.customer.findUnique({
    where: { id: customerId },
    include: CUSTOMER_INCLUDE,
  });
  if (!existing) throw new CustomerNotFoundError();
  if (
    !actor.isSuperAdmin &&
    !actor.branchIds.includes(existing.branchId)
  ) {
    throw new CustomerNotFoundError();
  }

  if (input.bankAccounts !== undefined) {
    assertBankAccountListInvariants(input.bankAccounts);
  }

  const data: Prisma.CustomerUpdateInput = {};
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
  if (input.notes !== undefined && (input.notes ?? null) !== existing.notes) {
    data.notes = input.notes ?? null;
    changedFields.push("notes");
  }
  if (input.isActive !== undefined && input.isActive !== existing.isActive) {
    data.isActive = input.isActive;
    changedFields.push("isActive");
  }

  const wantsBankSync = input.bankAccounts !== undefined;
  const hasFieldChange = changedFields.length > 0;

  if (!hasFieldChange && !wantsBankSync) {
    return toCustomerDTO(existing);
  }

  let action: "update" | "activate" | "deactivate" = "update";
  const isOnlyActivityChange =
    changedFields.length === 1 &&
    changedFields[0] === "isActive" &&
    !wantsBankSync;
  if (isOnlyActivityChange && input.isActive === true) action = "activate";
  if (isOnlyActivityChange && input.isActive === false) action = "deactivate";

  try {
    await prisma.$transaction(async (tx) => {
      if (hasFieldChange) {
        const customer = await tx.customer.update({
          where: { id: customerId },
          data,
          include: { branch: { select: CUSTOMER_BRANCH_SELECT } },
        });
        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            branchId: customer.branchId,
            entityType: "Customer",
            entityId: customer.id,
            action,
            before: customerSnapshot(existing),
            after: customerSnapshot(customer),
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
          customerId,
          existing.bankAccounts ?? [],
          input.bankAccounts ?? [],
          meta,
        );
      }
    });
  } catch (error) {
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
        targets.includes("bankName") &&
        targets.includes("bankAccountNo");
      if (isBankConflict && input.bankAccounts) {
        for (const a of input.bankAccounts) {
          const exists = await prisma.customerBankAccount.findFirst({
            where: {
              bankName: a.bankName,
              bankAccountNo: a.bankAccountNo,
              customerId: { not: customerId },
            },
            select: { id: true },
          });
          if (exists) {
            throw new CustomerBankAccountConflictError(
              a.bankName,
              a.bankAccountNo,
            );
          }
        }
        throw new CustomerBankAccountConflictError("", "");
      }

      throw new CustomerCodeConflictError(input.code ?? existing.code);
    }
    throw error;
  }

  const reloaded = await prisma.customer.findUnique({
    where: { id: customerId },
    include: CUSTOMER_INCLUDE,
  });
  return toCustomerDTO(reloaded!);
}

/**
 * Replace a customer's bank account list with the supplied one. Diffing is
 * keyed on `(bankName, bankAccountNo)` because callers don't always send the
 * row ids back (e.g. JSON API). For each:
 *   - new in submission only → INSERT
 *   - in DB only → DELETE (cascades nothing else; audit logged)
 *   - in both → UPDATE if accountName/isPrimary changed
 *
 * The `(bankName, bankAccountNo)` pair is GLOBALLY unique. We delete the
 * removed rows BEFORE inserting/updating to avoid transient self-conflicts
 * when the user edits a row in place (e.g. swaps two accounts' details).
 */
async function syncBankAccountsTx(
  tx: Prisma.TransactionClient,
  actorId: string,
  branchId: string,
  customerId: string,
  existing: ReadonlyArray<{
    id: string;
    customerId: string;
    bankName: string;
    bankAccountNo: string;
    accountName: string | null;
    isPrimary: boolean;
    isActive: boolean;
  }>,
  desired: ReadonlyArray<BankAccountInput>,
  meta?: AuditMeta,
): Promise<void> {
  const keyOf = (b: { bankName: string; bankAccountNo: string }) =>
    `${b.bankName}|${b.bankAccountNo.trim()}`;
  const desiredKeys = new Set(desired.map(keyOf));
  const existingByKey = new Map(existing.map((e) => [keyOf(e), e]));

  for (const e of existing) {
    if (!desiredKeys.has(keyOf(e))) {
      await tx.customerBankAccount.delete({ where: { id: e.id } });
      await tx.auditLog.create({
        data: {
          actorId,
          branchId,
          entityType: "CustomerBankAccount",
          entityId: e.id,
          action: "delete",
          before: bankAccountSnapshot({ ...e, customerId }),
          after: Prisma.DbNull,
          metadata: buildAuditMetadata(meta, { customerId }),
          ipAddress: meta?.ipAddress ?? null,
          userAgent: meta?.userAgent ?? null,
        },
      });
    }
  }

  for (const d of desired) {
    const match = existingByKey.get(keyOf(d));
    if (!match) {
      const created = await tx.customerBankAccount.create({
        data: {
          customerId,
          bankName: d.bankName,
          bankAccountNo: d.bankAccountNo,
          accountName: d.accountName ?? null,
          isPrimary: d.isPrimary,
          isActive: true,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          branchId,
          entityType: "CustomerBankAccount",
          entityId: created.id,
          action: "create",
          before: Prisma.DbNull,
          after: bankAccountSnapshot(created),
          metadata: buildAuditMetadata(meta, { customerId }),
          ipAddress: meta?.ipAddress ?? null,
          userAgent: meta?.userAgent ?? null,
        },
      });
      continue;
    }

    const wantsAccountName = (d.accountName ?? null) !== match.accountName;
    const wantsPrimary = d.isPrimary !== match.isPrimary;
    if (!wantsAccountName && !wantsPrimary) continue;

    const updated = await tx.customerBankAccount.update({
      where: { id: match.id },
      data: {
        accountName: d.accountName ?? null,
        isPrimary: d.isPrimary,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        branchId,
        entityType: "CustomerBankAccount",
        entityId: updated.id,
        action: "update",
        before: bankAccountSnapshot(match),
        after: bankAccountSnapshot(updated),
        metadata: buildAuditMetadata(meta, {
          customerId,
          changedFields: [
            ...(wantsAccountName ? ["accountName"] : []),
            ...(wantsPrimary ? ["isPrimary"] : []),
          ],
        }),
        ipAddress: meta?.ipAddress ?? null,
        userAgent: meta?.userAgent ?? null,
      },
    });
  }
}

export async function setCustomerActive(
  actor: AuthenticatedUser,
  customerId: string,
  isActive: boolean,
  meta?: AuditMeta,
): Promise<CustomerDTO> {
  return updateCustomer(actor, customerId, { isActive }, meta);
}
