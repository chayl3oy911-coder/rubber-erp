import "server-only";

import {
  Prisma,
  type SalesOrder,
  type SalesOrderLine,
} from "@prisma/client";

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
  type ReplaceSalesLinesInput,
  type SalesLineInput,
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
  /** id of the lot we couldn't resolve (when known) */
  stockLotId?: string;
  constructor(stockLotId?: string) {
    super(t.errors.stockLotNotFound);
    this.name = "SalesStockLotNotFoundError";
    this.stockLotId = stockLotId;
  }
}

export class SalesStockLotBranchMismatchError extends Error {
  stockLotId?: string;
  constructor(stockLotId?: string) {
    super(t.errors.stockLotBranchMismatch);
    this.name = "SalesStockLotBranchMismatchError";
    this.stockLotId = stockLotId;
  }
}

export class SalesStockLotNotActiveError extends Error {
  stockLotId?: string;
  constructor(stockLotId?: string) {
    super(t.errors.stockLotNotActive);
    this.name = "SalesStockLotNotActiveError";
    this.stockLotId = stockLotId;
  }
}

export class SalesStockLotInactiveError extends Error {
  stockLotId?: string;
  constructor(stockLotId?: string) {
    super(t.errors.stockLotInactive);
    this.name = "SalesStockLotInactiveError";
    this.stockLotId = stockLotId;
  }
}

