import "server-only";

import { Prisma, type SalesOrder, type StockLot } from "@prisma/client";

import { recordNotificationEvent } from "@/modules/notifications/events";
import { toStockMovementDTO, type StockMovementDTO } from "@/modules/stock/dto";
import { hasPermission } from "@/shared/auth/dal";
import type { AuthenticatedUser } from "@/shared/auth/types";
import { prisma } from "@/shared/lib/prisma";

import {
  toEligibleLotForSaleDTO,
  toSalesOrderDTO,
  type EligibleLotForSaleDTO,
  type SalesOrderDTO,
} from "./dto";
import { salesT } from "./i18n";
import {
  SALES_NO_PADDING,
  SALES_NO_PREFIX,
  SALES_PAGE_SIZE_DEFAULT,
  SALES_PAGE_SIZE_MAX,
  type CreateSalesInput,
  type UpdateSalesFieldsInput,
} from "./schemas";
import {
  planSalesTransition,
  type SaleType,
  type SalesOrderStatus,
} from "./types";

const t = salesT();

// ─── Custom errors ──────────────────────────────────────────────────────────

export class SalesNotFoundError extends Error {
  constructor() {
    super(t.errors.notFound);
    this.name = "SalesNotFoundError";
  }
}

export class SalesBranchNotInScopeError extends Error {
  constructor() {
    super(t.errors.branchNotInScope);
    this.name = "SalesBranchNotInScopeError";
  }
}

export class SalesStockLotNotFoundError extends Error {
  constructor() {
    super(t.errors.stockLotNotFound);
    this.name = "SalesStockLotNotFoundError";
  }
}

export class SalesStockLotBranchMismatchError extends Error {
  constructor() {
    super(t.errors.stockLotBranchMismatch);
    this.name = "SalesStockLotBranchMismatchError";
  }
}

export class SalesStockLotNotActiveError extends Error {
  constructor() {
    super(t.errors.stockLotNotActive);
    this.name = "SalesStockLotNotActiveError";
  }
}

export class SalesStockLotInactiveError extends Error {
  constructor() {
    super(t.errors.stockLotInactive);
    this.name = "SalesStockLotInactiveError";
  }
}

export class SalesInsufficientStockError extends Error {
  constructor() {
    super(t.errors.insufficientStock);
    this.name = "SalesInsufficientStockError";
  }
}

export class SalesAutoGenError extends Error {
  constructor() {
    super(t.errors.autoGenFailed);
    this.name = "SalesAutoGenError";
  }
}

export class SalesStatusTransitionError extends Error {
  constructor(from: string, to: string) {
    super(t.errors.statusTransitionForbidden(from, to));
    this.name = "SalesStatusTransitionError";
  }
}

export class SalesCancelReasonRequiredError extends Error {
  constructor() {
    super(t.errors.cancelReasonRequired);
    this.name = "SalesCancelReasonRequiredError";
  }
}

export class SalesStatusFieldsLockedError extends Error {
  field: string;
  constructor(field: string) {
    super(t.errors.statusFieldsLocked);
    this.name = "SalesStatusFieldsLockedError";
    this.field = field;
  }
}

// ─── Audit helpers ───────────────────────────────────────────────────────────

export type SalesAuditMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
  source?: "api" | "action";
};

function salesSnapshot(s: SalesOrder): Prisma.InputJsonValue {
  return {
    branchId: s.branchId,
    stockLotId: s.stockLotId,
    salesNo: s.salesNo,
    buyerName: s.buyerName,
    saleType: s.saleType,
    rubberType: s.rubberType,
    grossWeight: s.grossWeight.toString(),
    drcPercent: s.drcPercent.toString(),
    drcWeight: s.drcWeight.toString(),
    pricePerKg: s.pricePerKg.toString(),
    grossAmount: s.grossAmount.toString(),
    withholdingTaxPercent: s.withholdingTaxPercent.toString(),
    withholdingTaxAmount: s.withholdingTaxAmount.toString(),
    netReceivableAmount: s.netReceivableAmount.toString(),
    costAmount: s.costAmount.toString(),
    profitAmount: s.profitAmount.toString(),
    status: s.status,
    expectedReceiveDate: s.expectedReceiveDate
      ? s.expectedReceiveDate.toISOString()
      : null,
    receivedAt: s.receivedAt ? s.receivedAt.toISOString() : null,
    note: s.note,
    isActive: s.isActive,
    createdById: s.createdById,
    confirmedById: s.confirmedById,
    cancelledById: s.cancelledById,
  } as Prisma.InputJsonValue;
}

