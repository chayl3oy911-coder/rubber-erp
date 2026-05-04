import "server-only";

import { Prisma } from "@prisma/client";

import { hasPermission } from "@/shared/auth/dal";
import type { AuthenticatedUser } from "@/shared/auth/types";
import { prisma } from "@/shared/lib/prisma";

import {
  purchaseReturnSelect,
  toPurchaseReturnDTO,
  type PurchaseReturnDTO,
} from "./dto";
import { purchaseReturnT } from "./i18n";
import {
  type CancelPurchaseReturnInput,
  type CreatePurchaseReturnInput,
  type ListPurchaseReturnsQuery,
} from "./schemas";
import {
  PURCHASE_RETURN_PADDING,
  PURCHASE_RETURN_PREFIX,
} from "./types";

const t = purchaseReturnT();

// ─── Custom errors ──────────────────────────────────────────────────────────

export class PurchaseReturnNotFoundError extends Error {
  constructor() {
    super(t.errors.notFound);
    this.name = "PurchaseReturnNotFoundError";
  }
}

export class PurchaseReturnPermissionDeniedError extends Error {
  constructor() {
    super("Permission denied");
    this.name = "PurchaseReturnPermissionDeniedError";
  }
}

export class PurchaseReturnBranchMismatchError extends Error {
  constructor() {
    super(t.errors.branchMismatch);
    this.name = "PurchaseReturnBranchMismatchError";
  }
}

export class PurchaseReturnNotDraftError extends Error {
  constructor() {
    super(t.errors.notDraft);
    this.name = "PurchaseReturnNotDraftError";
  }
}

export class PurchaseReturnAlreadyConfirmedError extends Error {
  constructor() {
    super(t.errors.alreadyConfirmed);
    this.name = "PurchaseReturnAlreadyConfirmedError";
  }
}

export class PurchaseReturnAlreadyCancelledError extends Error {
  constructor() {
    super(t.errors.alreadyCancelled);
    this.name = "PurchaseReturnAlreadyCancelledError";
  }
}

export class PurchaseReturnWeightTooLargeError extends Error {
  constructor() {
    super(t.errors.weightTooLarge);
    this.name = "PurchaseReturnWeightTooLargeError";
  }
}

export class PurchaseReturnLotInactiveError extends Error {
  constructor() {
    super(t.errors.lotInactive);
    this.name = "PurchaseReturnLotInactiveError";
  }
}

export class PurchaseReturnLotCancelledError extends Error {
  constructor() {
    super(t.errors.lotCancelled);
    this.name = "PurchaseReturnLotCancelledError";
  }
}

export class PurchaseReturnPurchaseNotApprovedError extends Error {
  constructor() {
    super(t.errors.purchaseNotApproved);
    this.name = "PurchaseReturnPurchaseNotApprovedError";
  }
}

export class PurchaseReturnIntakeNotReceivedError extends Error {
  constructor() {
    super(t.errors.intakeNotReceived);
    this.name = "PurchaseReturnIntakeNotReceivedError";
  }
}

export class PurchaseReturnReasonNoteRequiredError extends Error {
  constructor() {
    super(t.errors.reasonNoteRequired);
    this.name = "PurchaseReturnReasonNoteRequiredError";
  }
}

export class PurchaseReturnMovementConflictError extends Error {
  constructor() {
    super(t.errors.movementConflict);
    this.name = "PurchaseReturnMovementConflictError";
  }
}

// ─── Audit meta ─────────────────────────────────────────────────────────────

export type PurchaseReturnAuditMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
  source?: "api" | "action";
};

function buildAuditMetadata(
  meta: PurchaseReturnAuditMeta | undefined,
  extra: Record<string, unknown>,
): Prisma.InputJsonValue {
  return {
    source: meta?.source ?? "api",
    ...extra,
  } as Prisma.InputJsonValue;
}

// ─── Scope helpers ──────────────────────────────────────────────────────────

function isInBranchScope(
  actor: AuthenticatedUser,
  branchId: string,
): boolean {
  return actor.isSuperAdmin || actor.branchIds.includes(branchId);
}

// ─── Cost helpers (mirrors stock/service.computeEffectiveCostPerKg) ────────

