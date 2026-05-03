import { z } from "zod";

import { BANK_CODES } from "@/shared/banks";

import { receivingAccountT } from "./i18n";
import {
  MAX_BANK_ACCOUNTS_PER_RECEIVING_ENTITY,
  RECEIVING_ENTITY_TYPES,
  type ReceivingEntityType,
} from "./types";

const t = receivingAccountT();

// ─── Reusable field builders ────────────────────────────────────────────────

const optionalText = (max: number, message: string) =>
  z.preprocess(
    (v) => {
      if (v === null || v === undefined) return undefined;
      const s = String(v).trim();
      return s === "" ? undefined : s;
    },
    z.string().max(max, message).optional(),
  );

const requiredText = (max: number, requiredMsg: string, tooLongMsg: string) =>
  z.preprocess(
    (v) => {
      if (v === null || v === undefined) return "";
      return String(v).trim();
    },
    z.string({ error: requiredMsg }).min(1, requiredMsg).max(max, tooLongMsg),
  );

// `optionalUuid` collapses "" / null / undefined to undefined so the API
// can accept "branchId omitted" (= company-wide) as valid input. The
// downstream service treats undefined as "branchId = null".
const optionalUuid = z.preprocess(
  (v) => {
    if (v === null || v === undefined) return undefined;
    const s = String(v).trim();
    return s === "" ? undefined : s;
  },
  z.string().uuid(t.errors.branchInvalid).optional(),
);

const requiredUuid = z.string().trim().uuid(t.errors.branchInvalid);

const typeField = z.enum(
  RECEIVING_ENTITY_TYPES as unknown as [
    ReceivingEntityType,
    ...ReceivingEntityType[],
  ],
  { error: t.errors.typeInvalid },
);

const nameField = requiredText(
  200,
  t.errors.nameRequired,
  t.errors.nameTooLong,
);

const taxIdField = z.preprocess(
  (v) => {
    if (v === null || v === undefined) return undefined;
    const s = String(v).trim();
    return s === "" ? undefined : s;
  },
  z
    .string()
    .max(30, t.errors.taxIdTooLong)
    .regex(/^[0-9-]+$/, t.errors.taxIdInvalid)
    .optional(),
);

// ─── Bank account row ───────────────────────────────────────────────────────

const bankNameField = z
  .string()
  .trim()
  .min(1, t.errors.bankInvalid)
  .refine((v) => BANK_CODES.has(v), { message: t.errors.bankInvalid });

const bankAccountNoField = z
  .string()
  .trim()
  .min(1, t.errors.bankAccountNoRequired)
  .max(50, t.errors.bankAccountNoTooLong);

const bankAccountNameField = z
  .string()
  .trim()
  .min(1, t.errors.bankAccountNameRequired)
  .max(200, t.errors.bankAccountNameTooLong);

const booleanCoerce = z.preprocess(
  (v) => v === true || v === "true" || v === "on" || v === "1",
  z.boolean(),
);

export const bankAccountInputSchema = z.object({
  /**
   * Optional id: passing the id of an existing row tells the service to
   * UPDATE that row in place (used when the form sync wants to flip
   * isPrimary/isActive without losing identity). Omitted on new rows.
   */
  id: z
    .preprocess(
      (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : undefined),
      z.string().uuid().optional(),
    )
    .optional(),
  bankName: bankNameField,
  bankAccountNo: bankAccountNoField,
  bankAccountName: bankAccountNameField,
  isPrimary: booleanCoerce.default(false),
  isActive: booleanCoerce.default(true),
});

export type BankAccountInput = z.infer<typeof bankAccountInputSchema>;

/**
 * Auto-promote the first ACTIVE row to primary when none is selected.
 * Mirrors the customer-bank-account UX. Inactive rows can never be primary
 * — the service double-checks this invariant separately.
 */
function autoPromoteFirstPrimary(
  rows: ReadonlyArray<BankAccountInput>,
): BankAccountInput[] {
  if (rows.length === 0) return [];
  const activeRows = rows.filter((r) => r.isActive);
  if (activeRows.length === 0) return rows.map((r) => ({ ...r }));
  const hasActivePrimary = activeRows.some((r) => r.isPrimary);
  if (hasActivePrimary) return rows.map((r) => ({ ...r }));
  const firstActiveIdx = rows.findIndex((r) => r.isActive);
  return rows.map((r, i) => ({
    ...r,
    isPrimary: r.isActive && i === firstActiveIdx,
  }));
}

