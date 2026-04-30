/**
 * Purchase ticket status machine.
 *
 * Strict-forward — no back transitions. Cancellation is allowed from any
 * non-terminal state. APPROVED locks all field edits per business rule.
 */

export const PURCHASE_STATUSES = [
  "DRAFT",
  "WAITING_QC",
  "WAITING_APPROVAL",
  "APPROVED",
  "CANCELLED",
] as const;

export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number];

export const PURCHASE_STATUS_SET: ReadonlySet<string> = new Set(
  PURCHASE_STATUSES,
);

export function isPurchaseStatus(value: string): value is PurchaseStatus {
  return PURCHASE_STATUS_SET.has(value);
}

/**
 * Allowed forward transitions from each state. Cancel is handled separately
 * because it's universally available from non-terminal states.
 */
const FORWARD_TRANSITIONS: Record<PurchaseStatus, ReadonlyArray<PurchaseStatus>> =
  {
    DRAFT: ["WAITING_QC"],
    WAITING_QC: ["WAITING_APPROVAL"],
    WAITING_APPROVAL: ["APPROVED"],
    APPROVED: [],
    CANCELLED: [],
  };

export function canForwardTransition(
  from: PurchaseStatus,
  to: PurchaseStatus,
): boolean {
  return FORWARD_TRANSITIONS[from].includes(to);
}

export function canCancel(from: PurchaseStatus): boolean {
  return from !== "CANCELLED";
}

/** Cancel from APPROVED requires an explicit reason; other states don't. */
export function cancelReasonRequired(from: PurchaseStatus): boolean {
  return from === "APPROVED";
}

/**
 * Field-level edit permissions per status.
 *
 * - DRAFT     → all fields editable (incl. withholdingTaxPercent — money rule)
 * - WAITING_QC → only `note` and `rubberType` (DRC/grade arrive in Step 8;
 *               weight/price/tax are locked once the ticket reaches QC)
 * - others    → no edits
 */
export type EditableField =
  | "rubberType"
  | "grossWeight"
  | "tareWeight"
  | "pricePerKg"
  | "withholdingTaxPercent"
  | "note";

const EDITABLE_FIELDS: Record<PurchaseStatus, ReadonlySet<EditableField>> = {
  DRAFT: new Set([
    "rubberType",
    "grossWeight",
    "tareWeight",
    "pricePerKg",
    "withholdingTaxPercent",
    "note",
  ]),
  WAITING_QC: new Set(["rubberType", "note"]),
  WAITING_APPROVAL: new Set(),
  APPROVED: new Set(),
  CANCELLED: new Set(),
};

export function getEditableFields(
  status: PurchaseStatus,
): ReadonlySet<EditableField> {
  return EDITABLE_FIELDS[status];
}

export function isFieldEditable(
  status: PurchaseStatus,
  field: EditableField,
): boolean {
  return EDITABLE_FIELDS[status].has(field);
}

/**
 * Map a status transition to the audit log `action` name and the permission
 * required to perform it. Returns `null` if the transition is forbidden.
 */
export type TransitionPlan = {
  readonly action:
    | "submit_qc"
    | "submit_approval"
    | "approve"
    | "cancel";
  readonly permission:
    | "purchase.update"
    | "purchase.approve"
    | "purchase.cancel";
};

export function planTransition(
  from: PurchaseStatus,
  to: PurchaseStatus,
): TransitionPlan | null {
  if (to === "CANCELLED") {
    if (!canCancel(from)) return null;
    return { action: "cancel", permission: "purchase.cancel" };
  }
  if (!canForwardTransition(from, to)) return null;
  if (from === "DRAFT" && to === "WAITING_QC") {
    return { action: "submit_qc", permission: "purchase.update" };
  }
  if (from === "WAITING_QC" && to === "WAITING_APPROVAL") {
    return { action: "submit_approval", permission: "purchase.update" };
  }
  if (from === "WAITING_APPROVAL" && to === "APPROVED") {
    return { action: "approve", permission: "purchase.approve" };
  }
  return null;
}