function computeEffectiveCostPerKg(
  costAmount: Prisma.Decimal,
  remainingWeight: Prisma.Decimal,
): Prisma.Decimal {
  if (remainingWeight.lte(0)) return new Prisma.Decimal(0);
  return costAmount
    .div(remainingWeight)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

// ─── Return-no generator (branch-scoped, retry on race) ────────────────────

const RETURN_NO_RETRY_LIMIT = 5;

async function generateNextReturnNo(
  tx: Prisma.TransactionClient,
  branchId: string,
): Promise<string> {
  const rows = await tx.$queryRaw<Array<{ maxNum: number | null }>>`
    SELECT MAX(CAST(SUBSTRING("returnNo" FROM 4) AS INTEGER)) AS "maxNum"
    FROM "PurchaseReturn"
    WHERE "branchId" = ${branchId}::uuid
      AND "returnNo" ~ '^PRT[0-9]{1,9}$'
  `;
  const maxNum = rows[0]?.maxNum ?? 0;
  const next = (typeof maxNum === "number" ? maxNum : 0) + 1;
  return `${PURCHASE_RETURN_PREFIX}${String(next).padStart(
    PURCHASE_RETURN_PADDING,
    "0",
  )}`;
}

// ─── Core: create DRAFT ────────────────────────────────────────────────────
//
// Permissions: `purchase.return.create` AND lot's branch ∈ actor.branchIds
// (super_admin bypasses both).
//
// Validation cascade:
//   1. lot exists + active
//   2. lot.status !== "CANCELLED"
//   3. ticket.status === "APPROVED"
//   4. ticket.stockIntakeStatus === "RECEIVED"
//   5. returnWeight > 0
//   6. returnWeight ≤ lot.remainingWeight
//   7. reasonType="OTHER" ⇒ note required (zod handles this; double-checked
//      here just in case the schema is bypassed in tests)

export async function createPurchaseReturnDraft(
  actor: AuthenticatedUser,
  input: CreatePurchaseReturnInput,
  meta?: PurchaseReturnAuditMeta,
): Promise<PurchaseReturnDTO> {
  if (!hasPermission(actor, "purchase.return.create")) {
    throw new PurchaseReturnPermissionDeniedError();
  }

  // Pre-fetch outside the tx — branch-scope check rejects fast without
  // grabbing locks. We re-read with FOR UPDATE inside the tx for safety.
  const lot = await prisma.stockLot.findUnique({
    where: { id: input.stockLotId },
    select: {
      id: true,
      branchId: true,
      isActive: true,
      status: true,
      remainingWeight: true,
      sourcePurchaseTicketId: true,
      lotNo: true,
      sourcePurchaseTicket: {
        select: {
          id: true,
          ticketNo: true,
          branchId: true,
          status: true,
          stockIntakeStatus: true,
          customer: { select: { code: true, fullName: true } },
        },
      },
    },
  });
  if (!lot) throw new PurchaseReturnNotFoundError();
  if (!isInBranchScope(actor, lot.branchId)) {
    throw new PurchaseReturnBranchMismatchError();
  }
  if (!lot.isActive) throw new PurchaseReturnLotInactiveError();
  if (lot.status === "CANCELLED") throw new PurchaseReturnLotCancelledError();
  if (!lot.sourcePurchaseTicket) {
    throw new PurchaseReturnNotFoundError();
  }
  if (lot.sourcePurchaseTicket.status !== "APPROVED") {
    throw new PurchaseReturnPurchaseNotApprovedError();
  }
  if (lot.sourcePurchaseTicket.stockIntakeStatus !== "RECEIVED") {
    throw new PurchaseReturnIntakeNotReceivedError();
  }

  if (input.returnReasonType === "OTHER") {
    const note = (input.returnReasonNote ?? "").trim();
    if (note.length < 5) throw new PurchaseReturnReasonNoteRequiredError();
  }

  const returnWeight = new Prisma.Decimal(input.returnWeight).toDecimalPlaces(
    2,
    Prisma.Decimal.ROUND_HALF_UP,
  );
  if (returnWeight.lte(0)) {
    throw new PurchaseReturnWeightTooLargeError();
  }

  // Per-spec: returnWeight ≤ lot.remainingWeight at draft time. Confirm-time
  // re-validates against the LATEST remainingWeight under FOR UPDATE.
  if (returnWeight.gt(lot.remainingWeight)) {
    throw new PurchaseReturnWeightTooLargeError();
  }

  for (let attempt = 0; attempt < RETURN_NO_RETRY_LIMIT; attempt++) {
    try {
      const created = await prisma.$transaction(async (tx) => {
        const returnNo = await generateNextReturnNo(tx, lot.branchId);

        const draft = await tx.purchaseReturn.create({
          data: {
            branchId: lot.branchId,
            purchaseTicketId: lot.sourcePurchaseTicketId,
            stockLotId: lot.id,
            returnNo,
            status: "DRAFT",
            returnReasonType: input.returnReasonType,
            returnReasonNote: input.returnReasonNote ?? null,
            returnWeight,
            // Preview value — confirm overwrites with the lot's CURRENT
            // effectiveCostPerKg × returnWeight under FOR UPDATE.
            returnCostAmount: 0,
            customerCodeSnapshot:
              lot.sourcePurchaseTicket?.customer?.code ?? null,
            customerNameSnapshot:
              lot.sourcePurchaseTicket?.customer?.fullName ?? null,
            ticketNoSnapshot: lot.sourcePurchaseTicket?.ticketNo ?? null,
            lotNoSnapshot: lot.lotNo,
            createdById: actor.id,
            refundStatus: "PENDING",
          },
          select: purchaseReturnSelect,
        });

        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            branchId: lot.branchId,
            entityType: "PurchaseReturn",
            entityId: draft.id,
            action: "create_purchase_return",
            before: Prisma.DbNull,
            after: {
              returnNo: draft.returnNo,
              status: draft.status,
              stockLotId: draft.stockLotId,
              purchaseTicketId: draft.purchaseTicketId,
              returnWeight: draft.returnWeight.toString(),
              returnReasonType: draft.returnReasonType,
              returnReasonNote: draft.returnReasonNote,
            } as Prisma.InputJsonValue,
            metadata: buildAuditMetadata(meta, {
              lotNo: lot.lotNo,
              ticketNo: lot.sourcePurchaseTicket?.ticketNo,
            }),
            ipAddress: meta?.ipAddress ?? null,
            userAgent: meta?.userAgent ?? null,
          },
        });

        return draft;
      });
      return toPurchaseReturnDTO(created);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const target = (error.meta?.target ?? []) as string[] | string;
        const targetStr = Array.isArray(target) ? target.join(",") : String(target);
        if (targetStr.includes("returnNo")) {
          // returnNo race — retry
          continue;
        }
      }
      throw error;
    }
  }

  throw new PurchaseReturnMovementConflictError();
}

