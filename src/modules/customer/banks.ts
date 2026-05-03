/**
 * Customer module — bank registry (BC re-export).
 *
 * The actual registry now lives in `@/shared/banks` so Customer + Receiving
 * Entity (and any future module that needs to print bank names) share one
 * authoritative list. The aliases below preserve the existing `CUSTOMER_*`
 * names so historical imports keep working without a sweeping rename.
 *
 * New code should import directly from `@/shared/banks`.
 */

import {
  BANKS,
  BANK_CODES,
  bankLabel,
  isBankCode,
  type Bank,
} from "@/shared/banks";

import type { CustomerLocale } from "./i18n";

export type CustomerBank = Bank;

export const CUSTOMER_BANKS: ReadonlyArray<CustomerBank> = BANKS;

export const CUSTOMER_BANK_CODES: ReadonlySet<string> = BANK_CODES;

export function isCustomerBankCode(value: string): boolean {
  return isBankCode(value);
}

export function customerBankLabel(
  code: string | null | undefined,
  locale: CustomerLocale = "th",
): string | null {
  return bankLabel(code, locale);
}
