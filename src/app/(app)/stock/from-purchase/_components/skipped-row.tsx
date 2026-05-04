"use client";

import { purchaseT } from "@/modules/purchase/i18n";
import type { EligiblePurchaseDTO } from "@/modules/stock/dto";
import { stockT } from "@/modules/stock/i18n";
import { Button } from "@/shared/ui";

import { CancelAfterSkipForm } from "./cancel-after-skip-form";

const t = stockT();
const tp = purchaseT();

function formatNumber(s: string, fractionDigits = 2): string {
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

type Props = {
  ticket: EligiblePurchaseDTO;
  showBranch: boolean;
  canUndo: boolean;
  onUndo: (ticketId: string) => void;
  canCancel: boolean;
  isCancelFormOpen: boolean;
  cancelReason: string;
  onCancelReasonChange: (next: string) => void;
  onOpenCancelForm: (ticketId: string) => void;
  onCloseCancelForm: () => void;
  onSubmitCancel: (ticketId: string, ticketNo: string) => void;
  isBusy: boolean;
};

/**
 * Read-only row used in the SKIPPED view. Displays the original purchase
 * facts plus the skip reason and timestamp, with a single "re-queue"
 * action when the operator has the right permission.
 *
 * Layout intentionally matches the PENDING list visually so the operator
 * keeps spatial memory when toggling tabs — only the trailing action
 * column changes.
 */
export function SkippedRow({
  ticket,
  showBranch,
  canUndo,
  onUndo,
  canCancel,
  isCancelFormOpen,
  cancelReason,
  onCancelReasonChange,
  onOpenCancelForm,
  onCloseCancelForm,
  onSubmitCancel,
  isBusy,
}: Props) {
  return (
    <li>
      <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-mono text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              {ticket.ticketNo}
            </span>
            <span className="break-words text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {ticket.customer?.fullName ?? "—"}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {ticket.customer?.code ?? "—"}
              {showBranch && ticket.branch ? ` · ${ticket.branch.code}` : ""}
              {ticket.stockIntakeSkippedAt
                ? ` · ${t.misc.skippedAt(ticket.stockIntakeSkippedAt)}`
                : ""}
            </span>
          </div>

          <div className="flex flex-col gap-1 sm:items-end">
            <span className="whitespace-nowrap text-sm tabular-nums text-zinc-900 dark:text-zinc-50">
              {formatNumber(ticket.netWeight, 2)} {t.units.kg} ·{" "}
              {formatNumber(ticket.totalAmount, 2)} {t.units.baht}
            </span>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {canUndo ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => onUndo(ticket.id)}
                  disabled={isBusy || isCancelFormOpen}
                  aria-disabled={isBusy || isCancelFormOpen}
                >
                  {t.actions.undoSkipIntake}
                </Button>
              ) : null}
              {canCancel && !isCancelFormOpen ? (
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  onClick={() => onOpenCancelForm(ticket.id)}
                  disabled={isBusy}
                  aria-disabled={isBusy}
                >
                  {tp.actions.cancelAfterSkip}
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        {ticket.stockIntakeSkipReason ? (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
            {t.misc.skippedReason(ticket.stockIntakeSkipReason)}
          </p>
        ) : null}

        {isCancelFormOpen ? (
          <div className="mt-3">
            <CancelAfterSkipForm
              reason={cancelReason}
              onReasonChange={onCancelReasonChange}
              onSubmit={() => onSubmitCancel(ticket.id, ticket.ticketNo)}
              onCancel={onCloseCancelForm}
              isBusy={isBusy}
            />
          </div>
        ) : null}
      </div>
    </li>
  );
}
