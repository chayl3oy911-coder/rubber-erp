"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { requirePermission } from "@/shared/auth/dal";

import type {
  ReceivingBankAccountErrors,
  ReceivingBankAccountFieldKey,
  ReceivingEntityActionState,
  ReceivingEntityFormValues,
  ReceivingEntityScalarFieldKey,
  ReceivingFormBankAccountValues,
} from "./action-state";
import {
  createReceivingEntitySchema,
  updateReceivingEntitySchema,
} from "./schemas";
import {
  ReceivingBankAccountConflictError,
  ReceivingBankAccountValidationError,
  ReceivingDefaultReassignRequiredError,
  ReceivingEntityBranchNotInScopeError,
  ReceivingEntityNotFoundError,
  ReceivingPrimaryReassignRequiredError,
  createReceivingEntity,
  setReceivingEntityDefault,
  updateReceivingEntity,
  type ReceivingAuditMeta,
} from "./service";
import {
  MAX_BANK_ACCOUNTS_PER_RECEIVING_ENTITY,
  type ReceivingEntityType,
} from "./types";

const SETTINGS_LIST_PATH = "/settings/receiving-accounts";

async function buildAuditMeta(): Promise<ReceivingAuditMeta> {
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

function readBoolean(
  formData: FormData,
  key: string,
): boolean {
  const raw = formData.get(key);
  return raw === "true" || raw === "on" || raw === "1";
}

function collectScalarForm(formData: FormData): {
  branchId?: string;
  type?: string;
  name?: string;
  taxId?: string;
  address?: string;
  isDefault: boolean;
  isActive: boolean;
} {
  return {
    // branchId="" (the "ทุกสาขา" option) maps to undefined here so the
    // service treats it as "company-wide" (branchId IS NULL).
    branchId: emptyToUndefined(formData.get("branchId")),
    type: emptyToUndefined(formData.get("type")),
    name: emptyToUndefined(formData.get("name")),
    taxId: emptyToUndefined(formData.get("taxId")),
    address: emptyToUndefined(formData.get("address")),
    isDefault: readBoolean(formData, "isDefault"),
    isActive: readBoolean(formData, "isActive"),
  };
}

/**
 * Read repeated bank-account inputs. Form layout (matches customer module):
 *
 *   bankAccounts[i].id              (only present on edit)
 *   bankAccounts[i].bankName        = "KBANK"
 *   bankAccounts[i].bankAccountNo   = "123-..."
 *   bankAccounts[i].bankAccountName = "บจก. เอเวอร์รับเบอร์"
 *   bankAccounts[i].isPrimary       = "true" | undefined
 *   bankAccounts[i].isActive        = "true" | undefined
 *
 * Empty rows (no bank + no account no.) are dropped silently.
 */
function collectBankAccountForm(
  formData: FormData,
): ReceivingFormBankAccountValues[] {
  const rows: ReceivingFormBankAccountValues[] = [];
  for (let i = 0; i < MAX_BANK_ACCOUNTS_PER_RECEIVING_ENTITY; i++) {
    const id = emptyToUndefined(formData.get(`bankAccounts[${i}].id`));
    const bankName = emptyToUndefined(formData.get(`bankAccounts[${i}].bankName`));
    const bankAccountNo = emptyToUndefined(
      formData.get(`bankAccounts[${i}].bankAccountNo`),
    );
    const bankAccountName = emptyToUndefined(
      formData.get(`bankAccounts[${i}].bankAccountName`),
    );
    const isPrimary = readBoolean(formData, `bankAccounts[${i}].isPrimary`);
    // isActive defaults to TRUE when the form omits the toggle (new rows).
    const hasIsActiveField =
      formData.get(`bankAccounts[${i}].isActive`) !== null ||
      formData.get(`bankAccounts[${i}].id`) !== null;
    const isActive = hasIsActiveField
      ? readBoolean(formData, `bankAccounts[${i}].isActive`)
      : true;

    if (!id && !bankName && !bankAccountNo && !bankAccountName && !isPrimary) {
      continue;
    }

    rows.push({
      id,
      bankName,
      bankAccountNo,
      bankAccountName,
      isPrimary,
      isActive,
    });
  }
  return rows;
}

function valuesFor(
  scalar: ReturnType<typeof collectScalarForm>,
  bankAccounts: ReceivingFormBankAccountValues[],
): ReceivingEntityFormValues {
  return {
    branchId: scalar.branchId ?? "",
    type: scalar.type as ReceivingEntityType | undefined,
    name: scalar.name,
    taxId: scalar.taxId,
    address: scalar.address,
    isDefault: scalar.isDefault,
    isActive: scalar.isActive,
    bankAccounts,
  };
}

function applyBankAccountIssue(
  errors: ReceivingBankAccountErrors,
  path: ReadonlyArray<PropertyKey>,
  message: string,
): void {
  if (path.length < 2) {
    if (!errors.general) errors.general = message;
    return;
  }
  const idx = path[1];
  if (typeof idx !== "number" || !Number.isInteger(idx) || idx < 0) {
    if (!errors.general) errors.general = message;
    return;
  }
  const rows = (errors.rows ??= []);
  const row = (rows[idx] ??= {});
  const fieldKey = path[2];
  if (typeof fieldKey !== "string") {
    if (!errors.general) errors.general = message;
    return;
  }
  const k = fieldKey as ReceivingBankAccountFieldKey;
  if (!row[k]) row[k] = message;
}

// ─── Create ─────────────────────────────────────────────────────────────────

export async function createReceivingEntityAction(
  _prev: ReceivingEntityActionState,
  formData: FormData,
): Promise<ReceivingEntityActionState> {
  const me = await requirePermission("settings.receivingAccount.create");

  const scalar = collectScalarForm(formData);
  const bankAccounts = collectBankAccountForm(formData);
  const values = valuesFor(scalar, bankAccounts);

  const parsed = createReceivingEntitySchema.safeParse({
    branchId: scalar.branchId,
    type: scalar.type ?? "",
    name: scalar.name ?? "",
    taxId: scalar.taxId,
    address: scalar.address,
    isDefault: scalar.isDefault,
    bankAccounts,
  });

  if (!parsed.success) {
    const fieldErrors: ReceivingEntityActionState["fieldErrors"] = {};
    const bankAccountErrors: ReceivingBankAccountErrors = {};
    for (const issue of parsed.error.issues) {
      const head = issue.path[0];
      if (head === "bankAccounts") {
        applyBankAccountIssue(bankAccountErrors, issue.path, issue.message);
        continue;
      }
      const k = head as ReceivingEntityScalarFieldKey | undefined;
      if (k && !fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return {
      fieldErrors,
      bankAccountErrors:
        bankAccountErrors.general || bankAccountErrors.rows
          ? bankAccountErrors
          : undefined,
      values,
    };
  }

  try {
    await createReceivingEntity(me, parsed.data, await buildAuditMeta());
  } catch (error) {
    if (error instanceof ReceivingEntityBranchNotInScopeError) {
      return { fieldErrors: { branchId: error.message }, values };
    }
    if (
      error instanceof ReceivingBankAccountConflictError ||
      error instanceof ReceivingBankAccountValidationError
    ) {
      return {
        bankAccountErrors: { general: error.message },
        values,
      };
    }
    throw error;
  }

  redirect(SETTINGS_LIST_PATH);
}

// ─── Update ─────────────────────────────────────────────────────────────────

export async function updateReceivingEntityAction(
  receivingEntityId: string,
  _prev: ReceivingEntityActionState,
  formData: FormData,
): Promise<ReceivingEntityActionState> {
  const me = await requirePermission("settings.receivingAccount.update");

  const scalar = collectScalarForm(formData);
  const bankAccounts = collectBankAccountForm(formData);
  const values = valuesFor(scalar, bankAccounts);

  const parsed = updateReceivingEntitySchema.safeParse({
    type: scalar.type,
    name: scalar.name,
    taxId: scalar.taxId,
    address: scalar.address,
    isDefault: scalar.isDefault,
    isActive: scalar.isActive,
    bankAccounts,
  });

  if (!parsed.success) {
    const fieldErrors: ReceivingEntityActionState["fieldErrors"] = {};
    const bankAccountErrors: ReceivingBankAccountErrors = {};
    let topLevelError: string | undefined;
    for (const issue of parsed.error.issues) {
      if (issue.path.length === 0) {
        if (!topLevelError) topLevelError = issue.message;
        continue;
      }
      const head = issue.path[0];
      if (head === "bankAccounts") {
        applyBankAccountIssue(bankAccountErrors, issue.path, issue.message);
        continue;
      }
      const k = head as ReceivingEntityScalarFieldKey | undefined;
      if (k && !fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return {
      fieldErrors,
      bankAccountErrors:
        bankAccountErrors.general || bankAccountErrors.rows
          ? bankAccountErrors
          : undefined,
      error: topLevelError,
      values,
    };
  }

  try {
    await updateReceivingEntity(
      me,
      receivingEntityId,
      parsed.data,
      await buildAuditMeta(),
    );
  } catch (error) {
    if (error instanceof ReceivingEntityNotFoundError) {
      redirect(SETTINGS_LIST_PATH);
    }
    if (
      error instanceof ReceivingBankAccountConflictError ||
      error instanceof ReceivingBankAccountValidationError
    ) {
      return {
        bankAccountErrors: { general: error.message },
        values,
      };
    }
    if (
      error instanceof ReceivingPrimaryReassignRequiredError ||
      error instanceof ReceivingDefaultReassignRequiredError
    ) {
      return { error: error.message, values };
    }
    throw error;
  }

  redirect(SETTINGS_LIST_PATH);
}

// ─── Toggle active / set-default (single-purpose actions) ───────────────────

export async function toggleReceivingEntityActiveAction(
  receivingEntityId: string,
  nextIsActive: boolean,
): Promise<void> {
  const me = await requirePermission(
    nextIsActive
      ? "settings.receivingAccount.update"
      : "settings.receivingAccount.deactivate",
  );
  try {
    await updateReceivingEntity(
      me,
      receivingEntityId,
      { isActive: nextIsActive },
      await buildAuditMeta(),
    );
  } catch (error) {
    if (error instanceof ReceivingEntityNotFoundError) {
      redirect(SETTINGS_LIST_PATH);
    }
    if (
      error instanceof ReceivingDefaultReassignRequiredError ||
      error instanceof ReceivingBankAccountValidationError
    ) {
      redirect(
        `${SETTINGS_LIST_PATH}?error=${encodeURIComponent(error.message)}`,
      );
    }
    throw error;
  }
  redirect(SETTINGS_LIST_PATH);
}

export async function setReceivingEntityDefaultAction(
  receivingEntityId: string,
  isDefault: boolean,
): Promise<void> {
  const me = await requirePermission("settings.receivingAccount.update");
  try {
    await setReceivingEntityDefault(
      me,
      receivingEntityId,
      isDefault,
      await buildAuditMeta(),
    );
  } catch (error) {
    if (error instanceof ReceivingEntityNotFoundError) {
      redirect(SETTINGS_LIST_PATH);
    }
    if (error instanceof ReceivingBankAccountValidationError) {
      redirect(
        `${SETTINGS_LIST_PATH}?error=${encodeURIComponent(error.message)}`,
      );
    }
    throw error;
  }
  redirect(SETTINGS_LIST_PATH);
}