function buildAuditMetadata(
  meta: SalesAuditMeta | undefined,
  extra: Record<string, unknown>,
): Prisma.InputJsonValue {
  return {
    source: meta?.source ?? "api",
    ...extra,
  } as Prisma.InputJsonValue;
}

const SALES_INCLUDE = {
  branch: { select: { id: true, code: true, name: true } },
  createdBy: { select: { id: true, displayName: true } },
  confirmedBy: { select: { id: true, displayName: true } },
  cancelledBy: { select: { id: true, displayName: true } },
  stockLot: {
    select: {
      id: true,
      lotNo: true,
      rubberType: true,
      remainingWeight: true,
      effectiveCostPerKg: true,
      status: true,
      isActive: true,
      sourcePurchaseTicket: {
        select: { id: true, ticketNo: true },
      },
    },
  },
} as const;

const MOVEMENT_INCLUDE = {
  createdBy: { select: { id: true, displayName: true } },
} as const;

// ─── Calculation core ───────────────────────────────────────────────────────
//
// All arithmetic in `Prisma.Decimal`. Rounding is HALF_UP at the documented
// decimal places. Service is the SOLE source of truth — UI preview is for
// UX only and must never be trusted by the API.

type ComputedSalesAmounts = {
  drcWeight: Prisma.Decimal;
  grossAmount: Prisma.Decimal;
  withholdingTaxAmount: Prisma.Decimal;
  netReceivableAmount: Prisma.Decimal;
};

function computeSalesAmounts(
  grossWeight: Prisma.Decimal,
  drcPercent: Prisma.Decimal,
  pricePerKg: Prisma.Decimal,
  withholdingTaxPercent: Prisma.Decimal,
): ComputedSalesAmounts {
  const drcWeight = grossWeight
    .mul(drcPercent)
    .div(100)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  const grossAmount = drcWeight
    .mul(pricePerKg)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  const withholdingTaxAmount = grossAmount
    .mul(withholdingTaxPercent)
    .div(100)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  const netReceivableAmount = grossAmount
    .minus(withholdingTaxAmount)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  return {
    drcWeight,
    grossAmount,
    withholdingTaxAmount,
    netReceivableAmount,
  };
}

type ComputedCost = {
  costAmount: Prisma.Decimal;
  profitAmount: Prisma.Decimal;
};

function computeCostAndProfit(
  grossWeight: Prisma.Decimal,
  costPerKg: Prisma.Decimal,
  grossAmount: Prisma.Decimal,
): ComputedCost {
  const costAmount = grossWeight
    .mul(costPerKg)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  const profitAmount = grossAmount
    .minus(costAmount)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  return { costAmount, profitAmount };
}

// Mirror StockLot's recompute logic so cancel-reverse keeps the same math.
function computeEffectiveCostPerKg(
  costAmount: Prisma.Decimal,
  remainingWeight: Prisma.Decimal,
): Prisma.Decimal {
  if (remainingWeight.lte(0)) {
    return new Prisma.Decimal(0);
  }
  return costAmount
    .div(remainingWeight)
    .toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
}

// ─── Scope helpers ───────────────────────────────────────────────────────────

function ensureBranchInScope(
  actor: AuthenticatedUser,
  branchId: string,
): void {
  if (actor.isSuperAdmin) return;
  if (!actor.branchIds.includes(branchId)) {
    throw new SalesBranchNotInScopeError();
  }
}

// ─── Auto-generate salesNo ───────────────────────────────────────────────────

async function generateNextSalesNo(
  tx: Prisma.TransactionClient,
  branchId: string,
): Promise<string> {
  const rows = await tx.$queryRaw<Array<{ maxNum: number | null }>>`
    SELECT MAX(CAST(SUBSTRING("salesNo" FROM 4) AS INTEGER)) AS "maxNum"
    FROM "SalesOrder"
    WHERE "branchId" = ${branchId}::uuid
      AND "salesNo" ~ '^SAL[0-9]{1,9}$'
  `;
  const maxNum = rows[0]?.maxNum ?? 0;
  const next = (typeof maxNum === "number" ? maxNum : 0) + 1;
  return `${SALES_NO_PREFIX}${String(next).padStart(SALES_NO_PADDING, "0")}`;
}

const CREATE_RETRY_LIMIT = 5;

// ─── List ────────────────────────────────────────────────────────────────────

export type ListSalesOptions = {
  q?: string;
  branchId?: string;
  stockLotId?: string;
  status?: ReadonlyArray<SalesOrderStatus>;
  saleType?: ReadonlyArray<SaleType>;
  dateFrom?: string;
  dateTo?: string;
  includeInactive?: boolean;
  page?: number;
  pageSize?: number;
};

