"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import type { PurchaseTicketDTO } from "@/modules/purchase/dto";
import { purchaseT } from "@/modules/purchase/i18n";
import { rubberTypeLabel } from "@/modules/purchase/rubber-types";
import type { PurchaseStatus } from "@/modules/purchase/status";
import { Card, CardContent } from "@/shared/ui";
import { useToast } from "@/shared/ui/toast";

import { CancelPurchaseDialog } from "./cancel-purchase-dialog";
import {
  PurchaseRowActions,
  type RowPermissions,
} from "./purchase-row-actions";
import { StatusBadge } from "./status-badge";

const t = purchaseT();

type Props = {
  initialPurchases: PurchaseTicketDTO[];
  searchTerm?: string;
  showBranchColumn?: boolean;
  perms: RowPermissions;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatNumber(s: string, fractionDigits = 2): string {
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

/**
 * Pull the most useful error message out of a transition response.
 *
 * The transition route returns one of:
 *   - `{ error, fields }` (validation, 400)
 *   - `{ error }`         (404 / 409)
 *
 * For our list UI we only need a single human-readable line — even
 * field errors collapse to "Validation failed: <first message>" since
 * the buttons can't show inline errors per field.
 */
function describeApiError(payload: unknown): {
  title: string;
  description?: string;
} {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof (payload as { error: unknown }).error === "string"
  ) {
    const errorMessage = (payload as { error: string }).error;
    if (
      "fields" in payload &&
      payload.fields &&
      typeof payload.fields === "object"
    ) {
      const fields = payload.fields as Record<string, string[] | undefined>;
      const first = Object.values(fields).find(
        (v) => Array.isArray(v) && v.length > 0,
      );
      if (first && first[0]) {
        return {
          title: t.misc.toastValidationFailed,
          description: first[0],
        };
      }
    }
    return { title: t.misc.toastTransitionFailed, description: errorMessage };
  }
  return { title: t.misc.toastTransitionFailed };
}

function successToast(target: PurchaseStatus, ticketNo: string): string {
  switch (target) {
    case "WAITING_QC":
      return t.misc.toastSubmitQcSuccess(ticketNo);
    case "WAITING_APPROVAL":
      return t.misc.toastSubmitApprovalSuccess(ticketNo);
    case "APPROVED":
      return t.misc.toastApproveSuccess(ticketNo);
    case "CANCELLED":
      return t.misc.toastCancelSuccess(ticketNo);
    default:
      return t.misc.toastTransitionFailed;
  }
}

/**
 * Client wrapper around the purchases list.
 *
 * Why a single client component owns BOTH the table and the card list:
 *
 *   - They share the same state (`rows`, `busyId`) and the same
 *     transition handler. Splitting them would force prop-drilling the
 *     handler into two cousins or hoisting state to a third wrapper —
 *     extra plumbing for zero benefit.
 *   - The two layouts are mutually exclusive (CSS `lg:` breakpoint),
 *     so duplicating the JSX has no runtime cost.
 *
 * State strategy:
 *   - We seed from `initialPurchases` (server) and keep a local copy.
 *     After a successful transition the API echoes the updated DTO
 *     and we splice it into `rows` — never optimistic, per spec.
 *   - `busyId` tracks the single in-flight request. Multiple parallel
 *     transitions on the same row are rare and would just race against
 *     the status machine — easier to forbid them in the UI.
 */
export function PurchaseListClient({
  initialPurchases,
  searchTerm,
  showBranchColumn = true,
  perms,
}: Props) {
  const [rows, setRows] = useState<PurchaseTicketDTO[]>(initialPurchases);
  const [busyId, setBusyId] = useState<string | null>(null);
  // Holds the ticket whose Cancel modal is currently open. `null`
  // means the modal is closed. Storing the whole DTO (instead of just
  // an id) lets the dialog show the ticket number without an extra
  // lookup, and lets the modal survive an in-flight request even if
  // the row briefly re-renders.
  const [cancelDialogTicket, setCancelDialogTicket] =
    useState<PurchaseTicketDTO | null>(null);
  const { show } = useToast();

  /**
   * Low-level transition runner — performs the network call, applies
   * the row update from the API response, and dispatches a toast.
   *
   * Returns `true` when the transition succeeded so callers (notably
   * the cancel dialog) can decide whether to close themselves. Errors
   * resolve with `false`; the toast already explains what went wrong.
   *
   * Why this is decoupled from the row buttons: cancel runs through
   * the modal first to collect a reason, then calls back into here.
   * Keeping the network logic in one place means the row buttons,
   * the modal, and any future caller (keyboard shortcut, bulk action)
   * all get identical behaviour.
   */
  const runTransition = useCallback(
    async (
      ticket: PurchaseTicketDTO,
      target: PurchaseStatus,
      cancelReason?: string,
    ): Promise<boolean> => {
      if (busyId) return false;

      setBusyId(ticket.id);
      try {
        const body: { status: PurchaseStatus; cancelReason?: string } = {
          status: target,
        };
        if (cancelReason !== undefined) body.cancelReason = cancelReason;

        const res = await fetch(
          `/api/purchase-tickets/${ticket.id}/transition`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        );

        let payload: unknown = null;
        try {
          payload = await res.json();
        } catch {
          payload = null;
        }

        if (!res.ok) {
          const { title, description } = describeApiError(payload);
          show({ variant: "error", title, description });
          return false;
        }

        // Success path: server returns `{ ticket: PurchaseTicketDTO }`
        // — splice it back in by id so the row's status, badge and
        // available actions all update without a round-trip refresh.
        const updated =
          payload &&
          typeof payload === "object" &&
          "ticket" in payload &&
          payload.ticket
            ? (payload.ticket as PurchaseTicketDTO)
            : null;

        if (updated) {
          setRows((prev) =>
            prev.map((row) => (row.id === updated.id ? updated : row)),
          );
        }

        show({
          variant: "success",
          title: successToast(target, ticket.ticketNo),
        });
        return true;
      } catch (err) {
        // Network errors land here — surface a generic message rather
        // than the raw exception, which is rarely user-friendly.
        show({
          variant: "error",
          title: t.misc.toastTransitionFailed,
          description: err instanceof Error ? err.message : undefined,
        });
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [busyId, show],
  );

  /**
   * Row-button entry point. Routes destructive Cancel through the
   * modal dialog (where a reason is collected) and other transitions
   * straight through `runTransition`.
   *
   * `requireConfirm` is honoured here for the Approve action (the
   * one transition flagged as needing an extra `window.confirm` per
   * spec — see `purchase-row-actions.tsx`).
   */
  const handleTransition = useCallback(
    (
      ticket: PurchaseTicketDTO,
      input: { target: PurchaseStatus; requireConfirm: boolean },
    ) => {
      if (busyId) return;

      if (input.target === "CANCELLED") {
        // Open the modal instead of firing immediately. The modal
        // will call back into `runTransition` once the user provides
        // a valid reason.
        setCancelDialogTicket(ticket);
        return;
      }

      if (input.requireConfirm) {
        const ok = window.confirm(t.misc.confirmApprovePrompt(ticket.ticketNo));
        if (!ok) return;
      }

      void runTransition(ticket, input.target);
    },
    [busyId, runTransition],
  );

  const handleCancelDialogClose = useCallback(() => {
    setCancelDialogTicket(null);
  }, []);

  const handleCancelDialogConfirm = useCallback(
    async (reason: string) => {
      const ticket = cancelDialogTicket;
      if (!ticket) return;
      const ok = await runTransition(ticket, "CANCELLED", reason);
      // Close on success only. On failure we keep the modal open so
      // the user can retry without having to retype the reason —
      // the toast already explains what went wrong.
      if (ok) setCancelDialogTicket(null);
    },
    [cancelDialogTicket, runTransition],
  );

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {searchTerm ? t.empty.noResults(searchTerm) : t.empty.list}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/*
        Card list — used for small AND medium viewports (anything below
        `lg`). All key fields are surfaced so users never need to scroll
        a horizontal table on tablets. Action buttons sit at the bottom
        of each card with finger-friendly heights from the row-actions
        component.
      */}
      <ul className="flex flex-col gap-3 lg:hidden">
        {rows.map((p) => {
          const isBusy = busyId === p.id;
          return (
            <li key={p.id}>
              <Card>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <Link
                        href={`/purchases/${p.id}`}
                        className="whitespace-nowrap font-mono text-xs font-semibold uppercase tracking-wide text-emerald-700 hover:underline dark:text-emerald-400"
                      >
                        {p.ticketNo}
                      </Link>
                      <span className="break-words text-base font-semibold text-zinc-900 dark:text-zinc-50">
                        {p.customer?.fullName ?? "—"}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {p.customer?.code ?? "—"}
                        {showBranchColumn && p.branch
                          ? ` · ${p.branch.code}`
                          : ""}
                        {" · "}
                        {formatDate(p.createdAt)}
                      </span>
                    </div>
                    <div className="shrink-0">
                      <StatusBadge status={p.status} size="sm" />
                    </div>
                  </div>
                  <dl className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
                    <div className="flex justify-between gap-3">
                      <dt className="min-w-0">{t.fields.rubberType}</dt>
                      <dd className="whitespace-nowrap text-right">
                        {rubberTypeLabel(p.rubberType) ?? p.rubberType}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="min-w-0">{t.fields.netWeight}</dt>
                      <dd className="whitespace-nowrap text-right tabular-nums">
                        {formatNumber(p.netWeight, 2)} {t.units.kg}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="min-w-0">{t.fields.pricePerKg}</dt>
                      <dd className="whitespace-nowrap text-right tabular-nums">
                        {formatNumber(p.pricePerKg, 2)} {t.units.bahtPerKg}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3 font-semibold text-zinc-900 dark:text-zinc-50">
                      <dt className="min-w-0">{t.fields.totalAmount}</dt>
                      <dd className="whitespace-nowrap text-right tabular-nums">
                        {formatNumber(p.totalAmount, 2)} {t.units.baht}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="min-w-0">
                        {t.fields.withholdingTaxPercent}
                      </dt>
                      <dd className="whitespace-nowrap text-right tabular-nums">
                        {formatNumber(p.withholdingTaxPercent, 2)}{" "}
                        {t.units.percent}
                      </dd>
                    </div>
                  </dl>
                  <div className="flex pt-1">
                    <PurchaseRowActions
                      ticket={p}
                      perms={perms}
                      isBusy={isBusy}
                      variant="card"
                      onTransition={(input) => handleTransition(p, input)}
                    />
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>

      {/*
        Desktop table.
        - Only shown at `lg` and above. Below `lg` the card list takes
          over.
        - `min-w-[1100px]` reflects the wider column set (price/kg and
          withholding %) and leaves headroom for inline action buttons
          without forcing horizontal scroll on standard 1280px screens.
      */}
      <div className="hidden overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm lg:block dark:border-zinc-800 dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="whitespace-nowrap px-4 py-3">
                  {t.fields.ticketNo}
                </th>
                {showBranchColumn ? (
                  <th className="whitespace-nowrap px-4 py-3">
                    {t.fields.branch}
                  </th>
                ) : null}
                <th className="whitespace-nowrap px-4 py-3">
                  {t.fields.customer}
                </th>
                <th className="whitespace-nowrap px-4 py-3">
                  {t.fields.rubberType}
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right">
                  {t.fields.netWeight}
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right">
                  {t.fields.pricePerKg}
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right">
                  {t.fields.totalAmount}
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right">
                  {t.fields.withholdingTaxPercent}
                </th>
                <th className="whitespace-nowrap px-4 py-3">
                  {t.fields.status}
                </th>
                <th className="whitespace-nowrap px-4 py-3">
                  {t.fields.createdAt}
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right">
                  {t.fields.actions}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const isBusy = busyId === p.id;
                return (
                  <tr
                    key={p.id}
                    className={`border-t border-zinc-200 transition-colors dark:border-zinc-800 ${
                      isBusy ? "bg-zinc-50/60 dark:bg-zinc-900/40" : ""
                    }`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono font-medium">
                      <Link
                        href={`/purchases/${p.id}`}
                        className="text-emerald-700 hover:underline dark:text-emerald-400"
                      >
                        {p.ticketNo}
                      </Link>
                    </td>
                    {showBranchColumn ? (
                      <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {p.branch ? p.branch.code : "—"}
                      </td>
                    ) : null}
                    <td className="px-4 py-3 text-zinc-900 dark:text-zinc-50">
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {p.customer?.fullName ?? "—"}
                        </span>
                        {p.customer ? (
                          <span className="whitespace-nowrap text-xs text-zinc-500 dark:text-zinc-400">
                            {p.customer.code}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {rubberTypeLabel(p.rubberType) ?? p.rubberType}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-zinc-50">
                      {formatNumber(p.netWeight, 2)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-zinc-50">
                      {formatNumber(p.pricePerKg, 2)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums font-semibold text-zinc-900 dark:text-zinc-50">
                      {formatNumber(p.totalAmount, 2)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-600 dark:text-zinc-400">
                      {formatNumber(p.withholdingTaxPercent, 2)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusBadge status={p.status} size="sm" />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {formatDate(p.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <PurchaseRowActions
                        ticket={p}
                        perms={perms}
                        isBusy={isBusy}
                        variant="table"
                        onTransition={(input) => handleTransition(p, input)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/*
        Cancel modal — rendered at the root of the fragment so its
        fixed-positioned backdrop overlays the whole page (table or
        cards). `key={ticketId}` remounts the dialog per open so the
        textarea state always starts empty without us having to
        manually reset it on every close. `isBusy` is wired to the
        same `busyId` the rows watch, which prevents the user from
        closing the dialog (or backdrop) mid-request.
      */}
      {cancelDialogTicket ? (
        <CancelPurchaseDialog
          key={cancelDialogTicket.id}
          ticketNo={cancelDialogTicket.ticketNo}
          isBusy={busyId === cancelDialogTicket.id}
          onConfirm={handleCancelDialogConfirm}
          onClose={handleCancelDialogClose}
        />
      ) : null}
    </>
  );
}
