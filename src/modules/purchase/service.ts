import "server-only";

import { Prisma, type PurchaseTicket } from "@prisma/client";

import type { AuthenticatedUser } from "@/shared/auth/types";
import { prisma } from "@/shared/lib/prisma";

import { toPurchaseTicketDTO, type PurchaseTicketDTO } from "./dto";
import { purchaseT } from "./i18n";
import {
  PURCHASE_PAGE_SIZE_DEFAULT,
  PURCHASE_PAGE_SIZE_MAX,
  PURCHASE_TICKET_PADDING,
  PURCHASE_TICKET_PREFIX,
  type CreatePurchaseInput,
  type UpdatePurchaseFieldsInput,
} from "./schemas";
import {
  cancelReasonRequired,
  getEditableFields,
  isPurchaseStatus,
  planTransition,
  type EditableField,
  type PurchaseStatus,
} from "./status";

const t = purchaseT();

// ─── Custom errors ───────────────────────────────────────────────────────────

export class PurchaseNotFoundError extends Error {
  constructor() {
    super(t.errors.notFound);
    this.name = "PurchaseNotFoundError";
  }
}

export class PurchaseTicketNoConflictError extends Error {
  constructor() {
    super(t.errors.ticketNoConflict);
    this.name = "PurchaseTicketNoConflictError";
  }
}

export class PurchaseAutoGenError extends Error {
  constructor() {
    super(t.errors.autoGenFailed);
    this.name = "PurchaseAutoGenError";
  }
}

export class BranchNotInScopeError extends Error {
  constructor() {
    super(t.errors.branchNotInScope);
    this.name = "BranchNotInScopeError";
  }
}

export class CustomerInactiveError extends Error {
  constructor() {
    super(t.errors.customerInactive);
    this.name = "CustomerInactiveError";
  }
}

export class CustomerBranchMismatchError extends Error {
  constructor() {
    super(t.errors.customerBranchMismatch);
    this.name = "CustomerBranchMismatchError";
  }
}

export class CustomerNotFoundForPurchaseError extends Error {
  constructor() {
    super(t.errors.customerInvalid);
    this.name = "CustomerNotFoundForPurchaseError";
  }
}

export class StatusTransitionError extends Error {
  constructor(from: PurchaseStatus, to: PurchaseStatus) {
    super(t.errors.statusTransitionForbidden(from, to));
    this.name = "StatusTransitionError";
  }
}

export class StatusFieldsLockedError extends Error {
  readonly field: EditableField;
  constructor(field: EditableField) {
    super(t.errors.statusFieldsLocked);
    this.field = field;
    this.name = "StatusFieldsLockedError";
  }
}

export class CancelReasonRequiredError extends Error {
  constructor() {
    super(t.errors.cancelReasonRequired);
    this.name = "CancelReasonRequiredError";
  }
}

/**
 * Once a StockLot has been generated from a PurchaseTicket the ticket is
 * effectively financial-locked: cancelling it would orphan the stock and
 * decouple cost-of-goods from any future sale/production. Service refuses
 * the transition; API maps to 409 Conflict.
 *
 * Stock-side reversal lives in a future flow (CANCEL_REVERSE movement) —
 * out of scope for this step.
 */
export class PurchaseHasStockLotError extends Error {
  constructor() {
    super(t.errors.cancelBlockedByStockLot);
    this.name = "PurchaseHasStockLotError";
  }
}

/**
 * Cancel-after-skip can only act on tickets that have been APPROVED and
 * had their stock intake explicitly SKIPPED. This guards against:
 *   - cancelling a freshly approved ticket without going through the skip
 *     UI (which would let users bypass the "tell me why we're skipping
 *     this" prompt),
 *   - cancelling a ticket whose stock has been received (PurchaseHasStockLotError
 *     handles that case separately).
 */
export class PurchaseNotSkippedForCancelError extends Error {
  constructor() {
    super(t.errors.notSkippedForCancel);
    this.name = "PurchaseNotSkippedForCancelError";
  }
}

// ─── Audit helpers ───────────────────────────────────────────────────────────