export type ListSalesResult = {
  sales: SalesOrderDTO[];
  total: number;
  page: number;
  pageSize: number;
};

export async function listSalesOrders(
  actor: AuthenticatedUser,
  opts: ListSalesOptions = {},
): Promise<ListSalesResult> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(
    SALES_PAGE_SIZE_MAX,
    Math.max(1, opts.pageSize ?? SALES_PAGE_SIZE_DEFAULT),
  );

  const where: Prisma.SalesOrderWhereInput = {};

  if (!opts.includeInactive) {
    where.isActive = true;
  }

  if (!actor.isSuperAdmin) {
    if (opts.branchId && !actor.branchIds.includes(opts.branchId)) {
      return { sales: [], total: 0, page, pageSize };
    }
    where.branchId = opts.branchId
      ? opts.branchId
      : { in: [...actor.branchIds] };
  } else if (opts.branchId) {
    where.branchId = opts.branchId;
  }

  if (opts.stockLotId) {
    where.stockLotId = opts.stockLotId;
  }
  if (opts.status && opts.status.length > 0) {
    where.status = { in: [...opts.status] };
  }
  if (opts.saleType && opts.saleType.length > 0) {
    where.saleType = { in: [...opts.saleType] };
  }
  if (opts.dateFrom || opts.dateTo) {
    where.createdAt = {};
    if (opts.dateFrom) where.createdAt.gte = new Date(opts.dateFrom);
    if (opts.dateTo) {
      // dateTo is inclusive end-of-day for UX simplicity.
      const end = new Date(opts.dateTo);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  if (opts.q) {
    const q = opts.q.trim();
    if (q.length > 0) {
      where.OR = [
        { salesNo: { contains: q, mode: "insensitive" } },
        { buyerName: { contains: q, mode: "insensitive" } },
        {
          stockLot: {
            is: { lotNo: { contains: q, mode: "insensitive" } },
          },
        },
      ];
    }
  }

  const [rows, total] = await Promise.all([
    prisma.salesOrder.findMany({
      where,
      include: SALES_INCLUDE,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.salesOrder.count({ where }),
  ]);

  return {
    sales: rows.map(toSalesOrderDTO),
    total,
    page,
    pageSize,
  };
}

// ─── Get one ─────────────────────────────────────────────────────────────────

export async function getSalesOrder(
  actor: AuthenticatedUser,
  id: string,
): Promise<SalesOrderDTO | null> {
  const sale = await prisma.salesOrder.findUnique({
    where: { id },
    include: SALES_INCLUDE,
  });
  if (!sale) return null;
  if (!actor.isSuperAdmin && !actor.branchIds.includes(sale.branchId)) {
    return null; // 404, don't leak existence
  }
  return toSalesOrderDTO(sale);
}

// ─── Movements for a sale ───────────────────────────────────────────────────

export type ListSalesMovementsResult = {
  movements: StockMovementDTO[];
  total: number;
  page: number;
  pageSize: number;
};

export async function listMovementsForSale(
  actor: AuthenticatedUser,
  salesOrderId: string,
  opts: { page?: number; pageSize?: number } = {},
): Promise<ListSalesMovementsResult | null> {
  const sale = await prisma.salesOrder.findUnique({
    where: { id: salesOrderId },
    select: { id: true, branchId: true },
  });
  if (!sale) return null;
  if (!actor.isSuperAdmin && !actor.branchIds.includes(sale.branchId)) {
    return null;
  }

  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(
    SALES_PAGE_SIZE_MAX,
    Math.max(1, opts.pageSize ?? SALES_PAGE_SIZE_DEFAULT),
  );

  const where: Prisma.StockMovementWhereInput = {
    referenceType: "SalesOrder",
    referenceId: salesOrderId,
  };

  const [rows, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: MOVEMENT_INCLUDE,
      orderBy: [{ createdAt: "asc" }],
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
  };
}

// ─── Eligible lots for /sales/new picker ────────────────────────────────────

export type ListEligibleLotsForSaleOptions = {
  q?: string;
  branchId?: string;
  limit?: number;
};

export async function listEligibleLotsForSale(
  actor: AuthenticatedUser,
  opts: ListEligibleLotsForSaleOptions = {},
): Promise<EligibleLotForSaleDTO[]> {
  const limit = Math.min(200, Math.max(1, opts.limit ?? 100));

  const where: Prisma.StockLotWhereInput = {
    isActive: true,
    status: "ACTIVE",
    remainingWeight: { gt: 0 },
  };

  if (!actor.isSuperAdmin) {
    if (opts.branchId && !actor.branchIds.includes(opts.branchId)) {
      return [];
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
        { lotNo: { contains: q, mode: "insensitive" } },
        {
          sourcePurchaseTicket: {
            is: { ticketNo: { contains: q, mode: "insensitive" } },
          },
        },
      ];
    }
  }

  const lots = await prisma.stockLot.findMany({
    where,
    select: {
      id: true,
      branchId: true,
      lotNo: true,
      rubberType: true,
      remainingWeight: true,
      effectiveCostPerKg: true,
      branch: { select: { id: true, code: true, name: true } },
      sourcePurchaseTicket: { select: { id: true, ticketNo: true } },
    },
    orderBy: [{ createdAt: "desc" }],
    take: limit,
  });

  return lots.map(toEligibleLotForSaleDTO);
}

// ─── Create (DRAFT) ──────────────────────────────────────────────────────────

export async function createSalesOrder(
  actor: AuthenticatedUser,
  input: CreateSalesInput,
  meta?: SalesAuditMeta,
): Promise<SalesOrderDTO> {
  ensureBranchInScope(actor, input.branchId);

  const lot = await prisma.stockLot.findUnique({
    where: { id: input.stockLotId },
    select: {
      id: true,
      branchId: true,
      rubberType: true,
      remainingWeight: true,
      effectiveCostPerKg: true,
      status: true,
      isActive: true,
    },
  });
  if (!lot) throw new SalesStockLotNotFoundError();
  if (lot.branchId !== input.branchId) {
    throw new SalesStockLotBranchMismatchError();
  }
  if (!actor.isSuperAdmin && !actor.branchIds.includes(lot.branchId)) {
    throw new SalesStockLotBranchMismatchError();
  }
  if (!lot.isActive) throw new SalesStockLotInactiveError();
  if (lot.status !== "ACTIVE") throw new SalesStockLotNotActiveError();

  const grossWeight = new Prisma.Decimal(input.grossWeight);
  const drcPercent = new Prisma.Decimal(input.drcPercent);
  const pricePerKg = new Prisma.Decimal(input.pricePerKg);
  const withholdingTaxPercent = new Prisma.Decimal(
    input.withholdingTaxPercent ?? 0,
  );

  if (grossWeight.gt(lot.remainingWeight)) {
    throw new SalesInsufficientStockError();
  }

  const amounts = computeSalesAmounts(
    grossWeight,
    drcPercent,
    pricePerKg,
    withholdingTaxPercent,
  );
  const cost = computeCostAndProfit(
    grossWeight,
    new Prisma.Decimal(lot.effectiveCostPerKg),
    amounts.grossAmount,
  );

  for (let attempt = 0; attempt < CREATE_RETRY_LIMIT; attempt++) {
    try {
      const created = await prisma.$transaction(async (tx) => {
        const salesNo = await generateNextSalesNo(tx, input.branchId);
        const sale = await tx.salesOrder.create({
          data: {
            branchId: input.branchId,
            stockLotId: lot.id,
            salesNo,
            buyerName: input.buyerName,
            saleType: input.saleType,
            rubberType: lot.rubberType,
            grossWeight,
            drcPercent,
            drcWeight: amounts.drcWeight,
            pricePerKg,
            grossAmount: amounts.grossAmount,
            withholdingTaxPercent,
            withholdingTaxAmount: amounts.withholdingTaxAmount,
            netReceivableAmount: amounts.netReceivableAmount,
            costAmount: cost.costAmount,
            profitAmount: cost.profitAmount,
            status: "DRAFT",
            expectedReceiveDate: input.expectedReceiveDate ?? null,
            note: input.note ?? null,
            createdById: actor.id,
          },
          include: SALES_INCLUDE,
        });

        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            branchId: sale.branchId,
            entityType: "SalesOrder",
            entityId: sale.id,
            action: "create_sales_order",
            before: Prisma.DbNull,
            after: salesSnapshot(sale),
            metadata: buildAuditMetadata(meta, {
              salesNo: sale.salesNo,
              saleType: sale.saleType,
              stockLotId: sale.stockLotId,
              rubberType: sale.rubberType,
              grossWeight: sale.grossWeight.toString(),
              drcPercent: sale.drcPercent.toString(),
              drcWeight: sale.drcWeight.toString(),
              pricePerKg: sale.pricePerKg.toString(),
              grossAmount: sale.grossAmount.toString(),
              withholdingTaxPercent: sale.withholdingTaxPercent.toString(),
              withholdingTaxAmount: sale.withholdingTaxAmount.toString(),
              netReceivableAmount: sale.netReceivableAmount.toString(),
              costPerKg: lot.effectiveCostPerKg.toString(),
              costAmount: sale.costAmount.toString(),
              profitAmount: sale.profitAmount.toString(),
              autoGeneratedSalesNo: true,
            }),
            ipAddress: meta?.ipAddress ?? null,
            userAgent: meta?.userAgent ?? null,
          },
        });

        return sale;
      });

      // Notification hook AFTER tx commit, swallow errors.
      try {
        await recordNotificationEvent("sales.created", {
          salesOrderId: created.id,
          salesNo: created.salesNo,
          branchId: created.branchId,
        });
      } catch {
        /* noop — see notifications/events.ts contract */
      }

      return toSalesOrderDTO(created);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        // Per-branch salesNo race — retry with fresh MAX.
        continue;
      }
      throw error;
    }
  }

  throw new SalesAutoGenError();
}

