import type {
  AppUser,
  Branch,
  PurchaseTicket,
  SalesOrder,
  SalesOrderLine,
  StockLot,
} from "@prisma/client";

import type { SaleType, SalesOrderStatus } from "./types";

// ─── Common ─────────────────────────────────────────────────────────────────

export type SalesBranchDTO = {
  id: string;
  code: string;
  name: string;
};

export type SalesUserDTO = {
  id: string;
  displayName: string;
};

export type SalesLotSnapshotDTO = {
  id: string;
  lotNo: string;
  rubberType: string;
  remainingWeight: string;
  effectiveCostPerKg: string;
  status: string;
  isActive: boolean;
  sourceTicket?: { id: string; ticketNo: string } | null;
};

// ─── Line ───────────────────────────────────────────────────────────────────

export type SalesOrderLineDTO = {
  id: string;
  salesOrderId: string;
  stockLotId: string;
  rubberType: string;
  grossWeight: string;
  costPerKgSnapshot: string;
  costAmount: string;
  movementId: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined lot snapshot (for UI display — list/detail page).
  lot: SalesLotSnapshotDTO | null;
};

type SalesOrderLineWithRelations = SalesOrderLine & {
  stockLot?:
    | (Pick<
        StockLot,
        | "id"
        | "lotNo"
        | "rubberType"
        | "remainingWeight"
        | "effectiveCostPerKg"
        | "status"
        | "isActive"
      > & {
        sourcePurchaseTicket?:
          | Pick<PurchaseTicket, "id" | "ticketNo">
          | null;
      })
    | null;
};

export function toSalesOrderLineDTO(
  l: SalesOrderLineWithRelations,
): SalesOrderLineDTO {
  return {
    id: l.id,
    salesOrderId: l.salesOrderId,
    stockLotId: l.stockLotId,
    rubberType: l.rubberType,
    grossWeight: l.grossWeight.toString(),
    costPerKgSnapshot: l.costPerKgSnapshot.toString(),
    costAmount: l.costAmount.toString(),
    movementId: l.movementId,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
    lot: l.stockLot
      ? {
          id: l.stockLot.id,
          lotNo: l.stockLot.lotNo,
          rubberType: l.stockLot.rubberType,
          remainingWeight: l.stockLot.remainingWeight.toString(),
          effectiveCostPerKg: l.stockLot.effectiveCostPerKg.toString(),
          status: l.stockLot.status,
          isActive: l.stockLot.isActive,
          sourceTicket: l.stockLot.sourcePurchaseTicket
            ? {
                id: l.stockLot.sourcePurchaseTicket.id,
                ticketNo: l.stockLot.sourcePurchaseTicket.ticketNo,
              }
            : null,
        }
      : null,
  };
}

// ─── SalesOrder ─────────────────────────────────────────────────────────────

export type SalesOrderDTO = {
  id: string;
  branchId: string;
  branch: SalesBranchDTO | null;
  salesNo: string;
  buyerName: string;
  saleType: SaleType;
  grossWeightTotal: string;
  drcPercent: string;
  drcWeightTotal: string;
  pricePerKg: string;
  grossAmount: string;
  withholdingTaxPercent: string;
  withholdingTaxAmount: string;
  netReceivableAmount: string;
  costAmount: string;
  profitAmount: string;
  status: SalesOrderStatus;
  expectedReceiveDate: string | null;
  receivedAt: string | null;
  note: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: SalesUserDTO | null;
  confirmedAt: string | null;
  confirmedBy: SalesUserDTO | null;
  cancelledAt: string | null;
  cancelledBy: SalesUserDTO | null;
  cancelReason: string | null;
  lines: SalesOrderLineDTO[];

  // ── Receiving (ขายในนาม / บัญชีรับเงิน) ──
  // Foreign keys are nullable for legacy rows from before Step 10.
  // The *Snapshot fields freeze the displayed values at the moment of
  // create/edit so historical bills don't shift if the master data is
  // later edited or deactivated.
  receivingEntityId: string | null;
  receivingBankAccountId: string | null;
  receivingEntityNameSnapshot: string | null;
  receivingEntityTypeSnapshot: string | null;
  receivingTaxIdSnapshot: string | null;
  receivingBankNameSnapshot: string | null;
  receivingBankAccountNoSnapshot: string | null;
  receivingBankAccountNameSnapshot: string | null;
};