export type AuditMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
  source?: "api" | "action";
};

function snapshot(p: PurchaseTicket): Prisma.InputJsonValue {
  return {
    branchId: p.branchId,
    customerId: p.customerId,
    ticketNo: p.ticketNo,
    rubberType: p.rubberType,
    grossWeight: p.grossWeight.toString(),
    tareWeight: p.tareWeight.toString(),
    netWeight: p.netWeight.toString(),
    pricePerKg: p.pricePerKg.toString(),
    totalAmount: p.totalAmount.toString(),
    withholdingTaxPercent: p.withholdingTaxPercent.toString(),
    withholdingTaxAmount: p.withholdingTaxAmount.toString(),
    netPayableAmount: p.netPayableAmount.toString(),
    status: p.status,
    note: p.note,
    approvedAt: p.approvedAt ? p.approvedAt.toISOString() : null,
    approvedById: p.approvedById,
    cancelledAt: p.cancelledAt ? p.cancelledAt.toISOString() : null,
    cancelledById: p.cancelledById,
    cancelReason: p.cancelReason,
    isActive: p.isActive,
    createdById: p.createdById,
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

const PURCHASE_INCLUDE = {
  branch: { select: { id: true, code: true, name: true } },
  customer: {
    select: { id: true, code: true, fullName: true, phone: true },
  },
  createdBy: { select: { id: true, displayName: true } },
  approvedBy: { select: { id: true, displayName: true } },
  cancelledBy: { select: { id: true, displayName: true } },
} as const;

// ─── Calculation ─────────────────────────────────────────────────────────────
//
// All money/weight maths goes through Prisma.Decimal to dodge JS float drift.
// Rounding policy is HALF_UP at 2 decimals on the final money values, matching
// retail/Thai-tax norms. `netWeight` is also clamped to 2 dp to match the new
// column scale (12, 2).

export type ComputedAmounts = {
  netWeight: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  withholdingTaxAmount: Prisma.Decimal;
  netPayableAmount: Prisma.Decimal;
};

const HUNDRED = new Prisma.Decimal(100);

export function computePurchaseAmounts(
  grossWeight: Prisma.Decimal | number | string,
  tareWeight: Prisma.Decimal | number | string,
  pricePerKg: Prisma.Decimal | number | string,
  withholdingTaxPercent: Prisma.Decimal | number | string,
): ComputedAmounts {
  const gross = new Prisma.Decimal(grossWeight);
  const tare = new Prisma.Decimal(tareWeight);
  const price = new Prisma.Decimal(pricePerKg);
  const percent = new Prisma.Decimal(withholdingTaxPercent);

  const net = gross
    .minus(tare)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  const total = net
    .mul(price)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  const tax = total
    .mul(percent)
    .div(HUNDRED)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  const netPayable = total
    .minus(tax)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

  return {
    netWeight: net,
    totalAmount: total,
    withholdingTaxAmount: tax,
    netPayableAmount: netPayable,
  };
}

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

// ─── Auto-generate ticketNo ──────────────────────────────────────────────────

async function generateNextTicketNo(
  tx: Prisma.TransactionClient,
  branchId: string,
): Promise<string> {
  const rows = await tx.$queryRaw<Array<{ maxNum: number | null }>>`
    SELECT MAX(CAST(SUBSTRING("ticketNo" FROM 4) AS INTEGER)) AS "maxNum"
    FROM "PurchaseTicket"
    WHERE "branchId" = ${branchId}::uuid
      AND "ticketNo" ~ '^PUR[0-9]{1,9}$'
  `;
  const maxNum = rows[0]?.maxNum ?? 0;
  const next = (typeof maxNum === "number" ? maxNum : 0) + 1;
  return `${PURCHASE_TICKET_PREFIX}${String(next).padStart(
    PURCHASE_TICKET_PADDING,
    "0",
  )}`;
}

const CREATE_RETRY_LIMIT = 5;

// ─── List & Read ─────────────────────────────────────────────────────────────

export type ListPurchasesOptions = {
  q?: string;
  branchId?: string;
  customerId?: string;
  status?: ReadonlyArray<PurchaseStatus>;
  dateFrom?: string;
  dateTo?: string;
  includeInactive?: boolean;
  page?: number;
  pageSize?: number;
};

export type ListPurchasesResult = {
  purchases: PurchaseTicketDTO[];
  total: number;
  page: number;
  pageSize: number;
};

export async function listPurchases(
  actor: AuthenticatedUser,
  opts: ListPurchasesOptions = {},
): Promise<ListPurchasesResult> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(
    PURCHASE_PAGE_SIZE_MAX,
    Math.max(1, opts.pageSize ?? PURCHASE_PAGE_SIZE_DEFAULT),
  );

  const where: Prisma.PurchaseTicketWhereInput = {};

  if (!opts.includeInactive) {
    where.isActive = true;
  }

  if (!actor.isSuperAdmin) {
    if (opts.branchId && !actor.branchIds.includes(opts.branchId)) {
      return { purchases: [], total: 0, page, pageSize };
    }
    where.branchId = opts.branchId
      ? opts.branchId
      : { in: [...actor.branchIds] };
  } else if (opts.branchId) {
    where.branchId = opts.branchId;
  }

  if (opts.customerId) {
    where.customerId = opts.customerId;
  }

  if (opts.status && opts.status.length > 0) {
    where.status = { in: [...opts.status] };
  }

  if (opts.dateFrom || opts.dateTo) {
    where.createdAt = {};
    if (opts.dateFrom) where.createdAt.gte = new Date(opts.dateFrom);
    if (opts.dateTo) {
      // Inclusive end-of-day: callers usually pass a YYYY-MM-DD string and
      // expect "everything on that day" included.
      const end = new Date(opts.dateTo);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  if (opts.q) {
    const q = opts.q.trim();
    if (q.length > 0) {
      where.OR = [
        { ticketNo: { contains: q, mode: "insensitive" } },
        {
          customer: {
            is: {
              OR: [
                { code: { contains: q, mode: "insensitive" } },
                { fullName: { contains: q, mode: "insensitive" } },
              ],
            },
          },
        },
      ];
    }
  }

  const [rows, total] = await Promise.all([
    prisma.purchaseTicket.findMany({
      where,
      include: PURCHASE_INCLUDE,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.purchaseTicket.count({ where }),
  ]);

  return {
    purchases: rows.map(toPurchaseTicketDTO),
    total,
    page,
    pageSize,
  };
}

export async function getPurchase(
  actor: AuthenticatedUser,
  id: string,
): Promise<PurchaseTicketDTO | null> {
  const ticket = await prisma.purchaseTicket.findUnique({
    where: { id },
    include: PURCHASE_INCLUDE,
  });
  if (!ticket) return null;
  if (!actor.isSuperAdmin && !actor.branchIds.includes(ticket.branchId)) {
    return null;
  }
  return toPurchaseTicketDTO(ticket);
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createPurchase(
  actor: AuthenticatedUser,
  input: CreatePurchaseInput,
  meta?: AuditMeta,
): Promise<PurchaseTicketDTO> {
  ensureBranchInScope(actor, input.branchId);

  // Validate customer up-front (cheap query, gives a precise error class).
  // We re-validate inside the transaction in case of TOCTOU, but the early
  // check gives a friendlier 400/404 response.
  const customer = await prisma.customer.findUnique({
    where: { id: input.customerId },
    select: { id: true, branchId: true, isActive: true },
  });
  if (!customer) throw new CustomerNotFoundForPurchaseError();
  if (customer.branchId !== input.branchId) {
    throw new CustomerBranchMismatchError();
  }
  if (!customer.isActive) throw new CustomerInactiveError();

  const tareInput = input.tareWeight ?? 0;
  const percentInput = input.withholdingTaxPercent ?? 0;
  const { netWeight, totalAmount, withholdingTaxAmount, netPayableAmount } =
    computePurchaseAmounts(
      input.grossWeight,
      tareInput,
      input.pricePerKg,
      percentInput,
    );

  for (let attempt = 0; attempt < CREATE_RETRY_LIMIT; attempt++) {
    try {
      const created = await prisma.$transaction(async (tx) => {
        const ticketNo = await generateNextTicketNo(tx, input.branchId);
        const ticket = await tx.purchaseTicket.create({
          data: {
            branchId: input.branchId,
            customerId: input.customerId,
            ticketNo,
            rubberType: input.rubberType,
            grossWeight: new Prisma.Decimal(input.grossWeight),
            tareWeight: new Prisma.Decimal(tareInput),
            netWeight,
            pricePerKg: new Prisma.Decimal(input.pricePerKg),
            totalAmount,
            withholdingTaxPercent: new Prisma.Decimal(percentInput),
            withholdingTaxAmount,
            netPayableAmount,
            status: "DRAFT",
            note: input.note ?? null,
            createdById: actor.id,
          },
          include: PURCHASE_INCLUDE,
        });
        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            branchId: ticket.branchId,
            entityType: "PurchaseTicket",
            entityId: ticket.id,
            action: "create",
            before: Prisma.DbNull,
            after: snapshot(ticket),
            metadata: buildAuditMetadata(meta, {
              autoGeneratedTicketNo: true,
            }),
            ipAddress: meta?.ipAddress ?? null,
            userAgent: meta?.userAgent ?? null,
          },
        });
        return ticket;
      });
      return toPurchaseTicketDTO(created);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        // Auto-gen ticketNo race — retry with fresh MAX read.
        continue;
      }
      throw error;
    }
  }

  throw new PurchaseAutoGenError();
}

// ─── Update fields (no status change) ────────────────────────────────────────

export async function updatePurchaseFields(
  actor: AuthenticatedUser,
  id: string,
  input: UpdatePurchaseFieldsInput,
  meta?: AuditMeta,
): Promise<PurchaseTicketDTO> {
  const existing = await prisma.purchaseTicket.findUnique({ where: { id } });
  if (!existing) throw new PurchaseNotFoundError();
  if (
    !actor.isSuperAdmin &&
    !actor.branchIds.includes(existing.branchId)
  ) {
    throw new PurchaseNotFoundError();
  }

  const status = existing.status as PurchaseStatus;
  const editable = getEditableFields(status);

  // Strip out any fields not editable in this status — but if caller tried to
  // change a locked field with a different value, refuse loudly so the API
  // can surface a precise field error. Same-value updates are silently
  // ignored (idempotent).

  type FieldKey =
    | "rubberType"
    | "grossWeight"
    | "tareWeight"
    | "pricePerKg"
    | "withholdingTaxPercent"
    | "note";
  const changedFields: FieldKey[] = [];
  const data: Prisma.PurchaseTicketUpdateInput = {};

  if (input.rubberType !== undefined && input.rubberType !== existing.rubberType) {
    if (!editable.has("rubberType")) throw new StatusFieldsLockedError("rubberType");
    data.rubberType = input.rubberType;
    changedFields.push("rubberType");
  }
  if (input.note !== undefined && (input.note ?? null) !== existing.note) {
    if (!editable.has("note")) throw new StatusFieldsLockedError("note");
    data.note = input.note ?? null;
    changedFields.push("note");
  }

  // Weight/price/tax changes all flow through one recomputation path so the
  // four computed fields stay consistent. Even a tax-only change must
  // recompute totalAmount → withholdingTaxAmount → netPayableAmount.
  const wantsWeight =
    input.grossWeight !== undefined || input.tareWeight !== undefined;
  const wantsPrice = input.pricePerKg !== undefined;
  const wantsPercent = input.withholdingTaxPercent !== undefined;
  const wantsRecompute = wantsWeight || wantsPrice || wantsPercent;

  if (wantsRecompute) {
    if (input.grossWeight !== undefined && !editable.has("grossWeight")) {
      throw new StatusFieldsLockedError("grossWeight");
    }
    if (input.tareWeight !== undefined && !editable.has("tareWeight")) {
      throw new StatusFieldsLockedError("tareWeight");
    }
    if (input.pricePerKg !== undefined && !editable.has("pricePerKg")) {
      throw new StatusFieldsLockedError("pricePerKg");
    }
    if (
      input.withholdingTaxPercent !== undefined &&
      !editable.has("withholdingTaxPercent")
    ) {
      throw new StatusFieldsLockedError("withholdingTaxPercent");
    }

    const nextGross =
      input.grossWeight !== undefined
        ? new Prisma.Decimal(input.grossWeight)
        : existing.grossWeight;
    const nextTare =
      input.tareWeight !== undefined
        ? new Prisma.Decimal(input.tareWeight)
        : existing.tareWeight;
    const nextPrice =
      input.pricePerKg !== undefined
        ? new Prisma.Decimal(input.pricePerKg)
        : existing.pricePerKg;
    const nextPercent =
      input.withholdingTaxPercent !== undefined
        ? new Prisma.Decimal(input.withholdingTaxPercent)
        : existing.withholdingTaxPercent;

    if (!nextGross.gt(nextTare)) {
      // Cross-field rule mirrors createPurchaseSchema.refine — service is the
      // ultimate enforcer because Zod cannot see existing values during a
      // partial update.
      throw new StatusFieldsLockedError("tareWeight"); // best-effort field hint
    }

    const {
      netWeight,
      totalAmount,
      withholdingTaxAmount,
      netPayableAmount,
    } = computePurchaseAmounts(nextGross, nextTare, nextPrice, nextPercent);

    if (!nextGross.eq(existing.grossWeight)) {
      data.grossWeight = nextGross;
      changedFields.push("grossWeight");
    }
    if (!nextTare.eq(existing.tareWeight)) {
      data.tareWeight = nextTare;
      changedFields.push("tareWeight");
    }
    if (!nextPrice.eq(existing.pricePerKg)) {
      data.pricePerKg = nextPrice;
      changedFields.push("pricePerKg");
    }
    if (!nextPercent.eq(existing.withholdingTaxPercent)) {
      data.withholdingTaxPercent = nextPercent;
      changedFields.push("withholdingTaxPercent");
    }
    if (!netWeight.eq(existing.netWeight)) {
      data.netWeight = netWeight;
    }
    if (!totalAmount.eq(existing.totalAmount)) {
      data.totalAmount = totalAmount;
    }
    if (!withholdingTaxAmount.eq(existing.withholdingTaxAmount)) {
      data.withholdingTaxAmount = withholdingTaxAmount;
    }
    if (!netPayableAmount.eq(existing.netPayableAmount)) {
      data.netPayableAmount = netPayableAmount;
    }
  }

  if (changedFields.length === 0) {
    const reload = await prisma.purchaseTicket.findUnique({
      where: { id },
      include: PURCHASE_INCLUDE,
    });
    return toPurchaseTicketDTO(reload!);
  }

  const calcSnapshot = wantsRecompute
    ? {
        calculation: {
          grossBefore: existing.grossWeight.toString(),
          grossAfter: (data.grossWeight ?? existing.grossWeight).toString(),
          tareBefore: existing.tareWeight.toString(),
          tareAfter: (data.tareWeight ?? existing.tareWeight).toString(),
          netBefore: existing.netWeight.toString(),
          netAfter: (data.netWeight ?? existing.netWeight).toString(),
          priceBefore: existing.pricePerKg.toString(),
          priceAfter: (data.pricePerKg ?? existing.pricePerKg).toString(),
          totalBefore: existing.totalAmount.toString(),
          totalAfter: (data.totalAmount ?? existing.totalAmount).toString(),
          withholdingPercentBefore: existing.withholdingTaxPercent.toString(),
          withholdingPercentAfter: (
            data.withholdingTaxPercent ?? existing.withholdingTaxPercent
          ).toString(),
          withholdingAmountBefore: existing.withholdingTaxAmount.toString(),
          withholdingAmountAfter: (
            data.withholdingTaxAmount ?? existing.withholdingTaxAmount
          ).toString(),
          netPayableBefore: existing.netPayableAmount.toString(),
          netPayableAfter: (
            data.netPayableAmount ?? existing.netPayableAmount
          ).toString(),
        },
      }
    : undefined;

  const updated = await prisma.$transaction(async (tx) => {
    const ticket = await tx.purchaseTicket.update({
      where: { id },
      data,
      include: PURCHASE_INCLUDE,
    });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        branchId: ticket.branchId,
        entityType: "PurchaseTicket",
        entityId: ticket.id,
        action: "update",
        before: snapshot(existing),
        after: snapshot(ticket),
        metadata: buildAuditMetadata(meta, {
          changedFields,
          ...(calcSnapshot ?? {}),
        }),
        ipAddress: meta?.ipAddress ?? null,
        userAgent: meta?.userAgent ?? null,
      },
    });
    return ticket;
  });

  return toPurchaseTicketDTO(updated);
}

