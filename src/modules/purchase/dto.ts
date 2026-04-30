import type {
  AppUser,
  Branch,
  Customer,
  PurchaseTicket,
} from "@prisma/client";

import type { PurchaseStatus } from "./status";

export type PurchaseBranchDTO = {
  id: string;
  code: string;
  name: string;
};

export type PurchaseCustomerDTO = {
  id: string;
  code: string;
  fullName: string;
  phone: string | null;
};

export type PurchaseUserDTO = {
  id: string;
  displayName: string;
};

/**
 * DTO shape consumed by API/UI. Decimals are serialized to strings so JSON
 * preserves exact precision; UI is expected to format for display.
 */
export type PurchaseTicketDTO = {
  id: string;
  branchId: string;
  branch: PurchaseBranchDTO | null;
  customerId: string;
  customer: PurchaseCustomerDTO | null;
  ticketNo: string;
  rubberType: string;
  grossWeight: string;
  tareWeight: string;
  netWeight: string;
  pricePerKg: string;
  totalAmount: string;
  withholdingTaxPercent: string;
  withholdingTaxAmount: string;
  netPayableAmount: string;
  status: PurchaseStatus;
  note: string | null;
  approvedAt: string | null;
  approvedBy: PurchaseUserDTO | null;
  cancelledAt: string | null;
  cancelledBy: PurchaseUserDTO | null;
  cancelReason: string | null;
  isActive: boolean;
  createdAt: string;
  createdBy: PurchaseUserDTO | null;
  updatedAt: string;
};

type PurchaseWithRelations = PurchaseTicket & {
  branch?: Pick<Branch, "id" | "code" | "name"> | null;
  customer?: Pick<Customer, "id" | "code" | "fullName" | "phone"> | null;
  createdBy?: Pick<AppUser, "id" | "displayName"> | null;
  approvedBy?: Pick<AppUser, "id" | "displayName"> | null;
  cancelledBy?: Pick<AppUser, "id" | "displayName"> | null;
};

function userDto(
  u: Pick<AppUser, "id" | "displayName"> | null | undefined,
): PurchaseUserDTO | null {
  return u ? { id: u.id, displayName: u.displayName } : null;
}

export function toPurchaseTicketDTO(p: PurchaseWithRelations): PurchaseTicketDTO {
  return {
    id: p.id,
    branchId: p.branchId,
    branch: p.branch
      ? { id: p.branch.id, code: p.branch.code, name: p.branch.name }
      : null,
    customerId: p.customerId,
    customer: p.customer
      ? {
          id: p.customer.id,
          code: p.customer.code,
          fullName: p.customer.fullName,
          phone: p.customer.phone,
        }
      : null,
    ticketNo: p.ticketNo,
    rubberType: p.rubberType,
    grossWeight: p.grossWeight.toString(),
    tareWeight: p.tareWeight.toString(),
    netWeight: p.netWeight.toString(),
    pricePerKg: p.pricePerKg.toString(),
    totalAmount: p.totalAmount.toString(),
    withholdingTaxPercent: p.withholdingTaxPercent.toString(),
    withholdingTaxAmount: p.withholdingTaxAmount.toString(),
    netPayableAmount: p.netPayableAmount.toString(),
    status: p.status as PurchaseStatus,
    note: p.note,
    approvedAt: p.approvedAt ? p.approvedAt.toISOString() : null,
    approvedBy: userDto(p.approvedBy),
    cancelledAt: p.cancelledAt ? p.cancelledAt.toISOString() : null,
    cancelledBy: userDto(p.cancelledBy),
    cancelReason: p.cancelReason,
    isActive: p.isActive,
    createdAt: p.createdAt.toISOString(),
    createdBy: userDto(p.createdBy),
    updatedAt: p.updatedAt.toISOString(),
  };
}
