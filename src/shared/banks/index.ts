/**
 * Shared bank registry — single source of truth for the bank dropdown across
 * the whole app (Customer, ReceivingEntity, future Cash module, etc.).
 *
 * Storage strategy: persist the stable `code` (e.g. "KBANK") in the database
 * rather than a localized display name. Labels are looked up from this list
 * at render time so future locale switches don't require a data migration.
 *
 * Codes follow widely-used Thai bank short codes. Add new banks at the end
 * of the array — order is preserved in dropdowns. Existing rows in the DB
 * that point at a code no longer present here will fall back to displaying
 * the raw code (`bankLabel` returns the code unchanged).
 *
 * Locales: this module is locale-agnostic — the caller passes "th" | "en".
 * Module-local i18n dictionaries (`customerT`, `receivingAccountT`, etc.)
 * still own their own surrounding strings; they just delegate the bank
 * label lookup to here.
 */

export type AppLocale = "th" | "en";

export type Bank = {
  readonly code: string;
  readonly th: string;
  readonly en: string;
};

export const BANKS: ReadonlyArray<Bank> = [
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

export const BANK_CODES: ReadonlySet<string> = new Set(
  BANKS.map((b) => b.code),
);

export function isBankCode(value: string): boolean {
  return BANK_CODES.has(value);
}

export function bankLabel(
  code: string | null | undefined,
  locale: AppLocale = "th",
): string | null {
  if (!code) return null;
  const bank = BANKS.find((b) => b.code === code);
  if (!bank) return code;
  return locale === "en" ? bank.en : bank.th;
}
