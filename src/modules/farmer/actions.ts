"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { requirePermission } from "@/shared/auth/dal";

import type {
  FarmerActionState,
  FarmerFieldKey,
} from "./action-state";
import {
  createFarmerSchema,
  updateFarmerSchema,
} from "./schemas";
import {
  BranchNotInScopeError,
  FarmerCodeAutoGenError,
  FarmerCodeConflictError,
  FarmerNotFoundError,
  createFarmer,
  setFarmerActive,
  updateFarmer,
  type AuditMeta,
} from "./service";

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

function collectRawForm(formData: FormData) {
  return {
    branchId: emptyToUndefined(formData.get("branchId")),
    code: emptyToUndefined(formData.get("code")),
    fullName: emptyToUndefined(formData.get("fullName")),
    phone: emptyToUndefined(formData.get("phone")),
    nationalId: emptyToUndefined(formData.get("nationalId")),
    bankName: emptyToUndefined(formData.get("bankName")),
    bankAccountNo: emptyToUndefined(formData.get("bankAccountNo")),
    notes: emptyToUndefined(formData.get("notes")),
  };
}

export async function createFarmerAction(
  _prev: FarmerActionState,
  formData: FormData,
): Promise<FarmerActionState> {
  const me = await requirePermission("farmer.create");

  const raw = collectRawForm(formData);

  const parsed = createFarmerSchema.safeParse({
    branchId: raw.branchId ?? "",
    code: raw.code ?? "",
    fullName: raw.fullName ?? "",
    phone: raw.phone,
    nationalId: raw.nationalId,
    bankName: raw.bankName,
    bankAccountNo: raw.bankAccountNo,
    notes: raw.notes,
  });

  if (!parsed.success) {
    const fieldErrors: FarmerActionState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0] as FarmerFieldKey | undefined;
      if (k && !fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return { fieldErrors, values: raw };
  }

  try {
    await createFarmer(me, parsed.data, await buildAuditMeta());
  } catch (error) {
    if (error instanceof FarmerCodeConflictError) {
      return {
        fieldErrors: { code: error.message },
        values: raw,
      };
    }
    if (error instanceof BranchNotInScopeError) {
      return {
        fieldErrors: { branchId: error.message },
        values: raw,
      };
    }
    if (error instanceof FarmerCodeAutoGenError) {
      return {
        error: error.message,
        values: raw,
      };
    }
    throw error;
  }

  redirect("/farmers");
}

export async function updateFarmerAction(
  farmerId: string,
  _prev: FarmerActionState,
  formData: FormData,
): Promise<FarmerActionState> {
  const me = await requirePermission("farmer.update");

  const raw = collectRawForm(formData);

  const parsed = updateFarmerSchema.safeParse({
    code: raw.code,
    fullName: raw.fullName,
    phone: raw.phone,
    nationalId: raw.nationalId,
    bankName: raw.bankName,
    bankAccountNo: raw.bankAccountNo,
    notes: raw.notes,
  });

  if (!parsed.success) {
    const fieldErrors: FarmerActionState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0] as FarmerFieldKey | undefined;
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
    await updateFarmer(me, farmerId, parsed.data, await buildAuditMeta());
  } catch (error) {
    if (error instanceof FarmerNotFoundError) {
      redirect("/farmers");
    }
    if (error instanceof FarmerCodeConflictError) {
      return {
        fieldErrors: { code: error.message },
        values: raw,
      };
    }
    throw error;
  }

  redirect("/farmers");
}

export async function toggleFarmerActiveAction(
  farmerId: string,
  isActive: boolean,
): Promise<void> {
  const me = await requirePermission("farmer.update");
  try {
    await setFarmerActive(me, farmerId, isActive, await buildAuditMeta());
  } catch (error) {
    if (error instanceof FarmerNotFoundError) {
      redirect("/farmers");
    }
    throw error;
  }
  redirect("/farmers");
}
