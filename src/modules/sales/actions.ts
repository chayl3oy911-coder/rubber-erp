"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { requirePermission } from "@/shared/auth/dal";

import type {
  SalesActionState,
  SalesFieldKey,
} from "./action-state";
import {
  createSalesSchema,
  transitionStatusSchema,
  updateSalesFieldsSchema,
} from "./schemas";
import {
  SalesAutoGenError,
  SalesBranchNotInScopeError,
  SalesCancelReasonRequiredError,
  SalesInsufficientStockError,
  SalesNotFoundError,
  SalesStatusFieldsLockedError,
  SalesStatusTransitionError,
  SalesStockLotBranchMismatchError,
  SalesStockLotInactiveError,
  SalesStockLotNotActiveError,
  SalesStockLotNotFoundError,
  createSalesOrder,
  transitionSalesStatus,
  updateSalesOrderFields,
  type SalesAuditMeta,
} from "./service";
import { type SaleType, type SalesOrderStatus } from "./types";

async function buildAuditMeta(): Promise<SalesAuditMeta> {
  const h = await headers();
  return {
    ipAddress:
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      null,
    userAgent: h.get("user-agent") ?? null,
    source: "action",
  };
}

function emptyToUndefined(v: FormDataEntryValue | null): string | undefined {
  if (v === null) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
}

function collectCreateForm(formData: FormData) {
  return {
    branchId: emptyToUndefined(formData.get("branchId")),
    stockLotId: emptyToUndefined(formData.get("stockLotId")),
    buyerName: emptyToUndefined(formData.get("buyerName")),
    saleType: emptyToUndefined(formData.get("saleType")),
    grossWeight: emptyToUndefined(formData.get("grossWeight")),
    drcPercent: emptyToUndefined(formData.get("drcPercent")),
    pricePerKg: emptyToUndefined(formData.get("pricePerKg")),
    withholdingTaxPercent: emptyToUndefined(
      formData.get("withholdingTaxPercent"),
    ),
    expectedReceiveDate: emptyToUndefined(formData.get("expectedReceiveDate")),
    note: emptyToUndefined(formData.get("note")),
  };
}

function collectUpdateForm(formData: FormData) {
  return {
    buyerName: emptyToUndefined(formData.get("buyerName")),
    saleType: emptyToUndefined(formData.get("saleType")),
    grossWeight: emptyToUndefined(formData.get("grossWeight")),
    drcPercent: emptyToUndefined(formData.get("drcPercent")),
    pricePerKg: emptyToUndefined(formData.get("pricePerKg")),
    withholdingTaxPercent: emptyToUndefined(
      formData.get("withholdingTaxPercent"),
    ),
    expectedReceiveDate: emptyToUndefined(formData.get("expectedReceiveDate")),
    note: emptyToUndefined(formData.get("note")),
  };
}

export async function createSalesAction(
  _prev: SalesActionState,
  formData: FormData,
): Promise<SalesActionState> {
  const me = await requirePermission("sales.create");

  const raw = collectCreateForm(formData);

  const parsed = createSalesSchema.safeParse({
    branchId: raw.branchId ?? "",
    stockLotId: raw.stockLotId ?? "",
    buyerName: raw.buyerName ?? "",
    saleType: raw.saleType ?? "",
    grossWeight: raw.grossWeight ?? "",
    drcPercent: raw.drcPercent ?? "",
    pricePerKg: raw.pricePerKg ?? "",
    withholdingTaxPercent: raw.withholdingTaxPercent,
    expectedReceiveDate: raw.expectedReceiveDate,
    note: raw.note,
  });
  if (!parsed.success) {
    const fieldErrors: SalesActionState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const head = issue.path[0];
      const key =
        typeof head === "string" || typeof head === "number"
          ? (String(head) as SalesFieldKey)
          : undefined;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      fieldErrors,
      values: {
        ...raw,
        saleType: raw.saleType as SaleType | undefined,
      },
    };
  }

  let createdId: string | null = null;
  try {
    const created = await createSalesOrder(
      me,
      parsed.data,
      await buildAuditMeta(),
    );
    createdId = created.id;
  } catch (error) {
    if (error instanceof SalesBranchNotInScopeError) {
      return {
        fieldErrors: { branchId: error.message },
        values: { ...raw, saleType: raw.saleType as SaleType | undefined },
      };
    }
    if (
      error instanceof SalesStockLotNotFoundError ||
      error instanceof SalesStockLotBranchMismatchError ||
      error instanceof SalesStockLotInactiveError ||
      error instanceof SalesStockLotNotActiveError
    ) {
      return {
        fieldErrors: { stockLotId: error.message },
        values: { ...raw, saleType: raw.saleType as SaleType | undefined },
      };
    }
    if (error instanceof SalesInsufficientStockError) {
      return {
        fieldErrors: { grossWeight: error.message },
        values: { ...raw, saleType: raw.saleType as SaleType | undefined },
      };
    }
    if (error instanceof SalesAutoGenError) {
      return {
        error: error.message,
        values: { ...raw, saleType: raw.saleType as SaleType | undefined },
      };
    }
    throw error;
  }

  redirect(`/sales/${createdId}`);
}

