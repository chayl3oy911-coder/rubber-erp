/**
 * Receiving account — domain enums.
 *
 * `RECEIVING_ENTITY_TYPES` is the as-const tuple used both as the runtime
 * Zod enum source and as the TypeScript narrowing surface (mirrors how the
 * sales module defines `SALE_TYPES`).
 */

export const RECEIVING_ENTITY_TYPES = ["COMPANY", "PERSONAL"] as const;
export type ReceivingEntityType = (typeof RECEIVING_ENTITY_TYPES)[number];

export function isReceivingEntityType(
  value: string,
): value is ReceivingEntityType {
  return (RECEIVING_ENTITY_TYPES as readonly string[]).includes(value);
}

/**
 * Hard cap on bank accounts per ReceivingEntity. Enforced in:
 *   - zod schema (`bankAccountListField`)
 *   - service layer (`assertBankAccountListInvariants`)
 * UI uses this constant to disable the "+ add" button when reached.
 */
export const MAX_BANK_ACCOUNTS_PER_RECEIVING_ENTITY = 10;
