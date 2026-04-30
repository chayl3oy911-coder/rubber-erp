"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { requirePermission } from "@/shared/auth/dal";

import type {
  BranchActionState,
  BranchFieldKey,
} from "./action-state";
import {
  createBranchSchema,
  updateBranchSchema,
  type CreateBranchInput,
} from "./schemas";
import {
  BranchCodeConflictError,
  BranchNotFoundError,
  createBranch,
  setBranchActive,
  updateBranch,
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

export async function createBranchAction(
  _prev: BranchActionState,
  formData: FormData
): Promise<BranchActionState> {
  const me = await requirePermission("branch.create");

  const raw = {
    code: emptyToUndefined(formData.get("code")) ?? "",
    name: emptyToUndefined(formData.get("name")) ?? "",
    address: emptyToUndefined(formData.get("address")),
    phone: emptyToUndefined(formData.get("phone")),
  };

  const parsed = createBranchSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: BranchActionState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0] as BranchFieldKey | undefined;
      if (k && !fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return { fieldErrors, values: raw };
  }

  try {
    await createBranch(me, parsed.data, await buildAuditMeta());
  } catch (error) {
    if (error instanceof BranchCodeConflictError) {
      return {
        fieldErrors: { code: error.message },
        values: { ...parsed.data } as BranchActionState["values"],
      };
    }
    throw error;
  }

  redirect("/branches");
}

export async function updateBranchAction(
  branchId: string,
  _prev: BranchActionState,
  formData: FormData
): Promise<BranchActionState> {
  const me = await requirePermission("branch.update");

  const raw: Partial<CreateBranchInput> & { isActive?: boolean } = {
    code: emptyToUndefined(formData.get("code")),
    name: emptyToUndefined(formData.get("name")),
    address: emptyToUndefined(formData.get("address")),
    phone: emptyToUndefined(formData.get("phone")),
  };

  const parsed = updateBranchSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: BranchActionState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0] as BranchFieldKey | undefined;
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
    await updateBranch(me, branchId, parsed.data, await buildAuditMeta());
  } catch (error) {
    if (error instanceof BranchNotFoundError) {
      redirect("/branches");
    }
    if (error instanceof BranchCodeConflictError) {
      return {
        fieldErrors: { code: error.message },
        values: raw,
      };
    }
    throw error;
  }

  redirect("/branches");
}

export async function toggleBranchActiveAction(
  branchId: string,
  isActive: boolean
): Promise<void> {
  const me = await requirePermission("branch.update");
  try {
    await setBranchActive(me, branchId, isActive, await buildAuditMeta());
  } catch (error) {
    if (error instanceof BranchNotFoundError) {
      redirect("/branches");
    }
    throw error;
  }
  redirect("/branches");
}
