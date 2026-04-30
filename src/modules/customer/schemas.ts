import { z } from "zod";

import { CUSTOMER_BANK_CODES } from "./banks";
import { customerT } from "./i18n";

const t = customerT();

const optionalText = (max: number, message: string) =>
  z.preprocess(
    (v) => {
      if (v === null || v === undefined) return undefined;
      const s = String(v).trim();
      return s === "" ? undefined : s;
    },
    z.string().max(max, message).optional(),
  );

/**
 * Optional code: enforces format & length when provided. When absent the
 * service auto-generates `CUS######` (see `service.generateNextCustomerCode`).
 */
const optionalCodeField = z.preprocess(
  (v) => {
    if (v === null || v === undefined) return undefined;
    const s = String(v).trim();
    return s === "" ? undefined : s;
  },
  z
    .string()
    .max(20, t.errors.codeTooLong)
    .regex(/^[A-Z0-9_-]+$/, t.errors.codeFormat)
    .optional(),
);

const requiredCodeField = z
  .string()
  .trim()
  .min(1, t.errors.codeFormat)
  .max(20, t.errors.codeTooLong)
  .regex(/^[A-Z0-9_-]+$/, t.errors.codeFormat);

const fullNameField = z
  .string()
  .trim()
  .min(1, t.errors.fullNameRequired)
  .max(200, t.errors.fullNameTooLong);

const branchIdField = z
  .string()
  .trim()
  .min(1, t.errors.branchRequired)
  .uuid(t.errors.branchInvalid);

// ─── Bank account schemas ────────────────────────────────────────────────────
//
// `bankAccountInput` is the per-row schema. `bankAccountListField` enforces
// max 3 rows, no duplicates within the submitted list, and "exactly one
// primary if any rows exist". Cross-customer uniqueness is a DB-level concern
// (see `@@unique([bankName, bankAccountNo])` in schema.prisma) and is mapped
// to a friendly error in the service layer.

export const MAX_BANK_ACCOUNTS_PER_CUSTOMER = 3;

const bankNameField = z
  .string()
  .trim()
  .min(1, t.errors.bankInvalid)
  .refine((v) => CUSTOMER_BANK_CODES.has(v), { message: t.errors.bankInvalid });

const bankAccountNoField = z
  .string()
  .trim()
  .min(1, t.errors.bankAccountNoRequired)
  .max(50, t.errors.bankAccountNoTooLong);

const accountNameField = z.preprocess(
  (v) => {
    if (v === null || v === undefined) return undefined;
    const s = String(v).trim();
    return s === "" ? undefined : s;
  },
  z.string().max(200, t.errors.accountNameTooLong).optional(),
);

export const bankAccountInputSchema = z.object({
  bankName: bankNameField,
  bankAccountNo: bankAccountNoField,
  accountName: accountNameField,
  isPrimary: z
    .preprocess(
      (v) => v === true || v === "true" || v === "on" || v === "1",
      z.boolean(),
    )
    .default(false),
});

export type BankAccountInput = z.infer<typeof bankAccountInputSchema>;

/**
 * Auto-promote the first row to primary when none is selected. Mirrors the
 * UX rule: "if user supplied at least one bank account but didn't pick a
 * primary, treat the first one as primary". Service re-validates afterwards.
 */
function autoPromoteFirstPrimary(
  rows: ReadonlyArray<BankAccountInput>,
): BankAccountInput[] {
  if (rows.length === 0) return [];
  const hasPrimary = rows.some((r) => r.isPrimary);
  if (hasPrimary) return rows.map((r) => ({ ...r }));
  return rows.map((r, i) => ({ ...r, isPrimary: i === 0 }));
}

const bankAccountListField = z
  .preprocess(
    (v) => (v === undefined || v === null ? [] : v),
    z.array(bankAccountInputSchema),
  )
  .transform((rows) => autoPromoteFirstPrimary(rows))
  .superRefine((rows, ctx) => {
    if (rows.length > MAX_BANK_ACCOUNTS_PER_CUSTOMER) {
      ctx.addIssue({
        code: "custom",
        message: t.errors.tooManyBankAccounts,
      });
      return;
    }
    if (rows.length > 0) {
      const primaries = rows.filter((r) => r.isPrimary).length;
      if (primaries === 0) {
        // Should never happen after autoPromoteFirstPrimary, but defensive.
        ctx.addIssue({ code: "custom", message: t.errors.noPrimaryAccount });
      } else if (primaries > 1) {
        ctx.addIssue({
          code: "custom",
          message: t.errors.multiplePrimaryAccounts,
        });
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

// ─── Create / Update ─────────────────────────────────────────────────────────

export const createCustomerSchema = z.object({
  branchId: branchIdField,
  code: optionalCodeField,
  fullName: fullNameField,
  phone: optionalText(40, t.errors.phoneTooLong),
  nationalId: optionalText(20, t.errors.nationalIdTooLong),
  notes: optionalText(1000, t.errors.notesTooLong),
  bankAccounts: bankAccountListField,
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

/**
 * Update intentionally omits `branchId` — branch transfer is out of scope.
 *
 * `bankAccounts` is OPTIONAL: undefined means "leave existing accounts
 * untouched"; an empty array means "remove all bank accounts"; a populated
 * array replaces the entire list (full upsert semantics, simpler than diff).
 */
export const updateCustomerSchema = z
  .object({
    code: requiredCodeField.optional(),
    fullName: fullNameField.optional(),
    phone: optionalText(40, t.errors.phoneTooLong),
    nationalId: optionalText(20, t.errors.nationalIdTooLong),
    notes: optionalText(1000, t.errors.notesTooLong),
    isActive: z.boolean().optional(),
    bankAccounts: bankAccountListField.optional(),
  })
  .refine((val) => Object.values(val).some((v) => v !== undefined), {
    message: t.errors.nothingToUpdate,
  });

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

// ─── List query ──────────────────────────────────────────────────────────────

const MAX_PAGE_SIZE = 200;
const DEFAULT_PAGE_SIZE = 50;

export const listCustomersQuerySchema = z.object({
  q: z
    .preprocess(
      (v) => (typeof v === "string" ? v.trim() : v),
      z.string().min(1).max(120).optional(),
    )
    .optional(),
  branchId: z
    .preprocess(
      (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : undefined),
      z.string().uuid(t.errors.branchInvalid).optional(),
    )
    .optional(),
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

export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;

export const CUSTOMER_PAGE_SIZE_DEFAULT = DEFAULT_PAGE_SIZE;
export const CUSTOMER_PAGE_SIZE_MAX = MAX_PAGE_SIZE;

// Auto-generated code constants
export const CUSTOMER_AUTO_CODE_PREFIX = "CUS";
export const CUSTOMER_AUTO_CODE_PADDING = 6;