// ─── Update fields (DRAFT only) ──────────────────────────────────────────────

export async function updateSalesOrderFields(
  actor: AuthenticatedUser,
  id: string,
  input: UpdateSalesFieldsInput,
  meta?: SalesAuditMeta,
): Promise<SalesOrderDTO> {
  const existing = await prisma.salesOrder.findUnique({
    where: { id },
    include: SALES_INCLUDE,
  });
  if (!existing) throw new SalesNotFoundError();
  if (!actor.isSuperAdmin && !actor.branchIds.includes(existing.branchId)) {
    throw new SalesNotFoundError();
  }
  if (!existing.stockLot) {
    // Should not happen — relation is required — but defensive.
    throw new SalesStockLotNotFoundError();
  }

  // Editability matrix: in DRAFT all fields are editable; in CONFIRMED only
  // `note` (lock everything else); in CANCELLED nothing.
  const status = existing.status as SalesOrderStatus;
  if (status === "CANCELLED") {
    throw new SalesStatusFieldsLockedError("status");
  }

  const lockedKeys: Array<keyof UpdateSalesFieldsInput> =
    status === "CONFIRMED"
      ? [
          "buyerName",
          "saleType",
          "grossWeight",
          "drcPercent",
          "pricePerKg",
          "withholdingTaxPercent",
          "expectedReceiveDate",
        ]
      : [];
  for (const k of lockedKeys) {
    if (input[k] !== undefined) {
      throw new SalesStatusFieldsLockedError(String(k));
    }
  }

  // Derive effective values: incoming OR existing.
  const buyerName = input.buyerName ?? existing.buyerName;
  const saleType = (input.saleType ?? existing.saleType) as SaleType;
  const grossWeight = new Prisma.Decimal(
    input.grossWeight ?? existing.grossWeight,
  );
  const drcPercent = new Prisma.Decimal(
    input.drcPercent ?? existing.drcPercent,
  );
  const pricePerKg = new Prisma.Decimal(
    input.pricePerKg ?? existing.pricePerKg,
  );
  const withholdingTaxPercent = new Prisma.Decimal(
    input.withholdingTaxPercent ?? existing.withholdingTaxPercent,
  );
  const expectedReceiveDate =
    input.expectedReceiveDate !== undefined
      ? input.expectedReceiveDate
      : existing.expectedReceiveDate;
  const note = input.note !== undefined ? input.note ?? null : existing.note;

  // For DRAFT only: re-validate gross vs lot.remainingWeight (lot may have
  // been adjusted since draft was created; we do NOT block hard since the
  // confirm step will re-validate inside a tx — but we surface a friendly
  // error here so the user knows now).
  if (status === "DRAFT") {
    if (grossWeight.gt(existing.stockLot.remainingWeight)) {
      throw new SalesInsufficientStockError();
    }
  }

  // Recompute amounts for DRAFT (CONFIRMED only allows note → no recompute).
  let amounts = {
    drcWeight: new Prisma.Decimal(existing.drcWeight),
    grossAmount: new Prisma.Decimal(existing.grossAmount),
    withholdingTaxAmount: new Prisma.Decimal(existing.withholdingTaxAmount),
    netReceivableAmount: new Prisma.Decimal(existing.netReceivableAmount),
  };
  let cost = {
    costAmount: new Prisma.Decimal(existing.costAmount),
    profitAmount: new Prisma.Decimal(existing.profitAmount),
  };
  if (status === "DRAFT") {
    amounts = computeSalesAmounts(
      grossWeight,
      drcPercent,
      pricePerKg,
      withholdingTaxPercent,
    );
    cost = computeCostAndProfit(
      grossWeight,
      new Prisma.Decimal(existing.stockLot.effectiveCostPerKg),
      amounts.grossAmount,
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const sale = await tx.salesOrder.update({
      where: { id: existing.id },
      data: {
        buyerName,
        saleType,
        grossWeight,
        drcPercent,
        drcWeight: amounts.drcWeight,
        pricePerKg,
        grossAmount: amounts.grossAmount,
        withholdingTaxPercent,
        withholdingTaxAmount: amounts.withholdingTaxAmount,
        netReceivableAmount: amounts.netReceivableAmount,
        costAmount: cost.costAmount,
        profitAmount: cost.profitAmount,
        expectedReceiveDate,
        note,
      },
      include: SALES_INCLUDE,
    });

    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        branchId: sale.branchId,
        entityType: "SalesOrder",
        entityId: sale.id,
        action: "update_sales_order",
        before: salesSnapshot(existing),
        after: salesSnapshot(sale),
        metadata: buildAuditMetadata(meta, {
          salesNo: sale.salesNo,
          stockLotId: sale.stockLotId,
          changedFields: Object.keys(input),
        }),
        ipAddress: meta?.ipAddress ?? null,
        userAgent: meta?.userAgent ?? null,
      },
    });

    return sale;
  });

  return toSalesOrderDTO(updated);
}