// ─── Core: confirm (DRAFT → CONFIRMED) ────────────────────────────────────
//
// CRITICAL invariants enforced inside ONE transaction:
//   (a) `SELECT id FROM "PurchaseReturn" WHERE id = … FOR UPDATE`
//       → blocks two HTTP confirmers from racing on the same draft.
//   (b) `SELECT id FROM "StockLot" WHERE id = … FOR UPDATE`
//       → blocks SALES_OUT / ADJUST / other returns from mutating the same
//         lot mid-confirm. Lock order: return THEN lot, consistent with
//         "always lock parent doc before stock row" used by sales/confirm.
//   (c) Re-read the return row INSIDE the tx after the lock — by the time
//       we got here someone may have already CONFIRMED or CANCELLED it.
//   (d) Re-read the lot's CURRENT effectiveCostPerKg & remainingWeight —
//       a SALES_OUT between draft-time and confirm-time would change both.
//   (e) Cost is clamped ≥ 0 (lot.costAmount cannot go negative).
//   (f) On depletion, lot.status flips to DEPLETED and effectiveCostPerKg
//       is FROZEN at its pre-return value (parallels SALES_OUT semantics).

export async function confirmPurchaseReturn(
  actor: AuthenticatedUser,
  id: string,
  meta?: PurchaseReturnAuditMeta,
): Promise<PurchaseReturnDTO> {
  if (!hasPermission(actor, "purchase.return.confirm")) {
    throw new PurchaseReturnPermissionDeniedError();
  }

  const confirmed = await prisma.$transaction(async (tx) => {
    // (a) Lock the return doc first.
    await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "PurchaseReturn" WHERE id = ${id}::uuid FOR UPDATE
    `;

    const draft = await tx.purchaseReturn.findUnique({
      where: { id },
      select: {
        id: true,
        branchId: true,
        purchaseTicketId: true,
        stockLotId: true,
        status: true,
        returnReasonType: true,
        returnReasonNote: true,
        returnWeight: true,
        stockMovementId: true,
        isActive: true,
      },
    });
    if (!draft || !draft.isActive) {
      throw new PurchaseReturnNotFoundError();
    }
    if (!isInBranchScope(actor, draft.branchId)) {
      throw new PurchaseReturnBranchMismatchError();
    }
    if (draft.status === "CONFIRMED") {
      throw new PurchaseReturnAlreadyConfirmedError();
    }
    if (draft.status === "CANCELLED") {
      throw new PurchaseReturnAlreadyCancelledError();
    }
    if (draft.status !== "DRAFT") {
      throw new PurchaseReturnNotDraftError();
    }

    // (b) Lock the lot.
    await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "StockLot" WHERE id = ${draft.stockLotId}::uuid FOR UPDATE
    `;

    const lot = await tx.stockLot.findUnique({
      where: { id: draft.stockLotId },
      select: {
        id: true,
        branchId: true,
        lotNo: true,
        remainingWeight: true,
        costAmount: true,
        effectiveCostPerKg: true,
        status: true,
        isActive: true,
      },
    });
    if (!lot) throw new PurchaseReturnNotFoundError();
    if (!lot.isActive) throw new PurchaseReturnLotInactiveError();
    if (lot.status === "CANCELLED") {
      throw new PurchaseReturnLotCancelledError();
    }

    // (d) Recheck weight against the CURRENT remaining (sales might have
    // shrunk the lot since we created the draft).
    const returnWeight = new Prisma.Decimal(draft.returnWeight);
    const before = new Prisma.Decimal(lot.remainingWeight);
    if (returnWeight.lte(0)) {
      throw new PurchaseReturnWeightTooLargeError();
    }
    if (returnWeight.gt(before)) {
      throw new PurchaseReturnWeightTooLargeError();
    }

    // Cost — same model as SALES_OUT.
    const currentCostPerKg = new Prisma.Decimal(lot.effectiveCostPerKg);
    const returnCost = currentCostPerKg
      .mul(returnWeight)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

    const after = before
      .minus(returnWeight)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

    const lotCostBefore = new Prisma.Decimal(lot.costAmount);
    // (e) Clamp ≥ 0. On depletion we pin to exactly 0 (kills ±0.01 drift).
    let newLotCost = after.lte(0)
      ? new Prisma.Decimal(0)
      : lotCostBefore
          .minus(returnCost)
          .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    if (newLotCost.lt(0)) newLotCost = new Prisma.Decimal(0);

    // (f) On depletion: freeze rate at the pre-return value. Otherwise
    // recompute from the new cost & remaining (parallels SALES_OUT).
    const newEffective = after.lte(0)
      ? currentCostPerKg
      : computeEffectiveCostPerKg(newLotCost, after);
    const newLotStatus = after.lte(0) ? "DEPLETED" : "ACTIVE";

    await tx.stockLot.update({
      where: { id: lot.id },
      data: {
        remainingWeight: after,
        costAmount: newLotCost,
        effectiveCostPerKg: newEffective,
        status: newLotStatus,
      },
    });

    const movement = await tx.stockMovement.create({
      data: {
        branchId: lot.branchId,
        stockLotId: lot.id,
        movementType: "PURCHASE_RETURN_OUT",
        quantity: returnWeight,
        beforeWeight: before,
        afterWeight: after,
        reasonType: null,
        referenceType: "PurchaseReturn",
        referenceId: draft.id,
        note: null,
        createdById: actor.id,
      },
    });

    // Update the draft: status, snapshot the AUTHORITATIVE returnCostAmount,
    // bind to the movement, set confirm metadata. We also flip refundStatus
    // to NOT_REQUIRED if the ticket hasn't been paid yet (no money to
    // refund — payment module hooks decide later if it changes).
    const ticket = await tx.purchaseTicket.findUnique({
      where: { id: draft.purchaseTicketId },
      select: { paymentStatus: true },
    });
    const refundStatusOnConfirm =
      ticket?.paymentStatus === "UNPAID" ? "NOT_REQUIRED" : "PENDING";

    const updated = await tx.purchaseReturn.update({
      where: { id: draft.id },
      data: {
        status: "CONFIRMED",
        returnCostAmount: returnCost,
        stockMovementId: movement.id,
        confirmedById: actor.id,
        confirmedAt: new Date(),
        refundStatus: refundStatusOnConfirm,
      },
      select: purchaseReturnSelect,
    });

    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        branchId: lot.branchId,
        entityType: "PurchaseReturn",
        entityId: draft.id,
        action: "confirm_purchase_return",
        before: { status: "DRAFT" } as Prisma.InputJsonValue,
        after: {
          status: "CONFIRMED",
          returnNo: updated.returnNo,
          returnWeight: returnWeight.toString(),
          returnCostAmount: returnCost.toString(),
          movement: {
            id: movement.id,
            movementType: "PURCHASE_RETURN_OUT",
            beforeWeight: before.toString(),
            afterWeight: after.toString(),
          },
          lot: {
            id: lot.id,
            lotNo: lot.lotNo,
            beforeRemaining: before.toString(),
            afterRemaining: after.toString(),
            beforeCostAmount: lotCostBefore.toString(),
            afterCostAmount: newLotCost.toString(),
            beforeEffectiveCostPerKg: currentCostPerKg.toString(),
            afterEffectiveCostPerKg: newEffective.toString(),
            statusAfter: newLotStatus,
          },
        } as Prisma.InputJsonValue,
        metadata: buildAuditMetadata(meta, {
          // Inline the movement details so a single audit row tells the
          // whole story without joining StockMovement (parallels how
          // create_stock_lot_from_purchase records the PURCHASE_IN).
          stockMovementId: movement.id,
          movementType: "PURCHASE_RETURN_OUT",
          refundStatus: refundStatusOnConfirm,
          paymentStatusOnConfirm: ticket?.paymentStatus ?? null,
        }),
        ipAddress: meta?.ipAddress ?? null,
        userAgent: meta?.userAgent ?? null,
      },
    });

    return updated;
  });

  return toPurchaseReturnDTO(confirmed);
}

