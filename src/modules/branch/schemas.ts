import { z } from "zod";

const optionalText = (max: number, label: string) =>
  z.preprocess(
    (v) => {
      if (v === null || v === undefined) return undefined;
      const s = String(v).trim();
      return s === "" ? undefined : s;
    },
    z.string().max(max, `${label}ยาวเกิน ${max} ตัวอักษร`).optional()
  );

const codeField = z
  .string()
  .trim()
  .min(1, "กรุณากรอกรหัสสาขา")
  .max(20, "รหัสสาขายาวเกิน 20 ตัวอักษร")
  .regex(/^[A-Z0-9_-]+$/, "รหัสสาขาใช้ได้เฉพาะ A-Z, 0-9, _, -");

const nameField = z
  .string()
  .trim()
  .min(1, "กรุณากรอกชื่อสาขา")
  .max(120, "ชื่อสาขายาวเกิน 120 ตัวอักษร");

export const createBranchSchema = z.object({
  code: codeField,
  name: nameField,
  address: optionalText(500, "ที่อยู่"),
  phone: optionalText(40, "เบอร์โทร"),
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;

export const updateBranchSchema = z
  .object({
    code: codeField.optional(),
    name: nameField.optional(),
    address: optionalText(500, "ที่อยู่"),
    phone: optionalText(40, "เบอร์โทร"),
    isActive: z.boolean().optional(),
  })
  .refine((val) => Object.values(val).some((v) => v !== undefined), {
    message: "ไม่มีข้อมูลที่จะอัพเดต",
  });

export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