// ─── Status transitions (confirm / cancel) ───────────────────────────────────

export async function transitionSalesStatus(
  actor: AuthenticatedUser,
  id: string,
  to: SalesOrderStatus,
  cancelReason: string | undefined,
  meta?: SalesAuditMeta,
): Promise<SalesOrderDTO> {
  const existing = await prisma.salesOrder.findUnique({
    where: { id },
    select: {
      id: true,
      branchId: true,
      stockLotId: true,
      status: true,
      isActive: true,
    },
  });
  if (!existing) throw new SalesNotFoundError();
  if (!actor.isSuperAdmin && !actor.branchIds.includes(existing.branchId)) {
    throw new SalesNotFoundError();
  }
  if (!existing.isActive) throw new SalesNotFoundError();

  const from = existing.status as SalesOrderStatus;
  const plan = planSalesTransition(from, to);
  if (!plan) {
    throw new SalesStatusTransitionError(from, to);
  }

  // Permission gate for the specific action — service-side (the API layer
  // also gates upfront for clearer 403s, but here is the source of truth).
  const requiredPermission =
    plan.action === "confirm" ? "sales.confirm" : "sales.cancel";
  if (!hasPermission(actor, requiredPermission)) {
    // Treat as 403 at the API; throw a generic guard error here.
    throw new SalesBranchNotInScopeError();
  }

  if (plan.action === "cancel" && from === "CONFIRMED") {
    if (!(cancelReason && cancelReason.trim().length > 0)) {
      throw new SalesCancelReasonRequiredError();
    }
  }

  if (plan.action === "confirm") {
    return confirmSale(actor, existing.id, meta);
  }

  // plan.action === "cancel"
  if (from === "DRAFT") {
    return cancelDraftSale(actor, existing.id, cancelReason ?? null, meta);
  }
  return cancelConfirmedSale(actor, existing.id, cancelReason ?? null, meta);
}

