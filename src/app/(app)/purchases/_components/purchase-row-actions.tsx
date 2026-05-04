"use client";

import Link from "next/link";

import type { PurchaseTicketDTO } from "@/modules/purchase/dto";
import { purchaseT } from "@/modules/purchase/i18n";
import type { PurchaseStatus } from "@/modules/purchase/status";

const t = purchaseT();

/**
 * Tailwind class strings reused from the previous list. Centralising them
 * here keeps every action button visually aligned in both desktop (table)
 * and mobile (card) layouts. Why two sizes:
 *
 *   - `compact`  — table cells; the column already has padding so the
 *                  controls only need a slim height (h-8) to stay visually
 *                  balanced with the row.
 *   - `regular`  — mobile cards; standalone, finger-friendly tap targets
 *                  (h-9) that are easy to hit on touch devices.
 */
const COMPACT_BASE =
  "inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
const REGULAR_BASE =
  "inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const NEUTRAL =
  "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 focus-visible:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";
const PRIMARY =
  "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:ring-emerald-600";
const APPROVE =
  "border-blue-600 bg-blue-600 text-white hover:bg-blue-500 focus-visible:ring-blue-600";
const DANGER =
  "border-red-300 bg-white text-red-700 hover:bg-red-50 focus-visible:ring-red-500 dark:border-red-700 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-900/20";

export type RowPermissions = {
  canUpdate: boolean;
  canApprove: boolean;
  canCancel: boolean;
};

type Props = {
  ticket: PurchaseTicketDTO;
  perms: RowPermissions;
  /** Indicates a request is in flight for THIS ticket; disables every button. */
  isBusy: boolean;
  /** Layout variant — affects button height + label verbosity. */
  variant: "table" | "card";
  /**
   * Called when the user picks a transition. The parent owns the network
   * call so it can update list state from the server response (we don't
   * do optimistic updates per requirement).
   *
   * `requireConfirm` is true only for "Approve" — the parent runs
   * `window.confirm` with the localised prompt before calling the API.
   */
  onTransition: (input: {
    target: PurchaseStatus;
    requireConfirm: boolean;
  }) => void;
};

/**
 * Renders the per-row action buttons. The list of buttons is derived
 * purely from `ticket.status` + `perms`; we do NOT branch on user role
 * here so the rules stay co-located with the status machine, not with
 * the role table.
 *
 * Why this is a thin "view" component rather than a full controller:
 *
 *   - The parent (`purchase-list-client.tsx`) already owns the `busyId`
 *     state and the toast bus, so making each row self-managing would
 *     just duplicate state and risk two rows transitioning at once.
 *   - Keeping the click handler `onTransition` purely declarative (which
 *     `target` + whether to confirm) keeps the row-action surface
 *     identical for table and card variants.
 */
export function PurchaseRowActions({
  ticket,
  perms,
  isBusy,
  variant,
  onTransition,
}: Props) {
  const base = variant === "table" ? COMPACT_BASE : REGULAR_BASE;
  const detailHref = `/purchases/${ticket.id}`;

  const detailButton = (
    <Link
      key="detail"
      href={detailHref}
      className={`${base} ${NEUTRAL}`}
      aria-label={t.actions.detail}
    >
      {t.actions.detail}
    </Link>
  );

  // Build action buttons left-to-right, terminal action (cancel) last,
  // detail always rightmost. Order matches the existing detail-page UX
  // so users can move between views without re-learning the layout.
  const buttons: React.ReactNode[] = [];

  switch (ticket.status) {
    case "DRAFT": {
      if (perms.canUpdate) {
        buttons.push(
          <button
            key="submit-qc"
            type="button"
            disabled={isBusy}
            onClick={() =>
              onTransition({ target: "WAITING_QC", requireConfirm: false })
            }
            className={`${base} ${PRIMARY}`}
          >
            {t.actions.submitForQC}
          </button>,
        );
      }
      if (perms.canCancel) {
        buttons.push(
          <button
            key="cancel"
            type="button"
            disabled={isBusy}
            onClick={() =>
              onTransition({ target: "CANCELLED", requireConfirm: false })
            }
            className={`${base} ${DANGER}`}
          >
            {t.actions.cancel}
          </button>,
        );
      }
      break;
    }
    case "WAITING_QC": {
      if (perms.canUpdate) {
        buttons.push(
          <button
            key="submit-approval"
            type="button"
            disabled={isBusy}
            onClick={() =>
              onTransition({
                target: "WAITING_APPROVAL",
                requireConfirm: false,
              })
            }
            className={`${base} ${PRIMARY}`}
          >
            {t.actions.submitForApproval}
          </button>,
        );
      }
      if (perms.canCancel) {
        buttons.push(
          <button
            key="cancel"
            type="button"
            disabled={isBusy}
            onClick={() =>
              onTransition({ target: "CANCELLED", requireConfirm: false })
            }
            className={`${base} ${DANGER}`}
          >
            {t.actions.cancel}
          </button>,
        );
      }
      break;
    }
    case "WAITING_APPROVAL": {
      if (perms.canApprove) {
        buttons.push(
          <button
            key="approve"
            type="button"
            disabled={isBusy}
            onClick={() =>
              // Approve is the one transition that requires an extra
              // confirmation step — it's the only forward move that
              // permanently locks the document for editing.
              onTransition({ target: "APPROVED", requireConfirm: true })
            }
            className={`${base} ${APPROVE}`}
          >
            {t.actions.approve}
          </button>,
        );
      }
      if (perms.canCancel) {
        buttons.push(
          <button
            key="cancel"
            type="button"
            disabled={isBusy}
            onClick={() =>
              onTransition({ target: "CANCELLED", requireConfirm: false })
            }
            className={`${base} ${DANGER}`}
          >
            {t.actions.cancel}
          </button>,
        );
      }
      break;
    }
    case "APPROVED":
    case "CANCELLED": {
      // No row-level action by design:
      //   - APPROVED → cancel-after-skip / return is handled on the
      //     detail page where the user has full ticket context.
      //   - CANCELLED is terminal.
      break;
    }
  }

  buttons.push(detailButton);

  return (
    <div
      className={
        variant === "table"
          ? "flex flex-wrap items-center justify-end gap-1.5"
          : "flex flex-wrap items-center gap-2"
      }
    >
      {buttons}
    </div>
  );
}
