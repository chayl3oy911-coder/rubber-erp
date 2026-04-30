import "server-only";

import { Prisma, type StockLot } from "@prisma/client";

import type { AuthenticatedUser } from "@/shared/auth/types";
import { prisma } from "@/shared/lib/prisma";

import {
  toEligiblePurchaseDTO,
  toStockLotDTO,
  toStockMovementDTO,
  type EligiblePurchaseDTO,
  type StockLotDTO,
  type StockMovementDTO,
} from "./dto";
import { stockT } from "./i18n";
import {
  STOCK_LOT_PADDING,
  STOCK_LOT_PREFIX,
  STOCK_PAGE_SIZE_DEFAULT,
  STOCK_PAGE_SIZE_MAX,
  type AdjustStockInput,
  type CreateLotFromPurchaseInput,
} from "./schemas";
import {
  type StockAdjustmentDirection,
  type StockAdjustmentReason,
  type StockLotStatus,
  type StockMovementType,
} from "./types";

const t = stockT();

// ─── Custom errors ───────────────────────────────────────────────────────────

export class StockLotNotFoundError extends Error {
  constructor() {
    super(t.errors.notFound);
    this.name = "StockLotNotFoundError";
  }
}

export class StockBranchNotInScopeError extends Error {
  constructor() {
    super(t.errors.branchNotInScope);
    this.name = "StockBranchNotInScopeError";
  }
}

export class PurchaseTicketNotFoundForStockError extends Error {
  constructor() {
    super(t.errors.purchaseTicketNotFound);
    this.name = "PurchaseTicketNotFoundForStockError";
  }
}

export class PurchaseTicketBranchMismatchForStockError extends Error {
  constructor() {
    super(t.errors.purchaseTicketBranchMismatch);
    this.name = "PurchaseTicketBranchMismatchForStockError";
  }
}

export class PurchaseTicketNotApprovedError extends Error {
  constructor() {
    super(t.errors.purchaseTicketNotApproved);
    this.name = "PurchaseTicketNotApprovedError";
  }
}

export class PurchaseTicketInactiveError extends Error {
  constructor() {
    super(t.errors.purchaseTicketInactive);
    this.name = "PurchaseTicketInactiveError";
  }
}

export class StockLotAlreadyExistsError extends Error {
  constructor() {
    super(t.errors.stockLotAlreadyExists);
    this.name = "StockLotAlreadyExistsError";
  }
}

export class StockLotAutoGenError extends Error {
  constructor() {
    super(t.errors.autoGenFailed);
    this.name = "StockLotAutoGenError";
  }
}

export class InsufficientStockError extends Error {
  constructor() {
    super(t.errors.insufficientStock);
    this.name = "InsufficientStockError";
  }
}

export class CannotAdjustDepletedError extends Error {
  constructor() {
    super(t.errors.cannotAdjustDepleted);
    this.name = "CannotAdjustDepletedError";
  }
}

// ─── Audit helpers ───────────────────────────────────────────────────────────

export type StockAuditMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
  source?: "api" | "action";
};

function lotSnapshot(l: StockLot): Prisma.InputJsonValue {
  return {
    branchId: l.branchId,
    sourcePurchaseTicketId: l.sourcePurchaseTicketId,
    lotNo: l.lotNo,
    rubberType: l.rubberType,
    initialWeight: l.initialWeight.toString(),
    remainingWeight: l.remainingWeight.toString(),
    costAmount: l.costAmount.toString(),
    effectiveCostPerKg: l.effectiveCostPerKg.toString(),
    status: l.status,
    isActive: l.isActive,
    createdById: l.createdById,
  } as Prisma.InputJsonValue;
}

function buildAuditMetadata(
  meta?: StockAuditMeta,
  extra?: Record<string, unknown>,
): Prisma.InputJsonValue {
  return {
    source: meta?.source ?? "api",
    ...(extra ?? {}),
  } as Prisma.InputJsonValue;
}

