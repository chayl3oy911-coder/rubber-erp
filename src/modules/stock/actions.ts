"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { requirePermission } from "@/shared/auth/dal";

import type {
  AdjustStockActionState,
  AdjustStockFieldKey,
  AdjustStockFormValues,
  CreateLotActionState,
} from "./action-state";
import { adjustStockSchema, createLotFromPurchaseSchema } from "./schemas";
import {
  CannotAdjustDepletedError,
  InsufficientStockError,
  PurchaseTicketBranchMismatchForStockError,
  PurchaseTicketInactiveError,
  PurchaseTicketNotApprovedError,
  PurchaseTicketNotFoundForStockError,
  StockBranchNotInScopeError,
  StockLotAlreadyExistsError,
  StockLotAutoGenError,
  StockLotNotFoundError,
  adjustStock,
  createLotFromPurchase,
  type StockAuditMeta,
} from "./service";
import type {
  StockAdjustmentDirection,
  StockAdjustmentReason,
} from "./types";

async function buildAuditMeta(): Promise<StockAuditMeta> {
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

// ─── Create lot from purchase ────────────────────────────────────────────────

/**
 * Bound by the caller with the purchase ticket id (via `.bind(null, ...)` or
 * a hidden field) — keeping it as a plain async fn lets us invoke directly
 * from `<form action={fn}>` with `redirect()` for navigation.
 */
export async function createLotFromPurchaseAction(
  purchaseTicketId: string,
  _formData: FormData,
): Promise<void> {
  const me = await requirePermission("stock.create");

  const parsed = createLotFromPurchaseSchema.safeParse({
    purchaseTicketId,
  });
  if (!parsed.success) {
    redirect("/stock/from-purchase");
  }

  let createdId: string | null = null;
  try {
    const created = await createLotFromPurchase(
      me,
      parsed.data,
      await buildAuditMeta(),
    );
    createdId = created.id;
  } catch (error) {
    if (
      error instanceof PurchaseTicketNotFoundForStockError ||
      error instanceof PurchaseTicketBranchMismatchForStockError
    ) {
      redirect("/stock/from-purchase?error=notFound");
    }
    if (error instanceof PurchaseTicketNotApprovedError) {
      redirect("/stock/from-purchase?error=notApproved");
    }
    if (error instanceof PurchaseTicketInactiveError) {
      redirect("/stock/from-purchase?error=inactive");
    }
    if (error instanceof StockLotAlreadyExistsError) {
      redirect("/stock/from-purchase?error=duplicate");
    }
    if (error instanceof StockLotAutoGenError) {
      redirect("/stock/from-purchase?error=autoGen");
    }
    throw error;
  }

  redirect(`/stock/${createdId}`);
}

// ─── Adjust stock ────────────────────────────────────────────────────────────

function collectAdjustForm(formData: FormData): AdjustStockFormValues {
  const direction = emptyToUndefined(formData.get("adjustmentType")) as
    | StockAdjustmentDirection
    | undefined;
  const reason = emptyToUndefined(formData.get("reasonType")) as
    | StockAdjustmentReason
    | undefined;
  return {
    stockLotId: emptyToUndefined(formData.get("stockLotId")),
    adjustmentType: direction,
    quantity: emptyToUndefined(formData.get("quantity")),
    reasonType: reason,
    note: emptyToUndefined(formData.get("note")),
  };
}

export async function adjustStockAction(
  _prev: AdjustStockActionState,
  formData: FormData,
): Promise<AdjustStockActionState> {
  const me = await requirePermission("stock.adjust");

  const raw = collectAdjustForm(formData);

  const parsed = adjustStockSchema.safeParse({
    stockLotId: raw.stockLotId ?? "",
    adjustmentType: raw.adjustmentType ?? "",
    quantity: raw.quantity ?? "",
    reasonType: raw.reasonType ?? "",
    note: raw.note ?? "",
  });

  if (!parsed.success) {
    const fieldErrors: AdjustStockActionState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const head = issue.path[0];
      const key =
        typeof head === "string" || typeof head === "number"
          ? (String(head) as AdjustStockFieldKey)
          : undefined;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors, values: raw };
  }

  let lotId = parsed.data.stockLotId;
  try {
    const updated = await adjustStock(me, parsed.data, await buildAuditMeta());
    lotId = updated.id;
  } catch (error) {
    if (error instanceof StockLotNotFoundError) {
      redirect("/stock");
    }
    if (error instanceof StockBranchNotInScopeError) {
      redirect("/stock");
    }
    if (error instanceof InsufficientStockError) {
      return {
        fieldErrors: { quantity: error.message },
        values: raw,
      };
    }
    if (error instanceof CannotAdjustDepletedError) {
      return {
        fieldErrors: { adjustmentType: error.message },
        values: raw,
      };
    }
    throw error;
  }

  redirect(`/stock/${lotId}`);
}
