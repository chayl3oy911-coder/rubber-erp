/**
 * Farmer module — bank registry.
 *
 * Source of truth for the bank dropdown and DB-stored bank values.
 *
 * Storage strategy: we persist the stable `code` (e.g. "KBANK") rather than
 * a localized display name. Labels are looked up from this list at render
 * time so future locale switches don't require a data migration.
 *
 * Codes follow widely-used Thai bank short codes. Add new banks at the end
 * of the array — order is preserved in the dropdown.
 */

import type { FarmerLocale } from "./i18n";

export type FarmerBank = {
  readonly code: string;
  readonly th: string;
  readonly en: string;
};

export const FARMER_BANKS: ReadonlyArray<FarmerBank> = [
  { code: "KBANK", th: "กสิกรไทย", en: "Kasikornbank" },
  { code: "BBL", th: "กรุงเทพ", en: "Bangkok Bank" },
  { code: "KTB", th: "กรุงไทย", en: "Krungthai" },
  { code: "BAY", th: "กรุงศรี", en: "Krungsri" },
  { code: "GSB", th: "ออมสิน", en: "Government Savings" },
  { code: "SCB", th: "ไทยพาณิชย์", en: "Siam Commercial" },
  { code: "TTB", th: "ทหารไทยธนชาติ", en: "TMBThanachart" },
  { code: "BAAC", th: "ธ.ก.ส.", en: "Bank for Agriculture (BAAC)" },
  { code: "UOB", th: "ยูโอบี", en: "UOB" },
  { code: "TISCO", th: "ทิสโก้", en: "TISCO" },
  { code: "KKP", th: "เกียรตินาคินภัทร", en: "Kiatnakin Phatra" },
  { code: "ISBT", th: "ธนาคารอิสลาม", en: "Islamic Bank of Thailand" },
  { code: "GHB", th: "อาคารสงเคราะห์", en: "Government Housing Bank" },
  { code: "LHFG", th: "แลนด์ แอนด์ เฮ้าส์", en: "Land and Houses" },
  { code: "BNPP", th: "บีเอ็นพีพี", en: "BNP Paribas" },
  { code: "BOC", th: "บีโอซี", en: "Bank of China" },
  { code: "CIMB", th: "ซีไอเอ็มบี", en: "CIMB Thai" },
  { code: "CITI", th: "ซิตี้แบงก์", en: "Citibank" },
  { code: "DB", th: "ดอยซ์แบงก์", en: "Deutsche Bank" },
  { code: "HSBC", th: "เอชเอสบีซี", en: "HSBC" },
  { code: "ICBC", th: "ไอซีบีซี", en: "ICBC" },
] as const;

export const FARMER_BANK_CODES: ReadonlySet<string> = new Set(
  FARMER_BANKS.map((b) => b.code),
);

export function isFarmerBankCode(value: string): boolean {
  return FARMER_BANK_CODES.has(value);
}

/**
 * Resolve a stored bank code to a localized label.
 *
 * Returns `null` for empty input. Falls back to the raw code when an unknown
 * value is encountered (e.g. legacy data) so we never throw or render blank.
 */
export function farmerBankLabel(
  code: string | null | undefined,
  locale: FarmerLocale = "th",
): string | null {
  if (!code) return null;
  const bank = FARMER_BANKS.find((b) => b.code === code);
  if (!bank) return code;
  return locale === "en" ? bank.en : bank.th;
}