const STOCK_LOT_INCLUDE = {
  branch: { select: { id: true, code: true, name: true } },
  createdBy: { select: { id: true, displayName: true } },
  sourcePurchaseTicket: {
    select: {
      id: true,
      ticketNo: true,
      netWeight: true,
      totalAmount: true,
      status: true,
      isActive: true,
      customer: { select: { id: true, code: true, fullName: true } },
    },
  },
} as const;

const MOVEMENT_INCLUDE = {
  createdBy: { select: { id: true, displayName: true } },
} as const;

// ─── Cost computation ────────────────────────────────────────────────────────
//
// Rounding is HALF_UP @ 4 dp on the rate so adjustments don't lose pennies.
// `costAmount` itself never changes after lot creation — that's the whole
// point of the lot-based model.

function computeEffectiveCostPerKg(
  costAmount: Prisma.Decimal,
  remainingWeight: Prisma.Decimal,
): Prisma.Decimal {
  if (remainingWeight.lte(0)) {
    // Caller is responsible for keeping the previous value when depleted —
    // see `adjustStock` below.
    return new Prisma.Decimal(0);
  }
  return costAmount
    .div(remainingWeight)
    .toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
}

// ─── Scope helper ────────────────────────────────────────────────────────────

function ensureBranchInScope(
  actor: AuthenticatedUser,
  branchId: string,
): void {
  if (actor.isSuperAdmin) return;
  if (!actor.branchIds.includes(branchId)) {
    throw new StockBranchNotInScopeError();
  }
}

// ─── Auto-generate lotNo ─────────────────────────────────────────────────────

async function generateNextLotNo(
  tx: Prisma.TransactionClient,
  branchId: string,
): Promise<string> {
  const rows = await tx.$queryRaw<Array<{ maxNum: number | null }>>`
    SELECT MAX(CAST(SUBSTRING("lotNo" FROM 4) AS INTEGER)) AS "maxNum"
    FROM "StockLot"
    WHERE "branchId" = ${branchId}::uuid
      AND "lotNo" ~ '^LOT[0-9]{1,9}$'
  `;
  const maxNum = rows[0]?.maxNum ?? 0;
  const next = (typeof maxNum === "number" ? maxNum : 0) + 1;
  return `${STOCK_LOT_PREFIX}${String(next).padStart(STOCK_LOT_PADDING, "0")}`;
}

const CREATE_RETRY_LIMIT = 5;

// ─── List ────────────────────────────────────────────────────────────────────

export type ListStockLotsOptions = {
  q?: string;
  branchId?: string;
  rubberType?: string;
  status?: ReadonlyArray<StockLotStatus>;
  includeInactive?: boolean;
  page?: number;
  pageSize?: number;
};

export type ListStockLotsResult = {
  lots: StockLotDTO[];
  total: number;
  page: number;
  pageSize: number;
};