const bankAccountListField = z
  .preprocess(
    (v) => (v === undefined || v === null ? [] : v),
    z.array(bankAccountInputSchema),
  )
  .transform((rows) => autoPromoteFirstPrimary(rows))
  .superRefine((rows, ctx) => {
    if (rows.length > MAX_BANK_ACCOUNTS_PER_RECEIVING_ENTITY) {
      ctx.addIssue({ code: "custom", message: t.errors.tooManyBankAccounts });
      return;
    }
    const activeRows = rows.filter((r) => r.isActive);
    if (activeRows.length > 0) {
      const primaries = activeRows.filter((r) => r.isPrimary).length;
      if (primaries === 0) {
        ctx.addIssue({ code: "custom", message: t.errors.noPrimaryAccount });
      } else if (primaries > 1) {
        ctx.addIssue({
          code: "custom",
          message: t.errors.multiplePrimaryAccounts,
        });
      }
    }
    // Inactive primary is illegal by construction.
    for (const r of rows) {
      if (r.isPrimary && !r.isActive) {
        ctx.addIssue({
          code: "custom",
          message: t.errors.inactiveCannotBePrimary,
        });
        return;
      }
    }
    const seen = new Set<string>();
    for (const r of rows) {
      const key = `${r.bankName}|${r.bankAccountNo.trim()}`;
      if (seen.has(key)) {
        ctx.addIssue({
          code: "custom",
          message: t.errors.duplicateBankAccountInList,
        });
        return;
      }
      seen.add(key);
    }
  });

// ─── Create / Update ────────────────────────────────────────────────────────

export const createReceivingEntitySchema = z.object({
  branchId: optionalUuid,
  type: typeField,
  name: nameField,
  taxId: taxIdField,
  address: optionalText(500, t.errors.addressTooLong),
  isDefault: booleanCoerce.default(false),
  bankAccounts: bankAccountListField,
});

export type CreateReceivingEntityInput = z.infer<
  typeof createReceivingEntitySchema
>;

/**
 * Update intentionally OMITS `branchId` — moving an entity between scopes
 * is out of scope for Step 10 and would change which sales/users can see it.
 *
 * `bankAccounts` is OPTIONAL. Undefined = leave list untouched. Otherwise
 * the service syncs the list against existing rows by `id` (if provided)
 * or `(bankName, bankAccountNo)` for new entries.
 */
export const updateReceivingEntitySchema = z
  .object({
    type: typeField.optional(),
    name: nameField.optional(),
    taxId: taxIdField,
    address: optionalText(500, t.errors.addressTooLong),
    isDefault: booleanCoerce.optional(),
    isActive: booleanCoerce.optional(),
    bankAccounts: bankAccountListField.optional(),
  })
  .refine((val) => Object.values(val).some((v) => v !== undefined), {
    message: t.errors.nothingToUpdate,
  });

export type UpdateReceivingEntityInput = z.infer<
  typeof updateReceivingEntitySchema
>;

// ─── Set default helper ─────────────────────────────────────────────────────

export const setDefaultReceivingEntitySchema = z.object({
  isDefault: booleanCoerce,
});

export type SetDefaultReceivingEntityInput = z.infer<
  typeof setDefaultReceivingEntitySchema
>;

// ─── List query ─────────────────────────────────────────────────────────────

const MAX_PAGE_SIZE = 200;
const DEFAULT_PAGE_SIZE = 50;

export const listReceivingEntitiesQuerySchema = z.object({
  q: z
    .preprocess(
      (v) => (typeof v === "string" ? v.trim() : v),
      z.string().min(1).max(120).optional(),
    )
    .optional(),
  branchId: optionalUuid,
  /**
   * `branchScope`:
   *   - "all"   (default)  → caller's full scope (their branches + null)
   *   - "branch"            → only entities tied to the supplied branchId
   *   - "company"           → only entities with branchId IS NULL
   * Used by the /sales/new picker to pre-filter the list so the page
   * doesn't have to send a huge payload of unrelated entities.
   */
  branchScope: z
    .preprocess(
      (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : "all"),
      z.enum(["all", "branch", "company"]),
    )
    .default("all"),
  includeInactive: z
    .preprocess(
      (v) => (v === "true" || v === true ? true : false),
      z.boolean(),
    )
    .default(false),
  page: z
    .preprocess(
      (v) => {
        if (v === undefined || v === null || v === "") return 1;
        const n = Number(v);
        return Number.isFinite(n) ? Math.max(1, Math.floor(n)) : 1;
      },
      z.number().int().min(1).default(1),
    )
    .default(1),
  pageSize: z
    .preprocess(
      (v) => {
        if (v === undefined || v === null || v === "") return DEFAULT_PAGE_SIZE;
        const n = Number(v);
        if (!Number.isFinite(n)) return DEFAULT_PAGE_SIZE;
        return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(n)));
      },
      z.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
    )
    .default(DEFAULT_PAGE_SIZE),
});

export type ListReceivingEntitiesQuery = z.infer<
  typeof listReceivingEntitiesQuerySchema
>;

export const RECEIVING_ENTITY_PAGE_SIZE_DEFAULT = DEFAULT_PAGE_SIZE;
export const RECEIVING_ENTITY_PAGE_SIZE_MAX = MAX_PAGE_SIZE;

// Re-export so callers don't need a second import.
export { requiredUuid as receivingUuidField };
