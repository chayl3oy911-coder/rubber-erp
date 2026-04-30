/**
 * Purchase module — rubber type registry.
 *
 * Stored in DB as the stable `code`. Add new types at the end of the array.
 * Future: this list may move to a `Setting`/`MasterData` table per branch.
 */

import type { PurchaseLocale } from "./i18n";

export type RubberType = {
  readonly code: string;
  readonly th: string;
  readonly en: string;
};

// Order here drives the UI dropdown order. The DB only stores `code`, so
// reordering / inserting new entries is a pure UX change — no migration.
export const RUBBER_TYPES: ReadonlyArray<RubberType> = [
  { code: "CUP_LUMP", th: "ยางก้อนถ้วย", en: "Cup lump" },
  { code: "CREPE", th: "ยางเครป", en: "Crepe rubber" },
  { code: "SHEET", th: "ยางแผ่น", en: "Rubber sheet" },
  { code: "FRESH_LATEX", th: "น้ำยางสด", en: "Fresh latex" },
] as const;

export const RUBBER_TYPE_CODES: ReadonlySet<string> = new Set(
  RUBBER_TYPES.map((r) => r.code),
);

export function isRubberTypeCode(value: string): boolean {
  return RUBBER_TYPE_CODES.has(value);
}

export function rubberTypeLabel(
  code: string | null | undefined,
  locale: PurchaseLocale = "th",
): string | null {
  if (!code) return null;
  const t = RUBBER_TYPES.find((r) => r.code === code);
  if (!t) return code;
  return locale === "en" ? t.en : t.th;
}