export async function updateSalesAction(
  salesOrderId: string,
  _prev: SalesActionState,
  formData: FormData,
): Promise<SalesActionState> {
  const me = await requirePermission("sales.create");

  const raw = collectUpdateForm(formData);

  const parsed = updateSalesFieldsSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: SalesActionState["fieldErrors"] = {};
    let topLevelError: string | undefined;
    for (const issue of parsed.error.issues) {
      const head = issue.path[0];
      if (issue.path.length === 0) {
        topLevelError ??= issue.message;
        continue;
      }
      const key =
        typeof head === "string" || typeof head === "number"
          ? (String(head) as SalesFieldKey)
          : undefined;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      fieldErrors,
      error: topLevelError,
      values: { ...raw, saleType: raw.saleType as SaleType | undefined },
    };
  }

  try {
    await updateSalesOrderFields(
      me,
      salesOrderId,
      parsed.data,
      await buildAuditMeta(),
    );
  } catch (error) {
    if (error instanceof SalesNotFoundError) {
      redirect("/sales");
    }
    if (error instanceof SalesStatusFieldsLockedError) {
      return {
        fieldErrors: { [error.field as SalesFieldKey]: error.message },
        values: { ...raw, saleType: raw.saleType as SaleType | undefined },
      };
    }
    if (error instanceof SalesInsufficientStockError) {
      return {
        fieldErrors: { grossWeight: error.message },
        values: { ...raw, saleType: raw.saleType as SaleType | undefined },
      };
    }
    throw error;
  }

  redirect(`/sales/${salesOrderId}`);
}

/**
 * Status transition action. Bound by the caller with `salesOrderId` and `to`.
 * `cancelReason` is read from the form for CONFIRMED → CANCELLED flow.
 */
export async function transitionSalesStatusAction(
  salesOrderId: string,
  to: SalesOrderStatus,
  formData: FormData,
): Promise<void> {
  const permission =
    to === "CONFIRMED"
      ? "sales.confirm"
      : to === "CANCELLED"
        ? "sales.cancel"
        : "sales.create";
  const me = await requirePermission(permission);

  const cancelReason = emptyToUndefined(formData.get("cancelReason"));

  const parsed = transitionStatusSchema.safeParse({ status: to, cancelReason });
  if (!parsed.success) {
    redirect(`/sales/${salesOrderId}`);
  }

  try {
    await transitionSalesStatus(
      me,
      salesOrderId,
      to,
      cancelReason,
      await buildAuditMeta(),
    );
  } catch (error) {
    if (error instanceof SalesNotFoundError) {
      redirect("/sales");
    }
    if (
      error instanceof SalesStatusTransitionError ||
      error instanceof SalesCancelReasonRequiredError ||
      error instanceof SalesInsufficientStockError ||
      error instanceof SalesStockLotNotActiveError ||
      error instanceof SalesStockLotInactiveError
    ) {
      redirect(
        `/sales/${salesOrderId}?error=${encodeURIComponent(error.message)}`,
      );
    }
    throw error;
  }

  redirect(`/sales/${salesOrderId}`);
}
