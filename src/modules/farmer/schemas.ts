import { z } from "zod";

import { farmerT } from "./i18n";

const t = farmerT();

const optionalText = (max: number, message: string) =>
  z.preprocess(
    (v) => {
      if (v === null || v === undefined) return undefined;
      const s = String(v).trim();
      return s === "" ? undefined : s;
    },
    z.string().max(max, message).optional(),
  );

const codeField = z
  .string()
  .trim()
  .min(1, t.errors.codeRequired)
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

export const createFarmerSchema = z.object({
  branchId: branchIdField,
  code: codeField,
  fullName: fullNameField,
  phone: optionalText(40, t.errors.phoneTooLong),
  nationalId: optionalText(20, t.errors.nationalIdTooLong),
  bankName: optionalText(100, t.errors.bankNameTooLong),
  bankAccountNo: optionalText(50, t.errors.bankAccountNoTooLong),
  notes: optionalText(1000, t.errors.notesTooLong),
});

export type CreateFarmerInput = z.infer<typeof createFarmerSchema>;

/**
 * Update intentionally omits `branchId` — branch transfer is out of scope this
 * round (see plan §1, PATCH section). Re-introduce as a separate endpoint when
 * the move-farmer use case lands.
 */
export const updateFarmerSchema = z
  .object({
    code: codeField.optional(),
    fullName: fullNameField.optional(),
    phone: optionalText(40, t.errors.phoneTooLong),
    nationalId: optionalText(20, t.errors.nationalIdTooLong),
    bankName: optionalText(100, t.errors.bankNameTooLong),
    bankAccountNo: optionalText(50, t.errors.bankAccountNoTooLong),
    notes: optionalText(1000, t.errors.notesTooLong),
    isActive: z.boolean().optional(),
  })
  .refine((val) => Object.values(val).some((v) => v !== undefined), {
    message: t.errors.nothingToUpdate,
  });

export type UpdateFarmerInput = z.infer<typeof updateFarmerSchema>;

const MAX_PAGE_SIZE = 200;
const DEFAULT_PAGE_SIZE = 50;

export const listFarmersQuerySchema = z.object({
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

export type ListFarmersQuery = z.infer<typeof listFarmersQuerySchema>;

export const FARMER_PAGE_SIZE_DEFAULT = DEFAULT_PAGE_SIZE;
export const FARMER_PAGE_SIZE_MAX = MAX_PAGE_SIZE;