export async function listStockLots(
  actor: AuthenticatedUser,
  opts: ListStockLotsOptions = {},
): Promise<ListStockLotsResult> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(
    STOCK_PAGE_SIZE_MAX,
    Math.max(1, opts.pageSize ?? STOCK_PAGE_SIZE_DEFAULT),
  );

  const where: Prisma.StockLotWhereInput = {};

  if (!opts.includeInactive) {
    where.isActive = true;
  }

  if (!actor.isSuperAdmin) {
    if (opts.branchId && !actor.branchIds.includes(opts.branchId)) {
      return { lots: [], total: 0, page, pageSize };
    }
    where.branchId = opts.branchId
      ? opts.branchId
      : { in: [...actor.branchIds] };
  } else if (opts.branchId) {
    where.branchId = opts.branchId;
  }

  if (opts.rubberType) {
    where.rubberType = opts.rubberType;
  }

  if (opts.status && opts.status.length > 0) {
    where.status = { in: [...opts.status] };
  }

  if (opts.q) {
    const q = opts.q.trim();
    if (q.length > 0) {
      where.OR = [
        { lotNo: { contains: q, mode: "insensitive" } },
        {
          sourcePurchaseTicket: {
            is: {
              OR: [
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
              ],
            },
          },
        },
      ];
    }
  }

  const [rows, total] = await Promise.all([
    prisma.stockLot.findMany({
      where,
      include: STOCK_LOT_INCLUDE,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.stockLot.count({ where }),
  ]);

  return {
    lots: rows.map(toStockLotDTO),
    total,
    page,
    pageSize,
  };
}

// ─── Get one ─────────────────────────────────────────────────────────────────

export async function getStockLot(
  actor: AuthenticatedUser,
  id: string,
): Promise<StockLotDTO | null> {
  const lot = await prisma.stockLot.findUnique({
    where: { id },
    include: STOCK_LOT_INCLUDE,
  });
  if (!lot) return null;
  if (!actor.isSuperAdmin && !actor.branchIds.includes(lot.branchId)) {
    // 404 instead of 403 so we don't leak existence across branches.
    return null;
  }
  return toStockLotDTO(lot);
}

// ─── Movements ───────────────────────────────────────────────────────────────

export type ListMovementsResult = {
  movements: StockMovementDTO[];
  total: number;
  page: number;
  pageSize: number;
  lotBranchId: string;
};

export async function listMovementsForLot(
  actor: AuthenticatedUser,
  stockLotId: string,
  opts: { page?: number; pageSize?: number } = {},
): Promise<ListMovementsResult | null> {
  const lot = await prisma.stockLot.findUnique({
    where: { id: stockLotId },
    select: { id: true, branchId: true },
  });
  if (!lot) return null;
  if (!actor.isSuperAdmin && !actor.branchIds.includes(lot.branchId)) {
    return null;
  }

  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(
    STOCK_PAGE_SIZE_MAX,
    Math.max(1, opts.pageSize ?? STOCK_PAGE_SIZE_DEFAULT),
  );

  const where: Prisma.StockMovementWhereInput = { stockLotId };

  const [rows, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: MOVEMENT_INCLUDE,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return {
    movements: rows.map(toStockMovementDTO),
    total,
    page,
    pageSize,
    lotBranchId: lot.branchId,
  };
}

// ─── Eligible purchases (for "receive from purchase" UI) ────────────────────

export type ListEligiblePurchasesOptions = {
  q?: string;
  branchId?: string;
  page?: number;
  pageSize?: number;
};

export type ListEligiblePurchasesResult = {
  tickets: EligiblePurchaseDTO[];
  total: number;
  page: number;
  pageSize: number;
};

export async function listEligiblePurchases(
  actor: AuthenticatedUser,
  opts: ListEligiblePurchasesOptions = {},
): Promise<ListEligiblePurchasesResult> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(
    STOCK_PAGE_SIZE_MAX,
    Math.max(1, opts.pageSize ?? STOCK_PAGE_SIZE_DEFAULT),
  );

  const where: Prisma.PurchaseTicketWhereInput = {
    status: "APPROVED",
    isActive: true,
    stockLot: { is: null },
  };

  if (!actor.isSuperAdmin) {
    if (opts.branchId && !actor.branchIds.includes(opts.branchId)) {
      return { tickets: [], total: 0, page, pageSize };
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
      select: {
        id: true,
        branchId: true,
        ticketNo: true,
        netWeight: true,
        totalAmount: true,
        pricePerKg: true,
        createdAt: true,
        branch: { select: { id: true, code: true, name: true } },
        customer: { select: { id: true, code: true, fullName: true } },
      },
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.purchaseTicket.count({ where }),
  ]);

  return {
    tickets: rows.map(toEligiblePurchaseDTO),
    total,
    page,
    pageSize,
  };
}

// ─── Create lot from purchase ────────────────────────────────────────────────

export async function createLotFromPurchase(
  actor: AuthenticatedUser,
  input: CreateLotFromPurchaseInput,
  meta?: StockAuditMeta,
): Promise<StockLotDTO> {
  const ticket = await prisma.purchaseTicket.findUnique({
    where: { id: input.purchaseTicketId },
    select: {
      id: true,
      branchId: true,
      status: true,
      isActive: true,
      rubberType: true,
      netWeight: true,
      totalAmount: true,
      stockLot: { select: { id: true } },
    },
  });
  if (!ticket) throw new PurchaseTicketNotFoundForStockError();
  if (!actor.isSuperAdmin && !actor.branchIds.includes(ticket.branchId)) {
    throw new PurchaseTicketBranchMismatchForStockError();
  }
  if (!ticket.isActive) throw new PurchaseTicketInactiveError();
  if (ticket.status !== "APPROVED") throw new PurchaseTicketNotApprovedError();
  if (ticket.stockLot) throw new StockLotAlreadyExistsError();

  const initialWeight = new Prisma.Decimal(ticket.netWeight);
  const costAmount = new Prisma.Decimal(ticket.totalAmount);
  const effectiveCostPerKg = computeEffectiveCostPerKg(costAmount, initialWeight);

  for (let attempt = 0; attempt < CREATE_RETRY_LIMIT; attempt++) {
    try {
      const created = await prisma.$transaction(async (tx) => {
        const lotNo = await generateNextLotNo(tx, ticket.branchId);
        const lot = await tx.stockLot.create({
          data: {
            branchId: ticket.branchId,
            sourcePurchaseTicketId: ticket.id,
            lotNo,
            rubberType: ticket.rubberType,
            initialWeight,
            remainingWeight: initialWeight,
            costAmount,
            effectiveCostPerKg,
            status: "ACTIVE",
            createdById: actor.id,
          },
          include: STOCK_LOT_INCLUDE,
        });

        const movement = await tx.stockMovement.create({
          data: {
            branchId: lot.branchId,
            stockLotId: lot.id,
            movementType: "PURCHASE_IN",
            quantity: initialWeight,
            beforeWeight: new Prisma.Decimal(0),
            afterWeight: initialWeight,
            reasonType: null,
            referenceType: "PurchaseTicket",
            referenceId: ticket.id,
            note: null,
            createdById: actor.id,
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            branchId: lot.branchId,
            entityType: "StockLot",
            entityId: lot.id,
            action: "create_stock_lot_from_purchase",
            before: Prisma.DbNull,
            after: {
              lot: lotSnapshot(lot),
              movement: {
                id: movement.id,
                movementType: "PURCHASE_IN",
                quantity: movement.quantity.toString(),
                beforeWeight: movement.beforeWeight.toString(),
                afterWeight: movement.afterWeight.toString(),
                referenceType: movement.referenceType,
                referenceId: movement.referenceId,
              },
            } as Prisma.InputJsonValue,
            metadata: buildAuditMetadata(meta, {
              purchaseTicketId: ticket.id,
              lotNo: lot.lotNo,
              initialWeight: initialWeight.toString(),
              costAmount: costAmount.toString(),
              effectiveCostPerKg: effectiveCostPerKg.toString(),
              movementId: movement.id,
              movementType: "PURCHASE_IN",
              autoGeneratedLotNo: true,
            }),
            ipAddress: meta?.ipAddress ?? null,
            userAgent: meta?.userAgent ?? null,
          },
        });

        return lot;
      });
      return toStockLotDTO(created);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const target = (error.meta?.target ?? []) as string[] | string;
        const targetStr = Array.isArray(target) ? target.join(",") : String(target);
        // Two distinct unique violations to disambiguate:
        //   - sourcePurchaseTicketId  → another request beat us to it (409)
        //   - branchId+lotNo          → lotNo race; retry with a fresh MAX
        if (targetStr.includes("sourcePurchaseTicketId")) {
          throw new StockLotAlreadyExistsError();
        }
        // lotNo race — retry
        continue;
      }
      throw error;
    }
  }

  throw new StockLotAutoGenError();
}

