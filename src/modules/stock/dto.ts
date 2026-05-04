import {
  Prisma,
  type AppUser,
  type Branch,
  type Customer,
  type PurchaseTicket,
  type StockLot,
  type StockMovement,
} from "@prisma/client";

import type {
  StockAdjustmentReason,
  StockLotStatus,
  StockMovementType,
} from "./types";

// ─── Common shapes ───────────────────────────────────────────────────────────

export type StockBranchDTO = {
  id: string;
  code: string;
  name: string;
};

export type StockUserDTO = {
  id: string;
  displayName: string;
};

export type StockSourceTicketDTO = {
  id: string;
  ticketNo: string;
  netWeight: string;
  totalAmount: string;
  /** Purchase price per kg AT RECEIVE TIME — historical, never changes. */
  pricePerKg: string;
  status: string;
  isActive: boolean;
  customer: { id: string; code: string; fullName: string } | null;
};

// ─── StockLot ────────────────────────────────────────────────────────────────

export type StockLotDTO = {
  id: string;
  branchId: string;
  branch: StockBranchDTO | null;
  sourcePurchaseTicketId: string;
  sourceTicket: StockSourceTicketDTO | null;
  lotNo: string;
  rubberType: string;
  initialWeight: string;
  remainingWeight: string;
  /**
   * Landed cost at receive time = PurchaseTicket.totalAmount.
   * Historical — never mutates after lot creation. Mirrored here so UIs can
   * render "ต้นทุนรับเข้ารวม" without re-joining to PurchaseTicket.
   */
  initialCostAmount: string;
  /**
   * Landed cost per kg at receive time = totalAmount / initialWeight
   * rounded HALF_UP @ 2 dp. Same precision as `effectiveCostPerKg` so tables
   * can put the two columns side by side without rounding differences.
   * Equals `sourceTicket.pricePerKg` (stored as `Decimal(12, 2)`) when the
   * source ticket is reachable — the division is only a fallback.
   */
  initialCostPerKg: string;
  /** Remaining landed cost — decreases on SALES_OUT, increases on
   * CANCEL_REVERSE (Sales), constant on ADJUST_* / WATER_LOSS. */
  costAmount: string;
  effectiveCostPerKg: string;
  status: StockLotStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: StockUserDTO | null;
};

type StockLotWithRelations = StockLot & {
  branch?: Pick<Branch, "id" | "code" | "name"> | null;
  createdBy?: Pick<AppUser, "id" | "displayName"> | null;
  sourcePurchaseTicket?:
    | (Pick<
        PurchaseTicket,
        | "id"
        | "ticketNo"
        | "netWeight"
        | "totalAmount"
        | "pricePerKg"
        | "status"
        | "isActive"
      > & {
        customer?: Pick<Customer, "id" | "code" | "fullName"> | null;
      })
    | null;
};

function userDto(
  u: Pick<AppUser, "id" | "displayName"> | null | undefined,
): StockUserDTO | null {
  return u ? { id: u.id, displayName: u.displayName } : null;
}

export function toStockLotDTO(l: StockLotWithRelations): StockLotDTO {
  const initialWeight = new Prisma.Decimal(l.initialWeight);
  // Compute the inbound landed rate server-side so UI labels stay simple.
  // We prefer the ticket's `pricePerKg` when available (it's stored at 4 dp
  // and is the "official" receive price). Falls back to totalAmount /
  // initialWeight if, for any reason, the ticket is unreachable.
  const ticket = l.sourcePurchaseTicket;
  const initialCostAmount = ticket
    ? new Prisma.Decimal(ticket.totalAmount)
    : new Prisma.Decimal(l.costAmount);
  const initialCostPerKg = ticket
    ? new Prisma.Decimal(ticket.pricePerKg)
    : initialWeight.gt(0)
      ? initialCostAmount
          .div(initialWeight)
          .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
      : new Prisma.Decimal(0);
  return {
    id: l.id,
    branchId: l.branchId,
    branch: l.branch
      ? { id: l.branch.id, code: l.branch.code, name: l.branch.name }
      : null,
    sourcePurchaseTicketId: l.sourcePurchaseTicketId,
    sourceTicket: ticket
      ? {
          id: ticket.id,
          ticketNo: ticket.ticketNo,
          netWeight: ticket.netWeight.toString(),
          totalAmount: ticket.totalAmount.toString(),
          pricePerKg: ticket.pricePerKg.toString(),
          status: ticket.status,
          isActive: ticket.isActive,
          customer: ticket.customer
            ? {
                id: ticket.customer.id,
                code: ticket.customer.code,
                fullName: ticket.customer.fullName,
              }
            : null,
        }
      : null,
    lotNo: l.lotNo,
    rubberType: l.rubberType,
    initialWeight: l.initialWeight.toString(),
    remainingWeight: l.remainingWeight.toString(),
    initialCostAmount: initialCostAmount.toString(),
    initialCostPerKg: initialCostPerKg.toString(),
    costAmount: l.costAmount.toString(),
    effectiveCostPerKg: l.effectiveCostPerKg.toString(),
    status: l.status as StockLotStatus,
    isActive: l.isActive,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
    createdBy: userDto(l.createdBy),
  };
}