export class SalesInsufficientStockError extends Error {
  stockLotId?: string;
  lotNo?: string;
  constructor(stockLotId?: string, lotNo?: string) {
    super(
      lotNo ? t.errors.insufficientStockOnLot(lotNo) : t.errors.insufficientStock,
    );
    this.name = "SalesInsufficientStockError";
    this.stockLotId = stockLotId;
    this.lotNo = lotNo;
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

export class SalesLinesLockedError extends Error {
  constructor() {
    super(t.errors.linesLocked);
    this.name = "SalesLinesLockedError";
  }
}

export class SalesLinesEmptyError extends Error {
  constructor() {
    super(t.errors.linesEmpty);
    this.name = "SalesLinesEmptyError";
  }
}

export class SalesDuplicateLotError extends Error {
  stockLotId?: string;
  constructor(stockLotId?: string) {
    super(t.errors.duplicateLot);
    this.name = "SalesDuplicateLotError";
    this.stockLotId = stockLotId;
  }
}

// ─── Audit helpers ───────────────────────────────────────────────────────────

export type SalesAuditMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
  source?: "api" | "action";
};

function salesSnapshot(
  s: SalesOrder & { lines?: SalesOrderLine[] | null },
): Prisma.InputJsonValue {
  return {
    branchId: s.branchId,
    salesNo: s.salesNo,
    buyerName: s.buyerName,
    saleType: s.saleType,
    grossWeightTotal: s.grossWeightTotal.toString(),
    drcPercent: s.drcPercent.toString(),
    drcWeightTotal: s.drcWeightTotal.toString(),
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
    lines: (s.lines ?? []).map(salesLineSnapshot),
  } as Prisma.InputJsonValue;
}

function salesLineSnapshot(l: SalesOrderLine): Prisma.InputJsonValue {
  return {
    id: l.id,
    stockLotId: l.stockLotId,
    rubberType: l.rubberType,
    grossWeight: l.grossWeight.toString(),
    costPerKgSnapshot: l.costPerKgSnapshot.toString(),
    costAmount: l.costAmount.toString(),
    movementId: l.movementId,
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

const SALES_LINE_INCLUDE = {
  stockLot: {
    select: {
      id: true,
      lotNo: true,
      rubberType: true,
      remainingWeight: true,
      effectiveCostPerKg: true,
      status: true,
      isActive: true,
      sourcePurchaseTicket: { select: { id: true, ticketNo: true } },
    },
  },
} as const;

const SALES_INCLUDE = {
  branch: { select: { id: true, code: true, name: true } },
  createdBy: { select: { id: true, displayName: true } },
  confirmedBy: { select: { id: true, displayName: true } },
  cancelledBy: { select: { id: true, displayName: true } },
  lines: {
    orderBy: { createdAt: "asc" },
    include: SALES_LINE_INCLUDE,
  },
} as const;

const MOVEMENT_INCLUDE = {
  createdBy: { select: { id: true, displayName: true } },
} as const;

// ─── Calculation core (header-level aggregates) ─────────────────────────────
//
// All arithmetic in `Prisma.Decimal`. Rounding is HALF_UP at the documented
// decimal places. Service is the SOLE source of truth — UI preview is for
// UX only and must never be trusted by the API.

type ComputedSalesAmounts = {
  drcWeightTotal: Prisma.Decimal;
  grossAmount: Prisma.Decimal;
  withholdingTaxAmount: Prisma.Decimal;
  netReceivableAmount: Prisma.Decimal;
};

function computeSalesAmounts(
  grossWeightTotal: Prisma.Decimal,
  drcPercent: Prisma.Decimal,
  pricePerKg: Prisma.Decimal,
  withholdingTaxPercent: Prisma.Decimal,
): ComputedSalesAmounts {
  const drcWeightTotal = grossWeightTotal
    .mul(drcPercent)
    .div(100)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  const grossAmount = drcWeightTotal
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
    drcWeightTotal,
    grossAmount,
    withholdingTaxAmount,
    netReceivableAmount,
  };
}

function lineCostAmount(
  grossWeight: Prisma.Decimal,
  costPerKg: Prisma.Decimal,
): Prisma.Decimal {
  return grossWeight
    .mul(costPerKg)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

function sumDecimal(values: ReadonlyArray<Prisma.Decimal>): Prisma.Decimal {
  return values.reduce<Prisma.Decimal>(
    (acc, v) => acc.plus(v),
    new Prisma.Decimal(0),
  );
}

function computeProfit(
  grossAmount: Prisma.Decimal,
  costAmount: Prisma.Decimal,
): Prisma.Decimal {
  return grossAmount
    .minus(costAmount)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

// Mirror StockLot's recompute logic so cancel-reverse keeps the same math.
// Kept @ 2 dp HALF_UP — `StockLot.effectiveCostPerKg` is now Decimal(14, 2).
function computeEffectiveCostPerKg(
  costAmount: Prisma.Decimal,
  remainingWeight: Prisma.Decimal,
): Prisma.Decimal {
  if (remainingWeight.lte(0)) {
    return new Prisma.Decimal(0);
  }
  return costAmount
    .div(remainingWeight)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
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

// Tx timeout — multi-lot confirms can lock many StockLot rows + create one
// movement per line. Default 5s is too tight for ~100-line bills.
const TX_TIMEOUT_MS = 30_000;
const TX_MAX_WAIT_MS = 10_000;

// ─── Lot validation + line build helper ─────────────────────────────────────
//
// Used by create + replaceLines. Validates each line (lot exists, in scope,
// active, sufficient stock), snapshots `rubberType` and `costPerKgSnapshot`
// from the lot at time of write, and computes per-line `costAmount`.
//
// Reads happen WITHOUT FOR UPDATE — the persistent guarantee is taken at
// confirm time, where we lock the rows. Here we just want a friendly upfront
// validation so DRAFT save / preview is correct.

type LotResolved = {
  id: string;
  branchId: string;
  lotNo: string;
  rubberType: string;
  remainingWeight: Prisma.Decimal;
  effectiveCostPerKg: Prisma.Decimal;
  status: string;
  isActive: boolean;
};

type ResolvedLine = {
  stockLotId: string;
  rubberType: string;
  grossWeight: Prisma.Decimal;
  costPerKgSnapshot: Prisma.Decimal;
  costAmount: Prisma.Decimal;
};

async function resolveLinesForBranch(
  tx: Prisma.TransactionClient,
  actor: AuthenticatedUser,
  branchId: string,
  lines: ReadonlyArray<SalesLineInput>,
): Promise<ResolvedLine[]> {
  if (lines.length === 0) throw new SalesLinesEmptyError();

  // Duplicate detection (Zod also enforces, but defence-in-depth).
  const seen = new Set<string>();
  for (const l of lines) {
    if (seen.has(l.stockLotId)) {
      throw new SalesDuplicateLotError(l.stockLotId);
    }
    seen.add(l.stockLotId);
  }

  const lotIds = lines.map((l) => l.stockLotId);
  const lots = await tx.stockLot.findMany({
    where: { id: { in: lotIds } },
    select: {
      id: true,
      branchId: true,
      lotNo: true,
      rubberType: true,
      remainingWeight: true,
      effectiveCostPerKg: true,
      status: true,
      isActive: true,
    },
  });
  const lotById = new Map<string, LotResolved>(
    lots.map((l) => [
      l.id,
      {
        id: l.id,
        branchId: l.branchId,
        lotNo: l.lotNo,
        rubberType: l.rubberType,
        remainingWeight: new Prisma.Decimal(l.remainingWeight),
        effectiveCostPerKg: new Prisma.Decimal(l.effectiveCostPerKg),
        status: l.status,
        isActive: l.isActive,
      },
    ]),
  );

  const resolved: ResolvedLine[] = [];
  for (const line of lines) {
    const lot = lotById.get(line.stockLotId);
    if (!lot) throw new SalesStockLotNotFoundError(line.stockLotId);
    if (lot.branchId !== branchId) {
      throw new SalesStockLotBranchMismatchError(line.stockLotId);
    }
    if (!actor.isSuperAdmin && !actor.branchIds.includes(lot.branchId)) {
      throw new SalesStockLotBranchMismatchError(line.stockLotId);
    }
    if (!lot.isActive) throw new SalesStockLotInactiveError(line.stockLotId);
    if (lot.status !== "ACTIVE") {
      throw new SalesStockLotNotActiveError(line.stockLotId);
    }

    const grossWeight = new Prisma.Decimal(line.grossWeight);
    if (grossWeight.gt(lot.remainingWeight)) {
      throw new SalesInsufficientStockError(line.stockLotId, lot.lotNo);
    }

    const costAmount = lineCostAmount(grossWeight, lot.effectiveCostPerKg);
    resolved.push({
      stockLotId: lot.id,
      rubberType: lot.rubberType,
      grossWeight,
      costPerKgSnapshot: lot.effectiveCostPerKg,
      costAmount,
    });
  }

  return resolved;
}

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
    where.lines = { some: { stockLotId: opts.stockLotId } };
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
          lines: {
            some: {
              stockLot: { lotNo: { contains: q, mode: "insensitive" } },
            },
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
    return null;
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

// ─── Eligible lots for /sales/new picker (paginated + searchable) ──────────

export type ListEligibleLotsForSaleOptions = {
  q?: string;
  branchId?: string;
  page?: number;
  pageSize?: number;
};

export type ListEligibleLotsForSaleResult = {
  lots: EligibleLotForSaleDTO[];
  total: number;
  page: number;
  pageSize: number;
};

export async function listEligibleLotsForSale(
  actor: AuthenticatedUser,
  opts: ListEligibleLotsForSaleOptions = {},
): Promise<ListEligibleLotsForSaleResult> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(
    SALES_PAGE_SIZE_MAX,
    Math.max(1, opts.pageSize ?? SALES_PAGE_SIZE_DEFAULT),
  );

  const where: Prisma.StockLotWhereInput = {
    isActive: true,
    status: "ACTIVE",
    remainingWeight: { gt: 0 },
  };

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

  if (opts.q) {
    const q = opts.q.trim();
    if (q.length > 0) {
      where.OR = [
        { lotNo: { contains: q, mode: "insensitive" } },
        { rubberType: { contains: q, mode: "insensitive" } },
        {
          sourcePurchaseTicket: {
            is: { ticketNo: { contains: q, mode: "insensitive" } },
          },
        },
        {
          sourcePurchaseTicket: {
            is: {
              customer: {
                is: { fullName: { contains: q, mode: "insensitive" } },
              },
            },
          },
        },
      ];
    }
  }

  const [rows, total] = await Promise.all([
    prisma.stockLot.findMany({
      where,
      select: {
        id: true,
        branchId: true,
        lotNo: true,
        rubberType: true,
        remainingWeight: true,
        effectiveCostPerKg: true,
        createdAt: true,
        branch: { select: { id: true, code: true, name: true } },
        sourcePurchaseTicket: {
          select: {
            id: true,
            ticketNo: true,
            customer: { select: { id: true, code: true, fullName: true } },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.stockLot.count({ where }),
  ]);

  return {
    lots: rows.map(toEligibleLotForSaleDTO),
    total,
    page,
    pageSize,
  };
}

// ─── Create (DRAFT) ──────────────────────────────────────────────────────────

export async function createSalesOrder(
  actor: AuthenticatedUser,
  input: CreateSalesInput,
  meta?: SalesAuditMeta,
): Promise<SalesOrderDTO> {
  ensureBranchInScope(actor, input.branchId);

  const drcPercent = new Prisma.Decimal(input.drcPercent);
  const pricePerKg = new Prisma.Decimal(input.pricePerKg);
  const withholdingTaxPercent = new Prisma.Decimal(
    input.withholdingTaxPercent ?? 0,
  );

  for (let attempt = 0; attempt < CREATE_RETRY_LIMIT; attempt++) {
    try {
      const created = await prisma.$transaction(
        async (tx) => {
          const resolved = await resolveLinesForBranch(
            tx,
            actor,
            input.branchId,
            input.lines,
          );

          const grossWeightTotal = sumDecimal(
            resolved.map((r) => r.grossWeight),
          ).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

          const amounts = computeSalesAmounts(
            grossWeightTotal,
            drcPercent,
            pricePerKg,
            withholdingTaxPercent,
          );
          const costAmountTotal = sumDecimal(
            resolved.map((r) => r.costAmount),
          ).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
          const profitAmount = computeProfit(
            amounts.grossAmount,
            costAmountTotal,
          );

          const salesNo = await generateNextSalesNo(tx, input.branchId);
          const sale = await tx.salesOrder.create({
            data: {
              branchId: input.branchId,
              salesNo,
              buyerName: input.buyerName,
              saleType: input.saleType,
              grossWeightTotal,
              drcPercent,
              drcWeightTotal: amounts.drcWeightTotal,
              pricePerKg,
              grossAmount: amounts.grossAmount,
              withholdingTaxPercent,
              withholdingTaxAmount: amounts.withholdingTaxAmount,
              netReceivableAmount: amounts.netReceivableAmount,
              costAmount: costAmountTotal,
              profitAmount,
              status: "DRAFT",
              expectedReceiveDate: input.expectedReceiveDate ?? null,
              note: input.note ?? null,
              createdById: actor.id,
              lines: {
                create: resolved.map((r) => ({
                  stockLotId: r.stockLotId,
                  rubberType: r.rubberType,
                  grossWeight: r.grossWeight,
                  costPerKgSnapshot: r.costPerKgSnapshot,
                  costAmount: r.costAmount,
                })),
              },
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
                lineCount: sale.lines.length,
                grossWeightTotal: sale.grossWeightTotal.toString(),
                drcPercent: sale.drcPercent.toString(),
                drcWeightTotal: sale.drcWeightTotal.toString(),
                pricePerKg: sale.pricePerKg.toString(),
                grossAmount: sale.grossAmount.toString(),
                withholdingTaxPercent: sale.withholdingTaxPercent.toString(),
                withholdingTaxAmount: sale.withholdingTaxAmount.toString(),
                netReceivableAmount: sale.netReceivableAmount.toString(),
                costAmount: sale.costAmount.toString(),
                profitAmount: sale.profitAmount.toString(),
                autoGeneratedSalesNo: true,
              }),
              ipAddress: meta?.ipAddress ?? null,
              userAgent: meta?.userAgent ?? null,
            },
          });

          return sale;
        },
        { timeout: TX_TIMEOUT_MS, maxWait: TX_MAX_WAIT_MS },
      );

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
        // salesNo race or duplicate (salesOrderId, stockLotId) — retry the whole
        // transaction so we re-fetch a fresh MAX and re-resolve lines.
        continue;
      }
      throw error;
    }
  }

  throw new SalesAutoGenError();
}

// ─── Update header fields ────────────────────────────────────────────────────
//
// DRAFT: all listed fields are editable; recompute aggregates because
//        DRC% / price / withholding influence amounts.
// CONFIRMED: only `note` editable (everything else locked — historical record).
// CANCELLED: nothing editable.

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

  const status = existing.status as SalesOrderStatus;
  if (status === "CANCELLED") {
    throw new SalesStatusFieldsLockedError("status");
  }

  const lockedKeys: Array<keyof UpdateSalesFieldsInput> =
    status === "CONFIRMED"
      ? [
          "buyerName",
          "saleType",
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

  const buyerName = input.buyerName ?? existing.buyerName;
  const saleType = (input.saleType ?? existing.saleType) as SaleType;
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

  // Recompute aggregates only for DRAFT (CONFIRMED→note only).
  let amounts = {
    drcWeightTotal: new Prisma.Decimal(existing.drcWeightTotal),
    grossAmount: new Prisma.Decimal(existing.grossAmount),
    withholdingTaxAmount: new Prisma.Decimal(existing.withholdingTaxAmount),
    netReceivableAmount: new Prisma.Decimal(existing.netReceivableAmount),
  };
  let profitAmount = new Prisma.Decimal(existing.profitAmount);
  const grossWeightTotal = new Prisma.Decimal(existing.grossWeightTotal);
  const costAmountTotal = new Prisma.Decimal(existing.costAmount);

  if (status === "DRAFT") {
    amounts = computeSalesAmounts(
      grossWeightTotal,
      drcPercent,
      pricePerKg,
      withholdingTaxPercent,
    );
    profitAmount = computeProfit(amounts.grossAmount, costAmountTotal);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const sale = await tx.salesOrder.update({
      where: { id: existing.id },
      data: {
        buyerName,
        saleType,
        drcPercent,
        drcWeightTotal: amounts.drcWeightTotal,
        pricePerKg,
        grossAmount: amounts.grossAmount,
        withholdingTaxPercent,
        withholdingTaxAmount: amounts.withholdingTaxAmount,
        netReceivableAmount: amounts.netReceivableAmount,
        profitAmount,
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

// ─── Replace lines (DRAFT only) ──────────────────────────────────────────────
//
// Wipe-and-rewrite is the simplest sound semantics — there's no way to
// "edit a line in place" since a line is fundamentally `(stockLotId, weight)`
// pair: changing the lot is identity-changing. We preserve the salesOrder
// header (incl. salesNo, audit history) and just rebuild the line list.
// Aggregates are recomputed identically to create().

export async function replaceSalesOrderLines(
  actor: AuthenticatedUser,
  id: string,
  input: ReplaceSalesLinesInput,
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
  if (existing.status !== "DRAFT") {
    throw new SalesLinesLockedError();
  }

  const drcPercent = new Prisma.Decimal(existing.drcPercent);
  const pricePerKg = new Prisma.Decimal(existing.pricePerKg);
  const withholdingTaxPercent = new Prisma.Decimal(
    existing.withholdingTaxPercent,
  );

  const updated = await prisma.$transaction(
    async (tx) => {
      const resolved = await resolveLinesForBranch(
        tx,
        actor,
        existing.branchId,
        input.lines,
      );

      const grossWeightTotal = sumDecimal(
        resolved.map((r) => r.grossWeight),
      ).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

      const amounts = computeSalesAmounts(
        grossWeightTotal,
        drcPercent,
        pricePerKg,
        withholdingTaxPercent,
      );
      const costAmountTotal = sumDecimal(
        resolved.map((r) => r.costAmount),
      ).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      const profitAmount = computeProfit(
        amounts.grossAmount,
        costAmountTotal,
      );

      // Wipe existing lines (cascade will not auto-trigger here because we
      // deleteMany explicitly; lines have no movements yet for DRAFT — that's
      // why "DRAFT only" is enforced above).
      await tx.salesOrderLine.deleteMany({
        where: { salesOrderId: existing.id },
      });

      const sale = await tx.salesOrder.update({
        where: { id: existing.id },
        data: {
          grossWeightTotal,
          drcWeightTotal: amounts.drcWeightTotal,
          grossAmount: amounts.grossAmount,
          withholdingTaxAmount: amounts.withholdingTaxAmount,
          netReceivableAmount: amounts.netReceivableAmount,
          costAmount: costAmountTotal,
          profitAmount,
          lines: {
            create: resolved.map((r) => ({
              stockLotId: r.stockLotId,
              rubberType: r.rubberType,
              grossWeight: r.grossWeight,
              costPerKgSnapshot: r.costPerKgSnapshot,
              costAmount: r.costAmount,
            })),
          },
        },
        include: SALES_INCLUDE,
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          branchId: sale.branchId,
          entityType: "SalesOrder",
          entityId: sale.id,
          action: "replace_sales_lines",
          before: salesSnapshot(existing),
          after: salesSnapshot(sale),
          metadata: buildAuditMetadata(meta, {
            salesNo: sale.salesNo,
            beforeLineCount: existing.lines.length,
            afterLineCount: sale.lines.length,
          }),
          ipAddress: meta?.ipAddress ?? null,
          userAgent: meta?.userAgent ?? null,
        },
      });

      return sale;
    },
    { timeout: TX_TIMEOUT_MS, maxWait: TX_MAX_WAIT_MS },
  );

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

  const requiredPermission =
    plan.action === "confirm" ? "sales.confirm" : "sales.cancel";
  if (!hasPermission(actor, requiredPermission)) {
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

  if (from === "DRAFT") {
    return cancelDraftSale(actor, existing.id, cancelReason ?? null, meta);
  }
  return cancelConfirmedSale(actor, existing.id, cancelReason ?? null, meta);
}

// ── Confirm (DRAFT → CONFIRMED) — cuts stock via SALES_OUT per line ──────────
//
// Locks every StockLot referenced by lines (sorted by id to prevent deadlock),
// re-validates each line's grossWeight ≤ remainingWeight, re-snapshots
// `costPerKgSnapshot` from the lot's CURRENT effectiveCostPerKg, then creates
// one SALES_OUT movement per line.
//
// Per-line lot mutations (multi-lot, and the SAME lot CANNOT appear twice in
// one sale by @@unique, so each lot is touched exactly once):
//   remainingWeight := before − grossWeight
//   costAmount      := lot.costAmount − soldCost
//                      where soldCost = grossWeight × costPerKgSnapshot
//                      (this is the semantic change vs Step 8: SALES_OUT
//                      EXPENSES cost, unlike WATER_LOSS which keeps it sunk.)
//   effectiveCostPerKg := newCostAmount / newRemainingWeight  (normal case)
//   if remainingWeight ≤ 0:
//       status := DEPLETED
//       costAmount := 0 (pin to kill ±0.01 rounding drift)
//       effectiveCostPerKg := FROZEN at the lot's pre-sale rate

async function confirmSale(
  actor: AuthenticatedUser,
  salesOrderId: string,
  meta: SalesAuditMeta | undefined,
): Promise<SalesOrderDTO> {
  const result = await prisma.$transaction(
    async (tx) => {
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
      if (existingSale.lines.length === 0) {
        throw new SalesLinesEmptyError();
      }

      // Lock every lot in sorted order to avoid deadlocks across concurrent
      // confirms / adjustments. Pass the array as a single uuid[] parameter
      // (Prisma's $queryRaw + Postgres `= ANY($1)` is the standard pattern).
      const lotIdsSorted = [
        ...new Set(existingSale.lines.map((l) => l.stockLotId)),
      ].sort();

      await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "StockLot"
        WHERE id = ANY(${lotIdsSorted}::uuid[])
        ORDER BY id
        FOR UPDATE
      `;

      const lots = await tx.stockLot.findMany({
        where: { id: { in: lotIdsSorted } },
      });
      const lotById = new Map(lots.map((l) => [l.id, l]));

      // Per-line: revalidate, create movement, update lot.
      const auditLineEntries: Array<Record<string, unknown>> = [];
      const lineUpdates: Array<{
        lineId: string;
        grossWeight: Prisma.Decimal;
        costPerKgSnapshot: Prisma.Decimal;
        costAmount: Prisma.Decimal;
        movementId: string;
      }> = [];

      let totalCost = new Prisma.Decimal(0);

      for (const line of existingSale.lines) {
        const lot = lotById.get(line.stockLotId);
        if (!lot) throw new SalesStockLotNotFoundError(line.stockLotId);
        if (!lot.isActive) {
          throw new SalesStockLotInactiveError(line.stockLotId);
        }
        if (lot.status !== "ACTIVE") {
          throw new SalesStockLotNotActiveError(line.stockLotId);
        }

        const grossWeight = new Prisma.Decimal(line.grossWeight);
        const before = new Prisma.Decimal(lot.remainingWeight);
        if (grossWeight.gt(before)) {
          throw new SalesInsufficientStockError(line.stockLotId, lot.lotNo);
        }

        const after = before
          .minus(grossWeight)
          .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

        // Re-snapshot from the lot's CURRENT cost rate (may differ from
        // DRAFT-time if WATER_LOSS happened in between).
        const currentCostPerKg = new Prisma.Decimal(lot.effectiveCostPerKg);
        const lineCost = lineCostAmount(grossWeight, currentCostPerKg);
        totalCost = totalCost.plus(lineCost);

        // Adjust StockLot.costAmount — THIS is the semantic change vs Step 8.
        // SALES_OUT expenses cost (remainingWeight and costAmount drop
        // together, keeping effectiveCostPerKg stable). Compare:
        //   - WATER_LOSS (ADJUST_OUT): costAmount unchanged → rate RISES.
        //   - SALES_OUT               : costAmount shrinks  → rate stable.
        //
        // We pin costAmount to exactly 0 when the lot depletes to absorb any
        // ±0.01 rounding residue (grossWeight × rate over many partial sales
        // can drift by a cent). On depletion we also FREEZE the rate at the
        // pre-sale value so reports keep showing the real landed cost.
        const lotCostBefore = new Prisma.Decimal(lot.costAmount);
        const newLotCost = after.lte(0)
          ? new Prisma.Decimal(0)
          : lotCostBefore
              .minus(lineCost)
              .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
        // The pre-loop guard (`lot.status !== "ACTIVE" → throw`) means the
        // only outcomes here are: depleted (after≤0) → DEPLETED, otherwise
        // remains ACTIVE. CANCELLED is unreachable.
        const newEffective = after.lte(0)
          ? currentCostPerKg // freeze at the rate used for THIS sale
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

        await tx.salesOrderLine.update({
          where: { id: line.id },
          data: {
            costPerKgSnapshot: currentCostPerKg,
            costAmount: lineCost,
            movementId: movement.id,
          },
        });

        lineUpdates.push({
          lineId: line.id,
          grossWeight,
          costPerKgSnapshot: currentCostPerKg,
          costAmount: lineCost,
          movementId: movement.id,
        });

        auditLineEntries.push({
          lineId: line.id,
          stockLotId: lot.id,
          lotNo: lot.lotNo,
          grossWeight: grossWeight.toString(),
          beforeWeight: before.toString(),
          afterWeight: after.toString(),
          costPerKgSnapshot: currentCostPerKg.toString(),
          costAmount: lineCost.toString(),
          lotCostAmountBefore: lotCostBefore.toString(),
          lotCostAmountAfter: newLotCost.toString(),
          lotEffectiveCostPerKgBefore: lot.effectiveCostPerKg.toString(),
          lotEffectiveCostPerKgAfter: newEffective.toString(),
          movementId: movement.id,
          newLotStatus,
        });
      }

      const totalCostRounded = totalCost.toDecimalPlaces(
        2,
        Prisma.Decimal.ROUND_HALF_UP,
      );
      const grossAmount = new Prisma.Decimal(existingSale.grossAmount);
      const profit = computeProfit(grossAmount, totalCostRounded);

      const sale = await tx.salesOrder.update({
        where: { id: existingSale.id },
        data: {
          status: "CONFIRMED",
          costAmount: totalCostRounded,
          profitAmount: profit,
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
            lineCount: sale.lines.length,
            grossWeightTotal: sale.grossWeightTotal.toString(),
            grossAmount: sale.grossAmount.toString(),
            costAmount: sale.costAmount.toString(),
            profitAmount: sale.profitAmount.toString(),
            lines: auditLineEntries,
          }),
          ipAddress: meta?.ipAddress ?? null,
          userAgent: meta?.userAgent ?? null,
        },
      });

      return sale;
    },
    { timeout: TX_TIMEOUT_MS, maxWait: TX_MAX_WAIT_MS },
  );

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
        cancelReason:
          cancelReason && cancelReason.trim().length > 0
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
          fromStatus: "DRAFT",
          stockReversed: false,
          lineCount: sale.lines.length,
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

// ── Cancel CONFIRMED — restores stock per line via CANCEL_REVERSE ───────────
//
// Inverse of confirmSale. Per line (using the snapshot values stored on the
// SalesOrderLine at confirm time):
//   remainingWeight := before + line.grossWeight
//   costAmount      := lot.costAmount + line.costAmount   (exact restore)
//   effectiveCostPerKg := newCostAmount / newRemainingWeight
//   status          := ACTIVE  (unless the lot was independently CANCELLED,
//                                which we never override)
// We restore with the EXACT `line.costAmount` snapshot (not a recomputation)
// so confirm-then-cancel is an identity on the lot's financials.

async function cancelConfirmedSale(
  actor: AuthenticatedUser,
  salesOrderId: string,
  cancelReason: string | null,
  meta: SalesAuditMeta | undefined,
): Promise<SalesOrderDTO> {
  const result = await prisma.$transaction(
    async (tx) => {
      const existing = await tx.salesOrder.findUnique({
        where: { id: salesOrderId },
        include: SALES_INCLUDE,
      });
      if (!existing) throw new SalesNotFoundError();
      if (existing.status !== "CONFIRMED") {
        throw new SalesStatusTransitionError(existing.status, "CANCELLED");
      }
      if (existing.lines.length === 0) {
        throw new SalesLinesEmptyError();
      }

      const lotIdsSorted = [
        ...new Set(existing.lines.map((l) => l.stockLotId)),
      ].sort();

      await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "StockLot"
        WHERE id = ANY(${lotIdsSorted}::uuid[])
        ORDER BY id
        FOR UPDATE
      `;

      const lots = await tx.stockLot.findMany({
        where: { id: { in: lotIdsSorted } },
      });
      const lotById = new Map(lots.map((l) => [l.id, l]));

      const auditLineEntries: Array<Record<string, unknown>> = [];

      for (const line of existing.lines) {
        const lot = lotById.get(line.stockLotId);
        if (!lot) throw new SalesStockLotNotFoundError(line.stockLotId);

        const before = new Prisma.Decimal(lot.remainingWeight);
        const grossWeight = new Prisma.Decimal(line.grossWeight);
        const after = before
          .plus(grossWeight)
          .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

        // Restore costAmount with the EXACT snapshot from the sales line
        // (not a recompute of grossWeight × current rate) so that a
        // confirm-then-cancel is financially an identity on the lot.
        const lotCostBefore = new Prisma.Decimal(lot.costAmount);
        const lineCostSnapshot = new Prisma.Decimal(line.costAmount);
        const newLotCost = lotCostBefore
          .plus(lineCostSnapshot)
          .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

        // Status flips back to ACTIVE unless the lot was independently
        // CANCELLED (we never override that). after > 0 is guaranteed here
        // (we just added grossWeight which the validation guarantees > 0).
        const newEffective = computeEffectiveCostPerKg(newLotCost, after);
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
            costAmount: newLotCost,
            effectiveCostPerKg: newEffective,
            status: newLotStatus,
          },
        });
        // Refresh the in-memory copy so subsequent lines that reference the
        // same lot (impossible by @@unique, but defence-in-depth) would see
        // the latest values.
        lotById.set(lot.id, {
          ...lot,
          remainingWeight: after,
          costAmount: newLotCost,
          effectiveCostPerKg: newEffective,
          status: newLotStatus,
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

        auditLineEntries.push({
          lineId: line.id,
          stockLotId: lot.id,
          lotNo: lot.lotNo,
          grossWeight: grossWeight.toString(),
          beforeWeight: before.toString(),
          afterWeight: after.toString(),
          lotCostAmountBefore: lotCostBefore.toString(),
          lotCostAmountAfter: newLotCost.toString(),
          lotEffectiveCostPerKgBefore: lot.effectiveCostPerKg.toString(),
          lotEffectiveCostPerKgAfter: newEffective.toString(),
          restoredCostAmount: lineCostSnapshot.toString(),
          reverseMovementId: reverseMovement.id,
          newLotStatus,
        });
      }

      const sale = await tx.salesOrder.update({
        where: { id: existing.id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelledById: actor.id,
          cancelReason:
            cancelReason && cancelReason.trim().length > 0
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
            fromStatus: "CONFIRMED",
            stockReversed: true,
            lineCount: sale.lines.length,
            lines: auditLineEntries,
          }),
          ipAddress: meta?.ipAddress ?? null,
          userAgent: meta?.userAgent ?? null,
        },
      });

      return sale;
    },
    { timeout: TX_TIMEOUT_MS, maxWait: TX_MAX_WAIT_MS },
  );

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
