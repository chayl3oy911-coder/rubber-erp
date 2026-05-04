import { Prisma, type StockMovement } from "@prisma/client";

// ─── Shapes ─────────────────────────────────────────────────────────────────

export type PurchaseReturnBranchDTO = {
  id: string;
  code: string;
  name: string;
};

export type PurchaseReturnUserDTO = {
  id: string;
  displayName: string;
};

export type PurchaseReturnTicketDTO = {
  id: string;
  ticketNo: string;
  status: string;
  stockIntakeStatus: string;
  paymentStatus: string;
  customerName: string | null;
  customerCode: string | null;
  totalAmount: string;
};

export type PurchaseReturnStockLotDTO = {
  id: string;
  lotNo: string;
  rubberType: string;
  remainingWeight: string;
  status: string;
  isActive: boolean;
  effectiveCostPerKg: string;
};

export type PurchaseReturnDTO = {
  id: string;
  branchId: string;
  branch: PurchaseReturnBranchDTO | null;
  purchaseTicketId: string;
  purchaseTicket: PurchaseReturnTicketDTO | null;
  stockLotId: string;
  stockLot: PurchaseReturnStockLotDTO | null;

  returnNo: string;
  status: string;
  returnReasonType: string;
  returnReasonNote: string | null;
  returnWeight: string;
  returnCostAmount: string;

  customerCodeSnapshot: string | null;
  customerNameSnapshot: string | null;
  ticketNoSnapshot: string | null;
  lotNoSnapshot: string | null;

  stockMovementId: string | null;
  refundStatus: string;
  refundedAmount: string;

  createdAt: string;
  createdBy: PurchaseReturnUserDTO | null;
  confirmedAt: string | null;
  confirmedBy: PurchaseReturnUserDTO | null;
  cancelledAt: string | null;
  cancelledBy: PurchaseReturnUserDTO | null;
  cancelReason: string | null;

  isActive: boolean;
};

// ─── Prisma `select` clauses (single source of truth) ──────────────────────

export const purchaseReturnSelect = {
  id: true,
  branchId: true,
  branch: { select: { id: true, code: true, name: true } },
  purchaseTicketId: true,
  purchaseTicket: {
    select: {
      id: true,
      ticketNo: true,
      status: true,
      stockIntakeStatus: true,
      paymentStatus: true,
      totalAmount: true,
      customer: { select: { code: true, fullName: true } },
    },
  },
  stockLotId: true,
  stockLot: {
    select: {
      id: true,
      lotNo: true,
      rubberType: true,
      remainingWeight: true,
      status: true,
      isActive: true,
      effectiveCostPerKg: true,
    },
  },
  returnNo: true,
  status: true,
  returnReasonType: true,
  returnReasonNote: true,
  returnWeight: true,
  returnCostAmount: true,
  customerCodeSnapshot: true,
  customerNameSnapshot: true,
  ticketNoSnapshot: true,
  lotNoSnapshot: true,
  stockMovementId: true,
  refundStatus: true,
  refundedAmount: true,
  createdAt: true,
  createdBy: { select: { id: true, displayName: true } },
  confirmedAt: true,
  confirmedBy: { select: { id: true, displayName: true } },
  cancelledAt: true,
  cancelledBy: { select: { id: true, displayName: true } },
  cancelReason: true,
  isActive: true,
} satisfies Prisma.PurchaseReturnSelect;

// ─── Mappers ────────────────────────────────────────────────────────────────

// Derived from the select clause — a single source of truth for both the
// shape Prisma returns and what the mapper accepts. Adding a column to
// `purchaseReturnSelect` automatically updates this type.
type LoadedReturn = Prisma.PurchaseReturnGetPayload<{
  select: typeof purchaseReturnSelect;
}>;

export function toPurchaseReturnDTO(row: LoadedReturn): PurchaseReturnDTO {
  return {
    id: row.id,
    branchId: row.branchId,
    branch: row.branch
      ? { id: row.branch.id, code: row.branch.code, name: row.branch.name }
      : null,
    purchaseTicketId: row.purchaseTicketId,
    purchaseTicket: row.purchaseTicket
      ? {
          id: row.purchaseTicket.id,
          ticketNo: row.purchaseTicket.ticketNo,
          status: row.purchaseTicket.status,
          stockIntakeStatus: row.purchaseTicket.stockIntakeStatus,
          paymentStatus: row.purchaseTicket.paymentStatus,
          customerCode: row.purchaseTicket.customer?.code ?? null,
          customerName: row.purchaseTicket.customer?.fullName ?? null,
          totalAmount: row.purchaseTicket.totalAmount.toFixed(2),
        }
      : null,
    stockLotId: row.stockLotId,
    stockLot: row.stockLot
      ? {
          id: row.stockLot.id,
          lotNo: row.stockLot.lotNo,
          rubberType: row.stockLot.rubberType,
          remainingWeight: row.stockLot.remainingWeight.toFixed(2),
          status: row.stockLot.status,
          isActive: row.stockLot.isActive,
          effectiveCostPerKg: row.stockLot.effectiveCostPerKg.toFixed(2),
        }
      : null,
    returnNo: row.returnNo,
    status: row.status,
    returnReasonType: row.returnReasonType,
    returnReasonNote: row.returnReasonNote,
    returnWeight: row.returnWeight.toFixed(2),
    returnCostAmount: row.returnCostAmount.toFixed(2),
    customerCodeSnapshot: row.customerCodeSnapshot,
    customerNameSnapshot: row.customerNameSnapshot,
    ticketNoSnapshot: row.ticketNoSnapshot,
    lotNoSnapshot: row.lotNoSnapshot,
    stockMovementId: row.stockMovementId,
    refundStatus: row.refundStatus,
    refundedAmount: row.refundedAmount.toFixed(2),
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy
      ? { id: row.createdBy.id, displayName: row.createdBy.displayName }
      : null,
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    confirmedBy: row.confirmedBy
      ? { id: row.confirmedBy.id, displayName: row.confirmedBy.displayName }
      : null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    cancelledBy: row.cancelledBy
      ? { id: row.cancelledBy.id, displayName: row.cancelledBy.displayName }
      : null,
    cancelReason: row.cancelReason,
    isActive: row.isActive,
  };
}

// Re-export StockMovement type so consumers don't have to import from prisma.
export type { StockMovement };
