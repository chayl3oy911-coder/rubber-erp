import type {
  AppUser,
  Branch,
  Customer,
  PurchaseTicket,
  StockLot,
  StockMovement,
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
        "id" | "ticketNo" | "netWeight" | "totalAmount" | "status" | "isActive"
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
  return {
    id: l.id,
    branchId: l.branchId,
    branch: l.branch
      ? { id: l.branch.id, code: l.branch.code, name: l.branch.name }
      : null,
    sourcePurchaseTicketId: l.sourcePurchaseTicketId,
    sourceTicket: l.sourcePurchaseTicket
      ? {
          id: l.sourcePurchaseTicket.id,
          ticketNo: l.sourcePurchaseTicket.ticketNo,
          netWeight: l.sourcePurchaseTicket.netWeight.toString(),
          totalAmount: l.sourcePurchaseTicket.totalAmount.toString(),
          status: l.sourcePurchaseTicket.status,
          isActive: l.sourcePurchaseTicket.isActive,
          customer: l.sourcePurchaseTicket.customer
            ? {
                id: l.sourcePurchaseTicket.customer.id,
                code: l.sourcePurchaseTicket.customer.code,
                fullName: l.sourcePurchaseTicket.customer.fullName,
              }
            : null,
        }
      : null,
    lotNo: l.lotNo,
    rubberType: l.rubberType,
    initialWeight: l.initialWeight.toString(),
    remainingWeight: l.remainingWeight.toString(),
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
  };
}