// ─── Core: cancel DRAFT (DRAFT → CANCELLED) ────────────────────────────────
//
// No stock side-effect — cancelling a draft just records the reason and
// flips the row to CANCELLED. CONFIRMED returns CANNOT be cancelled (the
// only fix is a counter-flow ADJUST_IN, intentionally manual).
//
// Permission: `purchase.return.cancel` (warehouse_staff and up). Branch
// scope still applies — a warehouse_staff at branch A cannot touch a
// draft at branch B.

export async function cancelPurchaseReturnDraft(
  actor: AuthenticatedUser,
  id: string,
  input: CancelPurchaseReturnInput,
  meta?: PurchaseReturnAuditMeta,
): Promise<PurchaseReturnDTO> {
  if (!hasPermission(actor, "purchase.return.cancel")) {
    throw new PurchaseReturnPermissionDeniedError();
  }

  const cancelled = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "PurchaseReturn" WHERE id = ${id}::uuid FOR UPDATE
    `;

    const draft = await tx.purchaseReturn.findUnique({
      where: { id },
      select: {
        id: true,
        branchId: true,
        status: true,
        isActive: true,
        returnNo: true,
      },
    });
    if (!draft || !draft.isActive) {
      throw new PurchaseReturnNotFoundError();
    }
    if (!isInBranchScope(actor, draft.branchId)) {
      throw new PurchaseReturnBranchMismatchError();
    }
    if (draft.status === "CONFIRMED") {
      throw new PurchaseReturnAlreadyConfirmedError();
    }
    if (draft.status === "CANCELLED") {
      throw new PurchaseReturnAlreadyCancelledError();
    }
    if (draft.status !== "DRAFT") {
      throw new PurchaseReturnNotDraftError();
    }

    const updated = await tx.purchaseReturn.update({
      where: { id: draft.id },
      data: {
        status: "CANCELLED",
        cancelledById: actor.id,
        cancelledAt: new Date(),
        cancelReason: input.reason,
      },
      select: purchaseReturnSelect,
    });

    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        branchId: draft.branchId,
        entityType: "PurchaseReturn",
        entityId: draft.id,
        action: "cancel_purchase_return",
        before: { status: "DRAFT" } as Prisma.InputJsonValue,
        after: {
          status: "CANCELLED",
          returnNo: draft.returnNo,
          cancelReason: input.reason,
        } as Prisma.InputJsonValue,
        metadata: buildAuditMetadata(meta, {
          returnNo: draft.returnNo,
        }),
        ipAddress: meta?.ipAddress ?? null,
        userAgent: meta?.userAgent ?? null,
      },
    });

    return updated;
  });

  return toPurchaseReturnDTO(cancelled);
}

// ─── Read: list ────────────────────────────────────────────────────────────

export const PURCHASE_RETURN_LIST_LIMIT_DEFAULT = 50;
export const PURCHASE_RETURN_LIST_LIMIT_MAX = 100;

export type ListPurchaseReturnsResult = {
  items: PurchaseReturnDTO[];
  nextCursor: string | null;
};

export async function listPurchaseReturns(
  actor: AuthenticatedUser,
  query: ListPurchaseReturnsQuery,
): Promise<ListPurchaseReturnsResult> {
  if (!hasPermission(actor, "purchase.return.read")) {
    throw new PurchaseReturnPermissionDeniedError();
  }

  const limit = Math.min(
    PURCHASE_RETURN_LIST_LIMIT_MAX,
    Math.max(1, query.limit ?? PURCHASE_RETURN_LIST_LIMIT_DEFAULT),
  );

  const where: Prisma.PurchaseReturnWhereInput = { isActive: true };

  if (query.status) where.status = query.status;
  if (query.ticketId) where.purchaseTicketId = query.ticketId;
  if (query.lotId) where.stockLotId = query.lotId;

  if (!actor.isSuperAdmin) {
    if (query.branchId && !actor.branchIds.includes(query.branchId)) {
      return { items: [], nextCursor: null };
    }
    where.branchId = query.branchId
      ? query.branchId
      : { in: [...actor.branchIds] };
  } else if (query.branchId) {
    where.branchId = query.branchId;
  }

  const rows = await prisma.purchaseReturn.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    select: purchaseReturnSelect,
  });

  const hasMore = rows.length > limit;
  const items = (hasMore ? rows.slice(0, -1) : rows).map(toPurchaseReturnDTO);
  const nextCursor = hasMore ? rows[rows.length - 2]!.id : null;
  return { items, nextCursor };
}

// ─── Read: detail ──────────────────────────────────────────────────────────

export async function getPurchaseReturnById(
  actor: AuthenticatedUser,
  id: string,
): Promise<PurchaseReturnDTO> {
  if (!hasPermission(actor, "purchase.return.read")) {
    throw new PurchaseReturnPermissionDeniedError();
  }

  const row = await prisma.purchaseReturn.findUnique({
    where: { id },
    select: purchaseReturnSelect,
  });
  if (!row || !row.isActive) {
    throw new PurchaseReturnNotFoundError();
  }
  if (!isInBranchScope(actor, row.branchId)) {
    throw new PurchaseReturnBranchMismatchError();
  }
  return toPurchaseReturnDTO(row);
}

// ─── Read helper: returns by ticket (for purchase detail history table) ───
//
// Doesn't enforce branch scope on the actor — caller has already done it
// (the purchase detail page only renders for tickets the actor can see).
// Returns ALL statuses sorted by createdAt desc.

export async function listPurchaseReturnsForTicket(
  actor: AuthenticatedUser,
  ticketId: string,
): Promise<PurchaseReturnDTO[]> {
  if (!hasPermission(actor, "purchase.return.read")) {
    return [];
  }
  const rows = await prisma.purchaseReturn.findMany({
    where: { purchaseTicketId: ticketId, isActive: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: purchaseReturnSelect,
  });
  const visible = rows.filter((r) => isInBranchScope(actor, r.branchId));
  return visible.map(toPurchaseReturnDTO);
}
