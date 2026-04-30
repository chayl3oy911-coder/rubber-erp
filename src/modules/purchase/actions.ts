"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { requirePermission } from "@/shared/auth/dal";

import type {
  PurchaseActionState,
  PurchaseFieldKey,
} from "./action-state";
import {
  createPurchaseSchema,
  transitionStatusSchema,
  updatePurchaseFieldsSchema,
} from "./schemas";
import {
  BranchNotInScopeError,
  CancelReasonRequiredError,
  FarmerBranchMismatchError,
  FarmerInactiveError,
  FarmerNotFoundForPurchaseError,
  PurchaseAutoGenError,
  PurchaseNotFoundError,
  StatusFieldsLockedError,
  StatusTransitionError,
  createPurchase,
  transitionPurchaseStatus,
  updatePurchaseFields,
  type AuditMeta,
} from "./service";
import { type PurchaseStatus } from "./status";

async function buildAuditMeta(): Promise<AuditMeta> {
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
    farmerId: emptyToUndefined(formData.get("farmerId")),
    rubberType: emptyToUndefined(formData.get("rubberType")),
    grossWeight: emptyToUndefined(formData.get("grossWeight")),
    tareWeight: emptyToUndefined(formData.get("tareWeight")),
    pricePerKg: emptyToUndefined(formData.get("pricePerKg")),
    withholdingTaxPercent: emptyToUndefined(
      formData.get("withholdingTaxPercent"),
    ),
    note: emptyToUndefined(formData.get("note")),
  };
}

function collectUpdateForm(formData: FormData) {
  return {
    rubberType: emptyToUndefined(formData.get("rubberType")),
    grossWeight: emptyToUndefined(formData.get("grossWeight")),
    tareWeight: emptyToUndefined(formData.get("tareWeight")),
    pricePerKg: emptyToUndefined(formData.get("pricePerKg")),
    withholdingTaxPercent: emptyToUndefined(
      formData.get("withholdingTaxPercent"),
    ),
    note: emptyToUndefined(formData.get("note")),
  };
}

export async function createPurchaseAction(
  _prev: PurchaseActionState,
  formData: FormData,
): Promise<PurchaseActionState> {
  const me = await requirePermission("purchase.create");

  const raw = collectCreateForm(formData);

  const parsed = createPurchaseSchema.safeParse({
    branchId: raw.branchId ?? "",
    farmerId: raw.farmerId ?? "",
    rubberType: raw.rubberType ?? "",
    grossWeight: raw.grossWeight ?? "",
    // tareWeight and withholdingTaxPercent are optional → leave undefined
    // when blank so Zod's `.default(0)` kicks in.
    tareWeight: raw.tareWeight,
    pricePerKg: raw.pricePerKg ?? "",
    withholdingTaxPercent: raw.withholdingTaxPercent,
    note: raw.note,
  });
  if (!parsed.success) {
    const fieldErrors: PurchaseActionState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0] as PurchaseFieldKey | undefined;
      if (k && !fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return { fieldErrors, values: raw };
  }

  let createdId: string | null = null;
  try {
    const created = await createPurchase(me, parsed.data, await buildAuditMeta());
    createdId = created.id;
  } catch (error) {
    if (error instanceof BranchNotInScopeError) {
      return { fieldErrors: { branchId: error.message }, values: raw };
    }
    if (
      error instanceof FarmerNotFoundForPurchaseError ||
      error instanceof FarmerBranchMismatchError ||
      error instanceof FarmerInactiveError
    ) {
      return { fieldErrors: { farmerId: error.message }, values: raw };
    }
    if (error instanceof PurchaseAutoGenError) {
      return { error: error.message, values: raw };
    }
    throw error;
  }

  redirect(`/purchases/${createdId}`);
}

export async function updatePurchaseAction(
  purchaseId: string,
  _prev: PurchaseActionState,
  formData: FormData,
): Promise<PurchaseActionState> {
  const me = await requirePermission("purchase.update");

  const raw = collectUpdateForm(formData);

  const parsed = updatePurchaseFieldsSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: PurchaseActionState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0] as PurchaseFieldKey | undefined;
      if (k && !fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return {
      fieldErrors,
      error:
        parsed.error.issues.find((i) => i.path.length === 0)?.message ??
        undefined,
      values: raw,
    };
  }

  try {
    await updatePurchaseFields(
      me,
      purchaseId,
      parsed.data,
      await buildAuditMeta(),
    );
  } catch (error) {
    if (error instanceof PurchaseNotFoundError) {
      redirect("/purchases");
    }
    if (error instanceof StatusFieldsLockedError) {
      return {
        fieldErrors: { [error.field]: error.message },
        values: raw,
      };
    }
    throw error;
  }

  redirect(`/purchases/${purchaseId}`);
}

/**
 * Single entry-point for status transitions used by `<form action={…}>`
 * buttons. The caller binds `purchaseId` and `to`, plus optionally pulls
 * `cancelReason` from form input.
 */
export async function transitionPurchaseStatusAction(
  purchaseId: string,
  to: PurchaseStatus,
  formData: FormData,
): Promise<void> {
  // Determine the permission required for THIS transition. Service double-
  // checks too, but we want the requirePermission redirect (to /forbidden)
  // to fire here at the action boundary.
  // Note: we can't know `from` without a query, so we pessimistically check
  // the most-restrictive permission for the target status.
  const permission =
    to === "APPROVED"
      ? "purchase.approve"
      : to === "CANCELLED"
        ? "purchase.cancel"
        : "purchase.update";

  const me = await requirePermission(permission);

  const cancelReason = emptyToUndefined(formData.get("cancelReason"));

  // Quick shape check (status enum) — service does the real transition logic.
  const parsed = transitionStatusSchema.safeParse({
    status: to,
    cancelReason,
  });
  if (!parsed.success) {
    redirect(`/purchases/${purchaseId}`);
  }

  try {
    await transitionPurchaseStatus(
      me,
      purchaseId,
      to,
      cancelReason,
      await buildAuditMeta(),
    );
  } catch (error) {
    if (error instanceof PurchaseNotFoundError) {
      redirect("/purchases");
    }
    if (
      error instanceof StatusTransitionError ||
      error instanceof CancelReasonRequiredError
    ) {
      // Best UX is to re-show the detail page with a flash error, but until
      // we have a flash framework, redirect with a query param the page can
      // render conditionally.
      redirect(`/purchases/${purchaseId}?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }

  redirect(`/purchases/${purchaseId}`);
}