// ─── Status transition ───────────────────────────────────────────────────────

export async function transitionPurchaseStatus(
  actor: AuthenticatedUser,
  id: string,
  to: PurchaseStatus,
  cancelReason: string | undefined,
  meta?: AuditMeta,
): Promise<PurchaseTicketDTO> {
  if (!isPurchaseStatus(to)) {
    throw new StatusTransitionError(to as PurchaseStatus, to);
  }

  const existing = await prisma.purchaseTicket.findUnique({ where: { id } });
  if (!existing) throw new PurchaseNotFoundError();
  if (
    !actor.isSuperAdmin &&
    !actor.branchIds.includes(existing.branchId)
  ) {
    throw new PurchaseNotFoundError();
  }

  const from = existing.status as PurchaseStatus;
  const plan = planTransition(from, to);
  if (!plan) {
    throw new StatusTransitionError(from, to);
  }

  // Permission check is the service's responsibility too — actions/API call
  // requirePermission *before* this, but defence-in-depth keeps the rule in
  // one place. We accept the actor's permission set as authoritative.
  if (!actor.isSuperAdmin && !actor.permissions.has(plan.permission)) {
    throw new StatusTransitionError(from, to);
  }

  if (
    plan.action === "cancel" &&
    cancelReasonRequired(from) &&
    !(cancelReason && cancelReason.trim().length > 0)
  ) {
    throw new CancelReasonRequiredError();
  }

  // Cancel guard: once stock has been received from this ticket, cancelling
  // would orphan the lot. We block here (Step 8) — a proper reversal flow
  // lives in a future Stock-Cancel feature with CANCEL_REVERSE movements.
  if (plan.action === "cancel") {
    const lot = await prisma.stockLot.findUnique({
      where: { sourcePurchaseTicketId: existing.id },
      select: { id: true },
    });
    if (lot) {
      throw new PurchaseHasStockLotError();
    }
  }

  const now = new Date();
  const data: Prisma.PurchaseTicketUpdateInput = { status: to };

  if (plan.action === "approve") {
    data.approvedAt = now;
    data.approvedBy = { connect: { id: actor.id } };
  }
  if (plan.action === "cancel") {
    data.cancelledAt = now;
    data.cancelledBy = { connect: { id: actor.id } };
    data.cancelReason = cancelReason?.trim() ? cancelReason.trim() : null;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const ticket = await tx.purchaseTicket.update({
      where: { id },
      data,
      include: PURCHASE_INCLUDE,
    });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        branchId: ticket.branchId,
        entityType: "PurchaseTicket",
        entityId: ticket.id,
        action: plan.action,
        before: snapshot(existing),
        after: snapshot(ticket),
        metadata: buildAuditMetadata(meta, {
          from,
          to,
          ...(plan.action === "cancel" && cancelReason
            ? { cancelReason: cancelReason.trim() }
            : {}),
        }),
        ipAddress: meta?.ipAddress ?? null,
        userAgent: meta?.userAgent ?? null,
      },
    });
    return ticket;
  });

  return toPurchaseTicketDTO(updated);
}

