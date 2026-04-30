"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { requirePermission } from "@/shared/auth/dal";

import type {
  CustomerActionState,
  CustomerBankAccountErrors,
  CustomerBankAccountFieldKey,
  CustomerFormBankAccountValues,
  CustomerFormValues,
  CustomerScalarFieldKey,
} from "./action-state";
import {
  createCustomerSchema,
  MAX_BANK_ACCOUNTS_PER_CUSTOMER,
  updateCustomerSchema,
} from "./schemas";
import {
  BranchNotInScopeError,
  CustomerBankAccountConflictError,
  CustomerBankAccountValidationError,
  CustomerCodeAutoGenError,
  CustomerCodeConflictError,
  CustomerNotFoundError,
  createCustomer,
  setCustomerActive,
  updateCustomer,
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

function collectScalarForm(formData: FormData): {
  branchId?: string;
  code?: string;
  fullName?: string;
  phone?: string;
  nationalId?: string;
  notes?: string;
} {
  return {
    branchId: emptyToUndefined(formData.get("branchId")),
    code: emptyToUndefined(formData.get("code")),
    fullName: emptyToUndefined(formData.get("fullName")),
    phone: emptyToUndefined(formData.get("phone")),
    nationalId: emptyToUndefined(formData.get("nationalId")),
    notes: emptyToUndefined(formData.get("notes")),
  };
}

/**
 * Read repeated bank-account inputs from the form. Form layout:
 *
 *   bankAccounts[0].bankName       = "KBANK"
 *   bankAccounts[0].bankAccountNo  = "123-..."
 *   bankAccounts[0].accountName    = "John"
 *   bankAccounts[0].isPrimary      = "true" | undefined
 *
 * We accept up to MAX_BANK_ACCOUNTS_PER_CUSTOMER rows; extra indices are
 * dropped silently because the UI never renders more than that. Empty rows
 * (no bank + no account no.) are skipped.
 */
function collectBankAccountForm(
  formData: FormData,
): CustomerFormBankAccountValues[] {
  const rows: CustomerFormBankAccountValues[] = [];
  for (let i = 0; i < MAX_BANK_ACCOUNTS_PER_CUSTOMER; i++) {
    const bankName = emptyToUndefined(formData.get(`bankAccounts[${i}].bankName`));
    const bankAccountNo = emptyToUndefined(
      formData.get(`bankAccounts[${i}].bankAccountNo`),
    );
    const accountName = emptyToUndefined(
      formData.get(`bankAccounts[${i}].accountName`),
    );
    const isPrimaryRaw = formData.get(`bankAccounts[${i}].isPrimary`);
    const isPrimary =
      isPrimaryRaw === "true" || isPrimaryRaw === "on" || isPrimaryRaw === "1";

    if (!bankName && !bankAccountNo && !accountName && !isPrimary) continue;

    rows.push({
      bankName,
      bankAccountNo,
      accountName,
      isPrimary,
    });
  }
  return rows;
}

function valuesFor(
  scalar: ReturnType<typeof collectScalarForm>,
  bankAccounts: CustomerFormBankAccountValues[],
): CustomerFormValues {
  return { ...scalar, bankAccounts };
}

/**
 * Map a Zod issue path back onto the (possibly indexed) bank-account error
 * structure. Path layout:
 *   ["bankAccounts"]                     → general
 *   ["bankAccounts", 0]                  → rows[0].general (we promote to general)
 *   ["bankAccounts", 0, "bankName"]      → rows[0].bankName
 */
function applyBankAccountIssue(
  errors: CustomerBankAccountErrors,
  path: ReadonlyArray<PropertyKey>,
  message: string,
): void {
  // Zod v4 typed `path` as `PropertyKey[]` (string | number | symbol). Object
  // schema keys can never be symbols at runtime, but the type allows them, so
  // we narrow defensively. Any symbol segment → general error (best UX since
  // we can't render a symbol path back to the user).
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
  const k = fieldKey as CustomerBankAccountFieldKey;
  if (!row[k]) row[k] = message;
}

export async function createCustomerAction(
  _prev: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const me = await requirePermission("customer.create");

  const scalar = collectScalarForm(formData);
  const bankAccounts = collectBankAccountForm(formData);
  const values = valuesFor(scalar, bankAccounts);

  const parsed = createCustomerSchema.safeParse({
    branchId: scalar.branchId ?? "",
    code: scalar.code ?? "",
    fullName: scalar.fullName ?? "",
    phone: scalar.phone,
    nationalId: scalar.nationalId,
    notes: scalar.notes,
    bankAccounts,
  });

  if (!parsed.success) {
    const fieldErrors: CustomerActionState["fieldErrors"] = {};
    const bankAccountErrors: CustomerBankAccountErrors = {};
    for (const issue of parsed.error.issues) {
      const head = issue.path[0];
      if (head === "bankAccounts") {
        applyBankAccountIssue(bankAccountErrors, issue.path, issue.message);
        continue;
      }
      const k = head as CustomerScalarFieldKey | undefined;
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
    await createCustomer(me, parsed.data, await buildAuditMeta());
  } catch (error) {
    if (error instanceof CustomerCodeConflictError) {
      return { fieldErrors: { code: error.message }, values };
    }
    if (error instanceof BranchNotInScopeError) {
      return { fieldErrors: { branchId: error.message }, values };
    }
    if (error instanceof CustomerCodeAutoGenError) {
      return { error: error.message, values };
    }
    if (
      error instanceof CustomerBankAccountConflictError ||
      error instanceof CustomerBankAccountValidationError
    ) {
      return {
        bankAccountErrors: { general: error.message },
        values,
      };
    }
    throw error;
  }

  redirect("/customers");
}

export async function updateCustomerAction(
  customerId: string,
  _prev: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const me = await requirePermission("customer.update");

  const scalar = collectScalarForm(formData);
  const bankAccounts = collectBankAccountForm(formData);
  const values = valuesFor(scalar, bankAccounts);

  const parsed = updateCustomerSchema.safeParse({
    code: scalar.code,
    fullName: scalar.fullName,
    phone: scalar.phone,
    nationalId: scalar.nationalId,
    notes: scalar.notes,
    bankAccounts,
  });

  if (!parsed.success) {
    const fieldErrors: CustomerActionState["fieldErrors"] = {};
    const bankAccountErrors: CustomerBankAccountErrors = {};
    for (const issue of parsed.error.issues) {
      const head = issue.path[0];
      if (head === "bankAccounts") {
        applyBankAccountIssue(bankAccountErrors, issue.path, issue.message);
        continue;
      }
      const k = head as CustomerScalarFieldKey | undefined;
      if (k && !fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return {
      fieldErrors,
      bankAccountErrors:
        bankAccountErrors.general || bankAccountErrors.rows
          ? bankAccountErrors
          : undefined,
      error:
        parsed.error.issues.find((i) => i.path.length === 0)?.message ??
        undefined,
      values,
    };
  }

  try {
    await updateCustomer(me, customerId, parsed.data, await buildAuditMeta());
  } catch (error) {
    if (error instanceof CustomerNotFoundError) {
      redirect("/customers");
    }
    if (error instanceof CustomerCodeConflictError) {
      return { fieldErrors: { code: error.message }, values };
    }
    if (
      error instanceof CustomerBankAccountConflictError ||
      error instanceof CustomerBankAccountValidationError
    ) {
      return {
        bankAccountErrors: { general: error.message },
        values,
      };
    }
    throw error;
  }

  redirect("/customers");
}

export async function toggleCustomerActiveAction(
  customerId: string,
  isActive: boolean,
): Promise<void> {
  const me = await requirePermission("customer.update");
  try {
    await setCustomerActive(me, customerId, isActive, await buildAuditMeta());
  } catch (error) {
    if (error instanceof CustomerNotFoundError) {
      redirect("/customers");
    }
    throw error;
  }
  redirect("/customers");
}
