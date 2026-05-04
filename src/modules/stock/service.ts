import "server-only";

import { Prisma, type PurchaseTicket, type StockLot } from "@prisma/client";

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
  type BulkCreateLotsFromPurchaseInput,
  type CreateLotFromPurchaseInput,
  type SkipStockIntakeInput,
  type UndoSkipStockIntakeInput,
} from "./schemas";
import {
  type StockAdjustmentDirection,
  type StockAdjustmentReason,
  type StockIntakeView,
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

// ─── Step 11 — stock intake state machine errors ───────────────────────────
//
// These are thrown when the *intake-status precondition* fails. They are
// distinct from `StockLotAlreadyExistsError` (which is keyed on the unique
// constraint and used as a race-tiebreaker in `createLotFromPurchase`).
// The HTTP layer maps both to 409 but with different message bodies, so the
// UI can show "ใบนี้รับเข้าแล้ว" vs. "เพิ่งมีคนสร้าง Lot ก่อนคุณ" appropriately.

export class StockIntakeAlreadyReceivedError extends Error {
  constructor() {
    super(t.errors.intakeAlreadyReceived);
    this.name = "StockIntakeAlreadyReceivedError";
  }
}

export class StockIntakeAlreadySkippedError extends Error {
  constructor() {
    super(t.errors.intakeAlreadySkipped);
    this.name = "StockIntakeAlreadySkippedError";
  }
}

export class StockIntakeNotSkippedError extends Error {
  constructor() {
    super(t.errors.intakeNotSkipped);
    this.name = "StockIntakeNotSkippedError";
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
      pricePerKg: true,
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
// Rounding is HALF_UP @ 2 dp on the rate — aligned with pricePerKg / money
// precision across the whole system. Reasons for 2 dp (not 4):
//   (a) matches real-market practice and what users actually type in forms,
//   (b) `StockLot.effectiveCostPerKg` column is `Decimal(14, 2)`, so a 4-dp
//       in-memory value would be silently truncated by Postgres anyway,
//   (c) UI never displays more than 2 dp — keeping maths in lockstep avoids
//       "display says 42.12 but accounting spreadsheet says 42.1234" drift.
//
// `costAmount` semantics — updated as of the Sales SALES_OUT refactor:
//
//   - WATER_LOSS / DAMAGE / MANUAL_CORRECTION (ADJUST_OUT via `adjustStock`):
//       costAmount UNCHANGED — sunk cost on the surviving weight.
//       → effectiveCostPerKg RISES (same pennies, fewer kg).
//
//   - ADJUST_IN (restore accidentally-lost weight):
//       costAmount UNCHANGED — no new money entered the lot.
//       → effectiveCostPerKg FALLS back toward the original rate.
//
//   - SALES_OUT (via `confirmSale` in modules/sales/service.ts):
//       costAmount SHRINKS by the line's sold cost, keeping the rate stable.
//
//   - CANCEL_REVERSE for SalesOrder (via `cancelConfirmedSale`):
//       costAmount GROWS back by the exact line.costAmount snapshot.
//
// The functions in THIS file only handle the ADJUST_* path; the SALES_OUT
// and CANCEL_REVERSE mutations live in the sales module because they
// piggyback on the SalesOrderLine snapshot values.

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
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
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
  /** "pending" (default) or "skipped". RECEIVED is intentionally unsupported. */
  view?: StockIntakeView;
  page?: number;
  pageSize?: number;
};

export type ListEligiblePurchasesResult = {
  tickets: EligiblePurchaseDTO[];
  total: number;
  page: number;
  pageSize: number;
};

/**
 * Build the `where` clause shared by `listEligiblePurchases` and the count
 * helper. Centralising it ensures the tab counts always match what the list
 * would actually return for the same filters.
 */
function buildEligiblePurchasesWhere(
  actor: AuthenticatedUser,
  opts: ListEligiblePurchasesOptions,
): Prisma.PurchaseTicketWhereInput | null {
  const view: StockIntakeView = opts.view ?? "pending";

  const where: Prisma.PurchaseTicketWhereInput = {
    status: "APPROVED",
    isActive: true,
    stockIntakeStatus: view === "pending" ? "PENDING" : "SKIPPED",
  };

  // Defence-in-depth: even though the migration backfilled RECEIVED on
  // tickets that already have a StockLot, we additionally require
  // `stockLot { is: null }` for the PENDING view so a hypothetically-bad
  // row never reaches the UI as "ready to create" only to error out.
  if (view === "pending") {
    where.stockLot = { is: null };
  }

  if (!actor.isSuperAdmin) {
    if (opts.branchId && !actor.branchIds.includes(opts.branchId)) {
      return null; // out-of-scope branch
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

  return where;
}

const ELIGIBLE_PURCHASE_SELECT = {
  id: true,
  branchId: true,
  ticketNo: true,
  netWeight: true,
  totalAmount: true,
  pricePerKg: true,
  createdAt: true,
  stockIntakeStatus: true,
  stockIntakeReceivedAt: true,
  stockIntakeSkippedAt: true,
  stockIntakeSkipReason: true,
  branch: { select: { id: true, code: true, name: true } },
  customer: { select: { id: true, code: true, fullName: true } },
} as const;

export async function listEligiblePurchases(
  actor: AuthenticatedUser,
  opts: ListEligiblePurchasesOptions = {},
): Promise<ListEligiblePurchasesResult> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(
    STOCK_PAGE_SIZE_MAX,
    Math.max(1, opts.pageSize ?? STOCK_PAGE_SIZE_DEFAULT),
  );

  const where = buildEligiblePurchasesWhere(actor, opts);
  if (where === null) {
    return { tickets: [], total: 0, page, pageSize };
  }

  const [rows, total] = await Promise.all([
    prisma.purchaseTicket.findMany({
      where,
      select: ELIGIBLE_PURCHASE_SELECT,
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

/**
 * Returns counts for the tab strip. We run the two queries in parallel so
 * the page render is not blocked on a serial pair of round-trips.
 *
 * `branchId` and `q` are *not* included here on purpose: tab counts should
 * reflect the user's full scope so they can see "8 skipped" even when
 * they've drilled into a specific search/branch on the PENDING tab.
 */
export async function countEligiblePurchasesByView(
  actor: AuthenticatedUser,
): Promise<{ pending: number; skipped: number }> {
  const pendingWhere = buildEligiblePurchasesWhere(actor, { view: "pending" });
  const skippedWhere = buildEligiblePurchasesWhere(actor, { view: "skipped" });

  const [pending, skipped] = await Promise.all([
    pendingWhere ? prisma.purchaseTicket.count({ where: pendingWhere }) : 0,
    skippedWhere ? prisma.purchaseTicket.count({ where: skippedWhere }) : 0,
  ]);

  return { pending, skipped };
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
      ticketNo: true,
      branchId: true,
      status: true,
      isActive: true,
      stockIntakeStatus: true,
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

  // Step 11 — intake state machine guard. We check this *before* the
  // existing `stockLot` check so the user gets a sharper diagnostic
  // ("already received" / "already skipped") rather than the legacy
  // "lot already exists" message, which only made sense pre-Step-11.
  if (ticket.stockIntakeStatus === "RECEIVED") {
    throw new StockIntakeAlreadyReceivedError();
  }
  if (ticket.stockIntakeStatus === "SKIPPED") {
    throw new StockIntakeAlreadySkippedError();
  }
  if (ticket.stockLot) throw new StockLotAlreadyExistsError();

  const initialWeight = new Prisma.Decimal(ticket.netWeight);
  const costAmount = new Prisma.Decimal(ticket.totalAmount);
  const effectiveCostPerKg = computeEffectiveCostPerKg(costAmount, initialWeight);

  for (let attempt = 0; attempt < CREATE_RETRY_LIMIT; attempt++) {
    try {
      const created = await prisma.$transaction(async (tx) => {
        // Re-check intake status *inside* the tx — if a concurrent skip
        // landed between our pre-read and the tx start, abort cleanly.
        const fresh = await tx.purchaseTicket.findUnique({
          where: { id: ticket.id },
          select: { stockIntakeStatus: true, isActive: true },
        });
        if (!fresh || !fresh.isActive) {
          throw new PurchaseTicketInactiveError();
        }
        if (fresh.stockIntakeStatus === "RECEIVED") {
          throw new StockIntakeAlreadyReceivedError();
        }
        if (fresh.stockIntakeStatus === "SKIPPED") {
          throw new StockIntakeAlreadySkippedError();
        }

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

        // Flip the intake axis to RECEIVED. We snapshot the timestamp
        // inside the same transaction so a future audit reader can rely
        // on `stockIntakeReceivedAt` matching `StockMovement.createdAt`
        // for `PURCHASE_IN` to within microseconds.
        await tx.purchaseTicket.update({
          where: { id: ticket.id },
          data: {
            stockIntakeStatus: "RECEIVED",
            stockIntakeReceivedAt: new Date(),
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
              ticketNo: ticket.ticketNo,
              lotNo: lot.lotNo,
              initialWeight: initialWeight.toString(),
              costAmount: costAmount.toString(),
              effectiveCostPerKg: effectiveCostPerKg.toString(),
              movementId: movement.id,
              movementType: "PURCHASE_IN",
              autoGeneratedLotNo: true,
              stockIntakeStatusBefore: "PENDING",
              stockIntakeStatusAfter: "RECEIVED",
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

// ─── Bulk create from purchase ──────────────────────────────────────────────
//
// Each ticket is processed in its OWN transaction. We deliberately do NOT
// wrap the whole batch in a single $transaction:
//
//   1. Single-tx semantics would make any one bad ticket roll back the
//      successful ones — terrible UX for "receive 50 tickets at once".
//   2. Long-running multi-ticket transactions hold row locks across all
//      `PurchaseTicket` and `StockLot` rows for the duration, which would
//      block concurrent users.
//   3. Per-ticket transactions also make the failure list precise: each
//      failure carries its own error message and ticketNo for the toast.
//
// Errors that are intrinsic to a single ticket (not approved, already
// received, etc.) are caught and recorded in `failed`. Programmer errors
// (e.g. `PrismaClientUnknownRequestError`) re-throw so they surface as 500.

export type BulkCreateResultItem = {
  ticketId: string;
  ticketNo: string | null;
  lotId: string;
  lotNo: string;
};

export type BulkCreateFailureItem = {
  ticketId: string;
  ticketNo: string | null;
  reason: string;
};

export type BulkCreateLotsResult = {
  created: BulkCreateResultItem[];
  failed: BulkCreateFailureItem[];
};

function isExpectedIntakeError(error: unknown): error is Error {
  return (
    error instanceof PurchaseTicketNotFoundForStockError ||
    error instanceof PurchaseTicketBranchMismatchForStockError ||
    error instanceof PurchaseTicketInactiveError ||
    error instanceof PurchaseTicketNotApprovedError ||
    error instanceof StockIntakeAlreadyReceivedError ||
    error instanceof StockIntakeAlreadySkippedError ||
    error instanceof StockIntakeNotSkippedError ||
    error instanceof StockLotAlreadyExistsError ||
    error instanceof StockBranchNotInScopeError
  );
}

export async function bulkCreateLotsFromPurchase(
  actor: AuthenticatedUser,
  input: BulkCreateLotsFromPurchaseInput,
  meta?: StockAuditMeta,
): Promise<BulkCreateLotsResult> {
  // Dedupe at the service boundary — defence-in-depth against a client
  // that sends the same id twice. The schema validates length AFTER the
  // dedupe at this point would mask the original count to the audit log,
  // so we dedupe but record both numbers in metadata.
  const dedupedIds = Array.from(new Set(input.ticketIds));

  // Pre-fetch ticketNos once so failure entries always carry a human-
  // readable label, even when the per-ticket service call fails before we
  // can read the row ourselves.
  const ticketNoLookup = new Map<string, string>(
    (
      await prisma.purchaseTicket.findMany({
        where: { id: { in: dedupedIds } },
        select: { id: true, ticketNo: true },
      })
    ).map((t) => [t.id, t.ticketNo]),
  );

  const created: BulkCreateResultItem[] = [];
  const failed: BulkCreateFailureItem[] = [];

  for (const ticketId of dedupedIds) {
    const ticketNo = ticketNoLookup.get(ticketId) ?? null;
    try {
      const lot = await createLotFromPurchase(
        actor,
        { purchaseTicketId: ticketId },
        meta,
      );
      created.push({
        ticketId,
        ticketNo,
        lotId: lot.id,
        lotNo: lot.lotNo,
      });
    } catch (error) {
      if (isExpectedIntakeError(error)) {
        failed.push({
          ticketId,
          ticketNo,
          reason: error.message,
        });
      } else {
        // Unexpected DB / connection errors — surface 500 to the caller
        // so we don't silently swallow them. Successful items are still
        // committed (separate tx per ticket) and the request is partial.
        throw error;
      }
    }
  }

  // Summary audit row — separate from the per-lot rows that
  // `createLotFromPurchase` already wrote. This gives us a single
  // chronological breadcrumb per bulk action.
  //
  // `AuditLog.entityId` is required (String @db.Uuid). We anchor the
  // summary to the FIRST id in the deduped batch — the metadata payload
  // carries the full breakdown of which ones succeeded/failed, so the
  // anchor is just a "where do I find this row when filtering by entity"
  // pivot. If somehow no ids are present (cannot happen — schema has
  // `.min(1)`), we skip the summary; per-row audits still cover the trail.
  if (dedupedIds.length > 0) {
    const anchorTicketId = dedupedIds[0];

    // Best-effort branch tag for the summary so a per-branch audit query
    // surfaces it. Pick the branch of the first successful create when
    // possible; otherwise fall back to whatever branch the anchor ticket
    // belonged to (read-only, safe).
    let summaryBranchId: string | null = null;
    if (created.length > 0) {
      const firstLot = await prisma.stockLot.findUnique({
        where: { id: created[0]!.lotId },
        select: { branchId: true },
      });
      summaryBranchId = firstLot?.branchId ?? null;
    } else {
      summaryBranchId = ticketNoLookup.size
        ? (
            await prisma.purchaseTicket.findUnique({
              where: { id: anchorTicketId },
              select: { branchId: true },
            })
          )?.branchId ?? null
        : null;
    }

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        branchId: summaryBranchId,
        entityType: "PurchaseTicketBulkIntake",
        entityId: anchorTicketId,
        action: "bulk_create_stock_lot_from_purchase",
        before: Prisma.DbNull,
        after: Prisma.DbNull,
        metadata: buildAuditMetadata(meta, {
          requestedCount: input.ticketIds.length,
          dedupedCount: dedupedIds.length,
          successCount: created.length,
          failureCount: failed.length,
          successes: created.map((r) => ({
            ticketId: r.ticketId,
            ticketNo: r.ticketNo,
            lotId: r.lotId,
            lotNo: r.lotNo,
          })),
          failures: failed.map((f) => ({
            ticketId: f.ticketId,
            ticketNo: f.ticketNo,
            reason: f.reason,
          })),
        }),
        ipAddress: meta?.ipAddress ?? null,
        userAgent: meta?.userAgent ?? null,
      },
    });
  }

  return { created, failed };
}

// ─── Skip stock intake ──────────────────────────────────────────────────────

function intakeTicketSnapshot(t: PurchaseTicket): Prisma.InputJsonValue {
  return {
    id: t.id,
    branchId: t.branchId,
    ticketNo: t.ticketNo,
    status: t.status,
    isActive: t.isActive,
    stockIntakeStatus: t.stockIntakeStatus,
    stockIntakeReceivedAt: t.stockIntakeReceivedAt
      ? t.stockIntakeReceivedAt.toISOString()
      : null,
    stockIntakeSkippedAt: t.stockIntakeSkippedAt
      ? t.stockIntakeSkippedAt.toISOString()
      : null,
    stockIntakeSkippedById: t.stockIntakeSkippedById,
    stockIntakeSkipReason: t.stockIntakeSkipReason,
  } as Prisma.InputJsonValue;
}

export async function skipStockIntake(
  actor: AuthenticatedUser,
  input: SkipStockIntakeInput,
  meta?: StockAuditMeta,
): Promise<EligiblePurchaseDTO> {
  const head = await prisma.purchaseTicket.findUnique({
    where: { id: input.purchaseTicketId },
    select: { id: true, branchId: true },
  });
  if (!head) throw new PurchaseTicketNotFoundForStockError();
  ensureBranchInScope(actor, head.branchId);

  const result = await prisma.$transaction(async (tx) => {
    // Lock the ticket row so a concurrent `createLotFromPurchase` cannot
    // flip status to RECEIVED between our read and update. Postgres
    // serialisable would also work, but FOR UPDATE is the lighter-weight
    // option used elsewhere in this file (`adjustStock`).
    await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "PurchaseTicket" WHERE id = ${input.purchaseTicketId}::uuid FOR UPDATE
    `;

    const existing = await tx.purchaseTicket.findUnique({
      where: { id: input.purchaseTicketId },
    });
    if (!existing) throw new PurchaseTicketNotFoundForStockError();
    if (!existing.isActive) throw new PurchaseTicketInactiveError();
    if (existing.status !== "APPROVED") {
      throw new PurchaseTicketNotApprovedError();
    }
    if (existing.stockIntakeStatus === "RECEIVED") {
      throw new StockIntakeAlreadyReceivedError();
    }
    if (existing.stockIntakeStatus === "SKIPPED") {
      throw new StockIntakeAlreadySkippedError();
    }

    const updated = await tx.purchaseTicket.update({
      where: { id: existing.id },
      data: {
        stockIntakeStatus: "SKIPPED",
        stockIntakeSkippedAt: new Date(),
        stockIntakeSkippedById: actor.id,
        stockIntakeSkipReason: input.reason,
      },
      select: ELIGIBLE_PURCHASE_SELECT,
    });
    const updatedFull = await tx.purchaseTicket.findUnique({
      where: { id: existing.id },
    });

    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        branchId: existing.branchId,
        entityType: "PurchaseTicket",
        entityId: existing.id,
        action: "skip_stock_intake",
        before: intakeTicketSnapshot(existing),
        after: updatedFull
          ? intakeTicketSnapshot(updatedFull)
          : Prisma.DbNull,
        metadata: buildAuditMetadata(meta, {
          ticketNo: existing.ticketNo,
          stockIntakeStatusBefore: existing.stockIntakeStatus,
          stockIntakeStatusAfter: "SKIPPED",
          reason: input.reason,
        }),
        ipAddress: meta?.ipAddress ?? null,
        userAgent: meta?.userAgent ?? null,
      },
    });

    return updated;
  });

  return toEligiblePurchaseDTO(result);
}

// ─── Undo skip stock intake ─────────────────────────────────────────────────

export async function undoSkipStockIntake(
  actor: AuthenticatedUser,
  input: UndoSkipStockIntakeInput,
  meta?: StockAuditMeta,
): Promise<EligiblePurchaseDTO> {
  const head = await prisma.purchaseTicket.findUnique({
    where: { id: input.purchaseTicketId },
    select: { id: true, branchId: true },
  });
  if (!head) throw new PurchaseTicketNotFoundForStockError();
  ensureBranchInScope(actor, head.branchId);

  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "PurchaseTicket" WHERE id = ${input.purchaseTicketId}::uuid FOR UPDATE
    `;

    const existing = await tx.purchaseTicket.findUnique({
      where: { id: input.purchaseTicketId },
    });
    if (!existing) throw new PurchaseTicketNotFoundForStockError();
    if (existing.stockIntakeStatus !== "SKIPPED") {
      throw new StockIntakeNotSkippedError();
    }
    // We don't gate this on `isActive` / `status === APPROVED`: if those
    // changed while the ticket was SKIPPED, the right thing to do is still
    // restore the intake-axis to PENDING so the operator can re-evaluate.

    const updated = await tx.purchaseTicket.update({
      where: { id: existing.id },
      data: {
        stockIntakeStatus: "PENDING",
        stockIntakeSkippedAt: null,
        stockIntakeSkippedById: null,
        stockIntakeSkipReason: null,
      },
      select: ELIGIBLE_PURCHASE_SELECT,
    });
    const updatedFull = await tx.purchaseTicket.findUnique({
      where: { id: existing.id },
    });

    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        branchId: existing.branchId,
        entityType: "PurchaseTicket",
        entityId: existing.id,
        action: "undo_skip_stock_intake",
        before: intakeTicketSnapshot(existing),
        after: updatedFull
          ? intakeTicketSnapshot(updatedFull)
          : Prisma.DbNull,
        metadata: buildAuditMetadata(meta, {
          ticketNo: existing.ticketNo,
          stockIntakeStatusBefore: "SKIPPED",
          stockIntakeStatusAfter: "PENDING",
          previousSkipReason: existing.stockIntakeSkipReason,
        }),
        ipAddress: meta?.ipAddress ?? null,
        userAgent: meta?.userAgent ?? null,
      },
    });

    return updated;
  });

  return toEligiblePurchaseDTO(result);
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