// ─── Cancel after skip (Step 12 — Purchase Problem flow, Case A) ────────────
//
// This is the second authorised entry point into APPROVED → CANCELLED, kept
// separate from `transitionPurchaseStatus` for three reasons:
//
//   1. Permission code: this gate uses `purchase.cancelAfterSkip` (granted
//      to branch_manager / super_admin), distinct from `purchase.cancel`.
//      A user who can cancel pre-approval drafts shouldn't automatically
//      gain the right to cancel approved-then-skipped tickets.
//
//   2. Pre-condition: requires `stockIntakeStatus === "SKIPPED"`. Plain
//      cancel of an APPROVED ticket is forbidden — operators must first
//      go through the skip flow (which records the operational reason)
//      before reaching the financial-cancel step (which records the
//      cancellation reason). Two reasons captured separately = better
//      audit + easier root-cause analysis.
//
//   3. Audit action: logs as `cancel_purchase_after_skip` so reports can
//      tell apart "cancelled before approval" vs "cancelled after a skip".
//
// Same hard guards as the regular cancel:
//   - reason required (trim ≥ 1 char; UI enforces ≥ 5 with translation),
//   - no StockLot must exist (defence-in-depth — SKIPPED already implies
//     no lot, but we recheck under FOR UPDATE).
//
// Concurrency: `SELECT … FOR UPDATE` on the ticket row blocks two
// simultaneous cancel/un-skip races — whoever wins the lock wins the
// transition; the loser sees a state-mismatch error after re-reading.