// ── Confirm (DRAFT → CONFIRMED) — cuts stock via SALES_OUT ──────────────────

async function confirmSale(
  actor: AuthenticatedUser,
  salesOrderId: string,
  meta: SalesAuditMeta | undefined,
): Promise<SalesOrderDTO> {
  const result = await prisma.$transaction(async (tx) => {
    // Lock the lot row for update — defeats concurrent confirms / adjusts.
    // NOTE: this also serialises with stock adjustments (Step 8) and any
    // future SALES_OUT, so over-debit is impossible.
    const existingSale = await tx.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: SALES_INCLUDE,
    });
    if (!existingSale) throw new SalesNotFoundError();
    if (existingSale.status !== "DRAFT") {
      throw new SalesStatusTransitionError(
        existingSale.status,
        "CONFIRMED",
      );
    }

    await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "StockLot" WHERE id = ${existingSale.stockLotId}::uuid FOR UPDATE
    `;

    const lot = await tx.stockLot.findUnique({
      where: { id: existingSale.stockLotId },
    });
    if (!lot) throw new SalesStockLotNotFoundError();
    if (!lot.isActive) throw new SalesStockLotInactiveError();
    if (lot.status !== "ACTIVE") throw new SalesStockLotNotActiveError();

    const grossWeight = new Prisma.Decimal(existingSale.grossWeight);
    if (grossWeight.gt(lot.remainingWeight)) {
      throw new SalesInsufficientStockError();
    }

    // Re-snapshot cost using lot.effectiveCostPerKg AT CONFIRM TIME — lot
    // cost may have shifted since DRAFT was created (e.g. via WATER_LOSS).
    const before = lot.remainingWeight;
    const after = before
      .minus(grossWeight)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

    const grossAmount = new Prisma.Decimal(existingSale.grossAmount);
    const cost = computeCostAndProfit(
      grossWeight,
      new Prisma.Decimal(lot.effectiveCostPerKg),
      grossAmount,
    );

    // Mirror the lot's depleted-handling rule (Step 8): when remaining=0 we
    // mark DEPLETED and FREEZE the rate. Otherwise recompute normally.
    const newEffective = after.lte(0)
      ? lot.effectiveCostPerKg
      : computeEffectiveCostPerKg(lot.costAmount, after);
    // The guard above (`lot.status !== "ACTIVE" → throw`) means we only
    // get here when the lot is ACTIVE — TS has narrowed `lot.status` to
    // the literal `"ACTIVE"`, so checking for `"CANCELLED"` would be
    // dead code (and TS rightly rejects it). Two outcomes only:
    //   - depleted by this sale → DEPLETED
    //   - still has remaining   → stays ACTIVE
    const newLotStatus = after.lte(0) ? "DEPLETED" : "ACTIVE";

    await tx.stockLot.update({
      where: { id: lot.id },
      data: {
        remainingWeight: after,
        effectiveCostPerKg: newEffective,
        status: newLotStatus,
      },
    });

    const movement = await tx.stockMovement.create({
      data: {
        branchId: lot.branchId,
        stockLotId: lot.id,
        movementType: "SALES_OUT",
        quantity: grossWeight,
        beforeWeight: before,
        afterWeight: after,
        reasonType: null,
        referenceType: "SalesOrder",
        referenceId: existingSale.id,
        note: null,
        createdById: actor.id,
      },
    });

    const sale = await tx.salesOrder.update({
      where: { id: existingSale.id },
      data: {
        status: "CONFIRMED",
        costAmount: cost.costAmount,
        profitAmount: cost.profitAmount,
        confirmedAt: new Date(),
        confirmedById: actor.id,
      },
      include: SALES_INCLUDE,
    });

    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        branchId: sale.branchId,
        entityType: "SalesOrder",
        entityId: sale.id,
        action: "confirm_sales_order",
        before: salesSnapshot(existingSale),
        after: salesSnapshot(sale),
        metadata: buildAuditMetadata(meta, {
          salesNo: sale.salesNo,
          stockLotId: sale.stockLotId,
          movementId: movement.id,
          movementType: "SALES_OUT",
          grossWeight: sale.grossWeight.toString(),
          drcPercent: sale.drcPercent.toString(),
          drcWeight: sale.drcWeight.toString(),
          pricePerKg: sale.pricePerKg.toString(),
          grossAmount: sale.grossAmount.toString(),
          withholdingTaxAmount: sale.withholdingTaxAmount.toString(),
          netReceivableAmount: sale.netReceivableAmount.toString(),
          costPerKgSnapshot: lot.effectiveCostPerKg.toString(),
          costAmount: sale.costAmount.toString(),
          profitAmount: sale.profitAmount.toString(),
          beforeWeight: before.toString(),
          afterWeight: after.toString(),
          newLotStatus,
        }),
        ipAddress: meta?.ipAddress ?? null,
        userAgent: meta?.userAgent ?? null,
      },
    });

    return sale;
  });

  try {
    await recordNotificationEvent("sales.confirmed", {
      salesOrderId: result.id,
      salesNo: result.salesNo,
      branchId: result.branchId,
    });
  } catch {
    /* noop */
  }

  return toSalesOrderDTO(result);
}

// ── Cancel DRAFT — no stock movement ────────────────────────────────────────

async function cancelDraftSale(
  actor: AuthenticatedUser,
  salesOrderId: string,
  cancelReason: string | null,
  meta: SalesAuditMeta | undefined,
): Promise<SalesOrderDTO> {
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: SALES_INCLUDE,
    });
    if (!existing) throw new SalesNotFoundError();
    if (existing.status !== "DRAFT") {
      throw new SalesStatusTransitionError(existing.status, "CANCELLED");
    }

    const sale = await tx.salesOrder.update({
      where: { id: existing.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledById: actor.id,
        cancelReason: cancelReason && cancelReason.trim().length > 0
          ? cancelReason.trim()
          : null,
      },
      include: SALES_INCLUDE,
    });

    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        branchId: sale.branchId,
        entityType: "SalesOrder",
        entityId: sale.id,
        action: "cancel_sales_order",
        before: salesSnapshot(existing),
        after: salesSnapshot(sale),
        metadata: buildAuditMetadata(meta, {
          salesNo: sale.salesNo,
          stockLotId: sale.stockLotId,
          fromStatus: "DRAFT",
          stockReversed: false,
        }),
        ipAddress: meta?.ipAddress ?? null,
        userAgent: meta?.userAgent ?? null,
      },
    });

    return sale;
  });

  try {
    await recordNotificationEvent("sales.cancelled", {
      salesOrderId: result.id,
      salesNo: result.salesNo,
      branchId: result.branchId,
      stockReversed: false,
    });
  } catch {
    /* noop */
  }

  return toSalesOrderDTO(result);
}

// ── Cancel CONFIRMED — sirens stock back via CANCEL_REVERSE ────────────────

async function cancelConfirmedSale(
  actor: AuthenticatedUser,
  salesOrderId: string,
  cancelReason: string | null,
  meta: SalesAuditMeta | undefined,
): Promise<SalesOrderDTO> {
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: SALES_INCLUDE,
    });
    if (!existing) throw new SalesNotFoundError();
    if (existing.status !== "CONFIRMED") {
      throw new SalesStatusTransitionError(existing.status, "CANCELLED");
    }

    await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "StockLot" WHERE id = ${existing.stockLotId}::uuid FOR UPDATE
    `;

    const lot = await tx.stockLot.findUnique({
      where: { id: existing.stockLotId },
    });
    if (!lot) throw new SalesStockLotNotFoundError();

    const before = lot.remainingWeight;
    const grossWeight = new Prisma.Decimal(existing.grossWeight);
    const after = before
      .plus(grossWeight)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

    // Restoring stock un-depletes the lot: rate becomes computable again.
    // Status flips back to ACTIVE unless the lot was independently
    // CANCELLED (we never override that).
    const newEffective = computeEffectiveCostPerKg(lot.costAmount, after);
    const newLotStatus =
      lot.status === "CANCELLED"
        ? "CANCELLED"
        : after.lte(0)
          ? "DEPLETED"
          : "ACTIVE";

    await tx.stockLot.update({
      where: { id: lot.id },
      data: {
        remainingWeight: after,
        effectiveCostPerKg: newEffective,
        status: newLotStatus,
      },
    });

    const reverseMovement = await tx.stockMovement.create({
      data: {
        branchId: lot.branchId,
        stockLotId: lot.id,
        movementType: "CANCEL_REVERSE",
        quantity: grossWeight,
        beforeWeight: before,
        afterWeight: after,
        reasonType: null,
        referenceType: "SalesOrder",
        referenceId: existing.id,
        note: cancelReason ?? null,
        createdById: actor.id,
      },
    });

    const sale = await tx.salesOrder.update({
      where: { id: existing.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledById: actor.id,
        cancelReason: cancelReason && cancelReason.trim().length > 0
          ? cancelReason.trim()
          : null,
      },
      include: SALES_INCLUDE,
    });

    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        branchId: sale.branchId,
        entityType: "SalesOrder",
        entityId: sale.id,
        action: "cancel_sales_order",
        before: salesSnapshot(existing),
        after: salesSnapshot(sale),
        metadata: buildAuditMetadata(meta, {
          salesNo: sale.salesNo,
          stockLotId: sale.stockLotId,
          fromStatus: "CONFIRMED",
          stockReversed: true,
          movementId: reverseMovement.id,
          movementType: "CANCEL_REVERSE",
          grossWeight: sale.grossWeight.toString(),
          beforeWeight: before.toString(),
          afterWeight: after.toString(),
          newLotStatus,
          cancelReason,
        }),
        ipAddress: meta?.ipAddress ?? null,
        userAgent: meta?.userAgent ?? null,
      },
    });

    return sale;
  });

  try {
    await recordNotificationEvent("sales.cancelled", {
      salesOrderId: result.id,
      salesNo: result.salesNo,
      branchId: result.branchId,
      stockReversed: true,
    });
  } catch {
    /* noop */
  }

  return toSalesOrderDTO(result);
}

// Re-export type so callers (API/UI) don't import from `@prisma/client`.
export type { SalesOrder, StockLot };