// ─── StockMovement ───────────────────────────────────────────────────────────

export type StockMovementDTO = {
  id: string;
  branchId: string;
  stockLotId: string;
  movementType: StockMovementType;
  quantity: string;
  beforeWeight: string;
  afterWeight: string;
  reasonType: StockAdjustmentReason | null;
  referenceType: string | null;
  referenceId: string | null;
  note: string | null;
  createdAt: string;
  createdBy: StockUserDTO | null;
};

type StockMovementWithRelations = StockMovement & {
  createdBy?: Pick<AppUser, "id" | "displayName"> | null;
};

export function toStockMovementDTO(
  m: StockMovementWithRelations,
): StockMovementDTO {
  return {
    id: m.id,
    branchId: m.branchId,
    stockLotId: m.stockLotId,
    movementType: m.movementType as StockMovementType,
    quantity: m.quantity.toString(),
    beforeWeight: m.beforeWeight.toString(),
    afterWeight: m.afterWeight.toString(),
    reasonType: (m.reasonType as StockAdjustmentReason | null) ?? null,
    referenceType: m.referenceType,
    referenceId: m.referenceId,
    note: m.note,
    createdAt: m.createdAt.toISOString(),
    createdBy: userDto(m.createdBy),
  };
}

// ─── EligiblePurchase (for "receive into stock" UI) ─────────────────────────

export type EligiblePurchaseDTO = {
  id: string;
  branchId: string;
  branch: StockBranchDTO | null;
  ticketNo: string;
  netWeight: string;
  totalAmount: string;
  pricePerKg: string;
  customer: { id: string; code: string; fullName: string } | null;
  createdAt: string;
  // ─── Stock intake (Step 11) ──────────────────────────────────────────
  // String-typed (rather than a strict union) because the DB column is
  // `String`; the type guard `isStockIntakeStatus` is the gate when
  // narrowing matters (mostly UI). The skipped-* fields are populated only
  // when stockIntakeStatus is SKIPPED (mapper enforces the contract).
  stockIntakeStatus: string;
  stockIntakeReceivedAt: string | null;
  stockIntakeSkippedAt: string | null;
  stockIntakeSkipReason: string | null;
};

type EligiblePurchaseSource = Pick<
  PurchaseTicket,
  | "id"
  | "branchId"
  | "ticketNo"
  | "netWeight"
  | "totalAmount"
  | "pricePerKg"
  | "createdAt"
  | "stockIntakeStatus"
  | "stockIntakeReceivedAt"
  | "stockIntakeSkippedAt"
  | "stockIntakeSkipReason"
> & {
  branch?: Pick<Branch, "id" | "code" | "name"> | null;
  customer?: Pick<Customer, "id" | "code" | "fullName"> | null;
};

export function toEligiblePurchaseDTO(
  t: EligiblePurchaseSource,
): EligiblePurchaseDTO {
  return {
    id: t.id,
    branchId: t.branchId,
    branch: t.branch
      ? { id: t.branch.id, code: t.branch.code, name: t.branch.name }
      : null,
    ticketNo: t.ticketNo,
    netWeight: t.netWeight.toString(),
    totalAmount: t.totalAmount.toString(),
    pricePerKg: t.pricePerKg.toString(),
    customer: t.customer
      ? {
          id: t.customer.id,
          code: t.customer.code,
          fullName: t.customer.fullName,
        }
      : null,
    createdAt: t.createdAt.toISOString(),
    stockIntakeStatus: t.stockIntakeStatus,
    stockIntakeReceivedAt: t.stockIntakeReceivedAt
      ? t.stockIntakeReceivedAt.toISOString()
      : null,
    stockIntakeSkippedAt: t.stockIntakeSkippedAt
      ? t.stockIntakeSkippedAt.toISOString()
      : null,
    stockIntakeSkipReason: t.stockIntakeSkipReason ?? null,
  };
}