export async function cancelPurchaseAfterSkip(
  actor: AuthenticatedUser,
  id: string,
  cancelReason: string,
  meta?: AuditMeta,
): Promise<PurchaseTicketDTO> {
  if (!actor.isSuperAdmin && !actor.permissions.has("purchase.cancelAfterSkip")) {
    throw new StatusTransitionError("APPROVED", "CANCELLED");
  }

  if (!cancelReason || cancelReason.trim().length === 0) {
    throw new CancelReasonRequiredError();
  }
  const trimmedReason = cancelReason.trim();

  const updated = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "PurchaseTicket" WHERE id = ${id}::uuid FOR UPDATE
    `;

    const existing = await tx.purchaseTicket.findUnique({ where: { id } });
    if (!existing) throw new PurchaseNotFoundError();
    if (
      !actor.isSuperAdmin &&
      !actor.branchIds.includes(existing.branchId)
    ) {
      throw new PurchaseNotFoundError();
    }

    if (existing.status !== "APPROVED") {
      throw new StatusTransitionError(
        existing.status as PurchaseStatus,
        "CANCELLED",
      );
    }
    if (existing.stockIntakeStatus !== "SKIPPED") {
      throw new PurchaseNotSkippedForCancelError();
    }

    // Defence-in-depth: SKIPPED implies no lot, but re-check under lock so
    // we never silently cancel a ticket that quietly received stock via a
    // backfill or admin tool between skip and cancel.
    const lot = await tx.stockLot.findUnique({
      where: { sourcePurchaseTicketId: existing.id },
      select: { id: true },
    });
    if (lot) throw new PurchaseHasStockLotError();

    const now = new Date();
    const ticket = await tx.purchaseTicket.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledAt: now,
        cancelledBy: { connect: { id: actor.id } },
        cancelReason: trimmedReason,
      },
      include: PURCHASE_INCLUDE,
    });

    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        branchId: ticket.branchId,
        entityType: "PurchaseTicket",
        entityId: ticket.id,
        action: "cancel_purchase_after_skip",
        before: snapshot(existing),
        after: snapshot(ticket),
        metadata: buildAuditMetadata(meta, {
          from: "APPROVED",
          to: "CANCELLED",
          stockIntakeStatusAtCancel: "SKIPPED",
          stockIntakeSkippedAt:
            existing.stockIntakeSkippedAt?.toISOString() ?? null,
          stockIntakeSkipReason: existing.stockIntakeSkipReason,
          cancelReason: trimmedReason,
        }),
        ipAddress: meta?.ipAddress ?? null,
        userAgent: meta?.userAgent ?? null,
      },
    });

    return ticket;
  });

  return toPurchaseTicketDTO(updated);
}