type SalesOrderWithRelations = SalesOrder & {
  branch?: Pick<Branch, "id" | "code" | "name"> | null;
  createdBy?: Pick<AppUser, "id" | "displayName"> | null;
  confirmedBy?: Pick<AppUser, "id" | "displayName"> | null;
  cancelledBy?: Pick<AppUser, "id" | "displayName"> | null;
  lines?: SalesOrderLineWithRelations[] | null;
};

function userDto(
  u: Pick<AppUser, "id" | "displayName"> | null | undefined,
): SalesUserDTO | null {
  return u ? { id: u.id, displayName: u.displayName } : null;
}

export function toSalesOrderDTO(s: SalesOrderWithRelations): SalesOrderDTO {
  return {
    id: s.id,
    branchId: s.branchId,
    branch: s.branch
      ? { id: s.branch.id, code: s.branch.code, name: s.branch.name }
      : null,
    salesNo: s.salesNo,
    buyerName: s.buyerName,
    saleType: s.saleType as SaleType,
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
    status: s.status as SalesOrderStatus,
    expectedReceiveDate: s.expectedReceiveDate
      ? s.expectedReceiveDate.toISOString()
      : null,
    receivedAt: s.receivedAt ? s.receivedAt.toISOString() : null,
    note: s.note,
    isActive: s.isActive,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    createdBy: userDto(s.createdBy),
    confirmedAt: s.confirmedAt ? s.confirmedAt.toISOString() : null,
    confirmedBy: userDto(s.confirmedBy),
    cancelledAt: s.cancelledAt ? s.cancelledAt.toISOString() : null,
    cancelledBy: userDto(s.cancelledBy),
    cancelReason: s.cancelReason,
    lines: (s.lines ?? []).map(toSalesOrderLineDTO),
    receivingEntityId: s.receivingEntityId,
    receivingBankAccountId: s.receivingBankAccountId,
    receivingEntityNameSnapshot: s.receivingEntityNameSnapshot,
    receivingEntityTypeSnapshot: s.receivingEntityTypeSnapshot,
    receivingTaxIdSnapshot: s.receivingTaxIdSnapshot,
    receivingBankNameSnapshot: s.receivingBankNameSnapshot,
    receivingBankAccountNoSnapshot: s.receivingBankAccountNoSnapshot,
    receivingBankAccountNameSnapshot: s.receivingBankAccountNameSnapshot,
  };
}

// ─── Eligible lot for /sales/new picker ──────────────────────────────────────
//
// Includes customer name (joined via PurchaseTicket → Customer) so the
// picker can search/display the customer the lot originated from.

export type EligibleLotForSaleDTO = {
  id: string;
  branchId: string;
  branch: SalesBranchDTO | null;
  lotNo: string;
  rubberType: string;
  remainingWeight: string;
  effectiveCostPerKg: string;
  sourceTicket: { id: string; ticketNo: string } | null;
  customer: { id: string; code: string; fullName: string } | null;
  createdAt: string;
};

type EligibleLotSource = Pick<
  StockLot,
  | "id"
  | "branchId"
  | "lotNo"
  | "rubberType"
  | "remainingWeight"
  | "effectiveCostPerKg"
  | "createdAt"
> & {
  branch?: Pick<Branch, "id" | "code" | "name"> | null;
  sourcePurchaseTicket?:
    | (Pick<PurchaseTicket, "id" | "ticketNo"> & {
        customer?: { id: string; code: string; fullName: string } | null;
      })
    | null;
};

export function toEligibleLotForSaleDTO(
  l: EligibleLotSource,
): EligibleLotForSaleDTO {
  return {
    id: l.id,
    branchId: l.branchId,
    branch: l.branch
      ? { id: l.branch.id, code: l.branch.code, name: l.branch.name }
      : null,
    lotNo: l.lotNo,
    rubberType: l.rubberType,
    remainingWeight: l.remainingWeight.toString(),
    effectiveCostPerKg: l.effectiveCostPerKg.toString(),
    sourceTicket: l.sourcePurchaseTicket
      ? {
          id: l.sourcePurchaseTicket.id,
          ticketNo: l.sourcePurchaseTicket.ticketNo,
        }
      : null,
    customer: l.sourcePurchaseTicket?.customer
      ? {
          id: l.sourcePurchaseTicket.customer.id,
          code: l.sourcePurchaseTicket.customer.code,
          fullName: l.sourcePurchaseTicket.customer.fullName,
        }
      : null,
    createdAt: l.createdAt.toISOString(),
  };
}