// ─── Adjust stock (ADJUST_IN / ADJUST_OUT) ───────────────────────────────────

export async function adjustStock(
  actor: AuthenticatedUser,
  input: AdjustStockInput,
  meta?: StockAuditMeta,
): Promise<StockLotDTO> {
  // Branch-scope check uses an upfront read; we re-read inside the
  // transaction with a row-level lock to defeat concurrent updates.
  const head = await prisma.stockLot.findUnique({
    where: { id: input.stockLotId },
    select: { id: true, branchId: true },
  });
  if (!head) throw new StockLotNotFoundError();
  ensureBranchInScope(actor, head.branchId);

  const result = await prisma.$transaction(async (tx) => {
    // Postgres row-level lock — guards against two concurrent adjustments
    // both seeing the same `remainingWeight` and double-debiting.
    await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "StockLot" WHERE id = ${input.stockLotId}::uuid FOR UPDATE
    `;

    const existing = await tx.stockLot.findUnique({
      where: { id: input.stockLotId },
    });
    if (!existing) throw new StockLotNotFoundError();

    // `direction` is already narrowed to `StockAdjustmentDirection`
    // ("ADJUST_IN" | "ADJUST_OUT") by Zod — see `directionField` in
    // `./schemas.ts`. The assignment to `StockMovementType` is safe by
    // structural subtyping (StockAdjustmentDirection ⊂ StockMovementType).
    const direction: StockAdjustmentDirection = input.adjustmentType;
    const movementType: StockMovementType = direction;
    const reasonType: StockAdjustmentReason = input.reasonType;

    const before = existing.remainingWeight;
    const qty = new Prisma.Decimal(input.quantity).toDecimalPlaces(
      2,
      Prisma.Decimal.ROUND_HALF_UP,
    );

    let after: Prisma.Decimal;
    if (direction === "ADJUST_OUT") {
      if (before.lte(0)) {
        // Lot already depleted — refuse to remove more weight.
        throw new CannotAdjustDepletedError();
      }
      if (qty.gt(before)) {
        throw new InsufficientStockError();
      }
      after = before.minus(qty).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    } else {
      after = before.plus(qty).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    }

    // Cost rules:
    //   - costAmount NEVER changes from the inbound value.
    //   - effectiveCostPerKg recomputed from costAmount / after — UNLESS
    //     after === 0 (depleted), in which case we keep the previous rate
    //     so the final per-kg cost is preserved for downstream reports.
    const newEffective = after.lte(0)
      ? existing.effectiveCostPerKg
      : computeEffectiveCostPerKg(existing.costAmount, after);

    const newStatus: StockLotStatus = after.lte(0)
      ? "DEPLETED"
      : existing.status === "CANCELLED"
        ? "CANCELLED"
        : "ACTIVE";

    const changedFields: string[] = ["remainingWeight"];
    if (!newEffective.eq(existing.effectiveCostPerKg)) {
      changedFields.push("effectiveCostPerKg");
    }
    if (newStatus !== existing.status) {
      changedFields.push("status");
    }

    const lot = await tx.stockLot.update({
      where: { id: existing.id },
      data: {
        remainingWeight: after,
        effectiveCostPerKg: newEffective,
        status: newStatus,
      },
      include: STOCK_LOT_INCLUDE,
    });

    const movement = await tx.stockMovement.create({
      data: {
        branchId: lot.branchId,
        stockLotId: lot.id,
        movementType,
        quantity: qty,
        beforeWeight: before,
        afterWeight: after,
        reasonType,
        referenceType: null,
        referenceId: null,
        note: input.note,
        createdById: actor.id,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        branchId: lot.branchId,
        entityType: "StockLot",
        entityId: lot.id,
        action:
          direction === "ADJUST_IN" ? "adjustment_in" : "adjustment_out",
        before: lotSnapshot(existing),
        after: lotSnapshot(lot),
        metadata: buildAuditMetadata(meta, {
          stockLotId: lot.id,
          movementType,
          reasonType,
          quantity: qty.toString(),
          beforeWeight: before.toString(),
          afterWeight: after.toString(),
          costAmount: existing.costAmount.toString(),
          effectiveCostPerKgBefore: existing.effectiveCostPerKg.toString(),
          effectiveCostPerKgAfter: newEffective.toString(),
          changedFields,
          movementId: movement.id,
          note: input.note,
        }),
        ipAddress: meta?.ipAddress ?? null,
        userAgent: meta?.userAgent ?? null,
      },
    });

    return lot;
  });

  return toStockLotDTO(result);
}
