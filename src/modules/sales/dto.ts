import type {
  AppUser,
  Branch,
  PurchaseTicket,
  SalesOrder,
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

export type SalesSourceLotDTO = {
  id: string;
  lotNo: string;
  rubberType: string;
  remainingWeight: string;
  effectiveCostPerKg: string;
  status: string;
  isActive: boolean;
  sourceTicket?: { id: string; ticketNo: string } | null;
};

// ─── SalesOrder ─────────────────────────────────────────────────────────────

export type SalesOrderDTO = {
  id: string;
  branchId: string;
  branch: SalesBranchDTO | null;
  stockLotId: string;
  sourceLot: SalesSourceLotDTO | null;
  salesNo: string;
  buyerName: string;
  saleType: SaleType;
  rubberType: string;
  grossWeight: string;
  drcPercent: string;
  drcWeight: string;
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
};

type SalesOrderWithRelations = SalesOrder & {
  branch?: Pick<Branch, "id" | "code" | "name"> | null;
  createdBy?: Pick<AppUser, "id" | "displayName"> | null;
  confirmedBy?: Pick<AppUser, "id" | "displayName"> | null;
  cancelledBy?: Pick<AppUser, "id" | "displayName"> | null;
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
    stockLotId: s.stockLotId,
    sourceLot: s.stockLot
      ? {
          id: s.stockLot.id,
          lotNo: s.stockLot.lotNo,
          rubberType: s.stockLot.rubberType,
          remainingWeight: s.stockLot.remainingWeight.toString(),
          effectiveCostPerKg: s.stockLot.effectiveCostPerKg.toString(),
          status: s.stockLot.status,
          isActive: s.stockLot.isActive,
          sourceTicket: s.stockLot.sourcePurchaseTicket
            ? {
                id: s.stockLot.sourcePurchaseTicket.id,
                ticketNo: s.stockLot.sourcePurchaseTicket.ticketNo,
              }
            : null,
        }
      : null,
    salesNo: s.salesNo,
    buyerName: s.buyerName,
    saleType: s.saleType as SaleType,
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
  };
}

// ─── Eligible lot for /sales/new picker ──────────────────────────────────────

export type EligibleLotForSaleDTO = {
  id: string;
  branchId: string;
  branch: SalesBranchDTO | null;
  lotNo: string;
  rubberType: string;
  remainingWeight: string;
  effectiveCostPerKg: string;
  sourceTicket: { id: string; ticketNo: string } | null;
};

type EligibleLotSource = Pick<
  StockLot,
  | "id"
  | "branchId"
  | "lotNo"
  | "rubberType"
  | "remainingWeight"
  | "effectiveCostPerKg"
> & {
  branch?: Pick<Branch, "id" | "code" | "name"> | null;
  sourcePurchaseTicket?: Pick<PurchaseTicket, "id" | "ticketNo"> | null;
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
  };
}
