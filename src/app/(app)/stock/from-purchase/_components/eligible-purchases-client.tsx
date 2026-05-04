"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import type { EligiblePurchaseDTO } from "@/modules/stock/dto";
import { stockT } from "@/modules/stock/i18n";
import { STOCK_INTAKE_BULK_MAX } from "@/modules/stock/types";
import { Button, Card, CardContent, useToast } from "@/shared/ui";

import { IntakeActionsBar } from "./intake-actions-bar";
import { SkippedRow } from "./skipped-row";

const t = stockT();

/**
 * Top-level client component for /stock/from-purchase.
 *
 * Owns:
 *
 *   - The current list of tickets (mutable: optimistic removal on success
 *     and re-fetch on tab switch happens via a Next router push instead).
 *   - The selection set (PENDING view only).
 *   - The currently-open inline skip form (one ticket id at a time).
 *   - The "in-flight" flag that disables every button so a double-click
 *     can't fire a second bulk request before the first one returns.
 *
 * Why a single client component instead of separate ones: the bulk action
 * toolbar, the rows, and the inline skip form all need to mutate the
 * same selection / busy / list state. Lifting state up to a single owner
 * is simpler than wiring four contexts. The list/row markup is inlined
 * here for the same reason — a presentational sub-component would only
 * proxy ten props.
 */

type ApiBulkResponse = {
  created: Array<{
    ticketId: string;
    ticketNo: string | null;
    lotId: string;
    lotNo: string;
  }>;
  failed: Array<{
    ticketId: string;
    ticketNo: string | null;
    reason: string;
  }>;
};

type Props = {
  initialTickets: EligiblePurchaseDTO[];
  view: "pending" | "skipped";
  pendingCount: number;
  skippedCount: number;
  showBranchColumn: boolean;
  canCreate: boolean;
  canSkip: boolean;
  canUndoSkip: boolean;
  /** Step 12 / Case A — APPROVED+SKIPPED → CANCELLED */
  canCancelAfterSkip: boolean;
  baseHref: string;
  /** Search params at server-render time (excluding `view` & `page`). */
  baseQuery: Record<string, string>;
  searchTerm?: string;
};

function formatNumber(s: string, fractionDigits = 2): string {
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function EligiblePurchasesClient({
  initialTickets,
  view,
  pendingCount,
  skippedCount,
  showBranchColumn,
  canCreate,
  canSkip,
  canUndoSkip,
  canCancelAfterSkip,
  baseHref,
  baseQuery,
  searchTerm,
}: Props) {
  const [tickets, setTickets] =
    useState<ReadonlyArray<EligiblePurchaseDTO>>(initialTickets);
  const [pendingTotal, setPendingTotal] = useState(pendingCount);
  const [skippedTotal, setSkippedTotal] = useState(skippedCount);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [busyTicketId, setBusyTicketId] = useState<string | null>(null);
  const [isBulkBusy, setIsBulkBusy] = useState(false);
  const [skipFormFor, setSkipFormFor] = useState<string | null>(null);
  const [skipReasonDraft, setSkipReasonDraft] = useState("");
  // Step 12 / Case A — at most one cancel form open at a time, mirroring
  // the skip form's UX so the operator never has two terminal action
  // forms competing for attention.
  const [cancelFormFor, setCancelFormFor] = useState<string | null>(null);
  const [cancelReasonDraft, setCancelReasonDraft] = useState("");

  const toast = useToast();
  const router = useRouter();

  // Why we call `router.refresh()` after every successful mutation:
  //
  // 1. Next.js prefetches the RSC payload for the OTHER tab (e.g. when
  //    you're on PENDING, the "ที่ข้าม" link's payload is already cached).
  //    Without invalidation, clicking it would show the stale list that
  //    doesn't include the ticket we just skipped/undone.
  //
  // 2. The optimistic state below already covers the CURRENT view, so
  //    the user sees their action immediately. `router.refresh()` is the
  //    safety net for the OTHER view — it re-runs the server component
  //    and updates the props that will feed the next mount of this
  //    client component (driven by `key={view}` in page.tsx).
  //
  // It does NOT cause a hard reload — only the RSC payload is refreshed.
  const refreshServerData = useCallback(() => {
    router.refresh();
  }, [router]);

  const isBusy = isBulkBusy || busyTicketId !== null;

  // `URLSearchParams` is mutable — we rebuild a fresh one inside the bar
  // so the user's search/branch filters carry across the tab switch.
  const baseQueryParams = useMemo(() => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(baseQuery)) {
      if (k === "view" || k === "page") continue;
      if (v) p.set(k, v);
    }
    return p;
  }, [baseQuery]);

  const totalSelectable = view === "pending" ? tickets.length : 0;
  const isAllSelected =
    totalSelectable > 0 && selectedIds.size === totalSelectable;

  const removeTickets = useCallback(
    (ids: ReadonlyArray<string>): void => {
      if (ids.length === 0) return;
      const idSet = new Set(ids);
      setTickets((prev) => prev.filter((t) => !idSet.has(t.id)));
      setSelectedIds((prev) => {
        if (prev.size === 0) return prev;
        const next = new Set(prev);
        for (const id of idSet) next.delete(id);
        return next;
      });
    },
    [],
  );

  const toggleOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === tickets.length && tickets.length > 0) {
        return new Set();
      }
      return new Set(tickets.map((t) => t.id));
    });
  }, [tickets]);

  // ─── Bulk create (called by both "all" and "selected") ───────────────
  const runBulkCreate = useCallback(
    async (ticketIds: ReadonlyArray<string>): Promise<void> => {
      if (ticketIds.length === 0) return;
      // Hard client-side cap mirrors the server schema. We slice rather
      // than reject so a "create all" against a 60-row page still
      // submits the first 50 (subsequent batches will land after the
      // list refreshes on the next selection).
      const ids = ticketIds.slice(0, STOCK_INTAKE_BULK_MAX);

      setIsBulkBusy(true);
      try {
        const res = await fetch("/api/stock/lots/from-purchase/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticketIds: ids }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as
            | { error?: string }
            | null;
          toast.show({
            variant: "error",
            title: t.errors.validation,
            description: body?.error ?? `HTTP ${res.status}`,
          });
          return;
        }
        const data = (await res.json()) as ApiBulkResponse;

        const successIds = data.created.map((c) => c.ticketId);
        if (successIds.length > 0) {
          removeTickets(successIds);
          setPendingTotal((n) => Math.max(0, n - successIds.length));
          // Skipped tab is unaffected by create, but pending count
          // changed and StockLot list is now different — refresh so any
          // page the user navigates to next sees fresh data.
          refreshServerData();
        }

        const successCount = data.created.length;
        const failureCount = data.failed.length;
        const failureDetails = data.failed.map((f) => ({
          id: f.ticketId,
          text: t.misc.failureLine(f.ticketNo ?? f.ticketId, f.reason),
        }));

        if (failureCount === 0 && successCount > 0) {
          toast.show({
            variant: "success",
            title: t.misc.toastBulkSuccess(successCount),
          });
        } else if (successCount === 0 && failureCount > 0) {
          toast.show({
            variant: "error",
            title: t.misc.toastBulkAllFailed(failureCount),
            details: failureDetails,
          });
        } else if (successCount > 0 && failureCount > 0) {
          toast.show({
            variant: "warning",
            title: t.misc.toastBulkPartial(successCount, failureCount),
            details: failureDetails,
          });
        }
      } catch (error) {
        toast.show({
          variant: "error",
          title: t.errors.validation,
          description:
            error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsBulkBusy(false);
      }
    },
    [removeTickets, refreshServerData, toast],
  );

  const onBulkCreateAll = useCallback(() => {
    if (tickets.length === 0 || isBusy) return;
    if (!window.confirm(t.actions.confirmBulkCreatePrompt(tickets.length))) {
      return;
    }
    void runBulkCreate(tickets.map((t) => t.id));
  }, [tickets, isBusy, runBulkCreate]);

  const onBulkCreateSelected = useCallback(() => {
    if (selectedIds.size === 0 || isBusy) return;
    if (!window.confirm(t.actions.confirmBulkCreatePrompt(selectedIds.size))) {
      return;
    }
    void runBulkCreate(Array.from(selectedIds));
  }, [selectedIds, isBusy, runBulkCreate]);

  // ─── Single create (reuses /bulk with a single-id payload) ───────────
  const onSingleCreate = useCallback(
    async (ticketId: string, ticketNo: string) => {
      if (isBusy) return;
      if (!window.confirm(t.actions.confirmCreateLotPrompt(ticketNo))) return;

      setBusyTicketId(ticketId);
      try {
        const res = await fetch("/api/stock/lots/from-purchase/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticketIds: [ticketId] }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as
            | { error?: string }
            | null;
          toast.show({
            variant: "error",
            title: t.errors.validation,
            description: body?.error ?? `HTTP ${res.status}`,
          });
          return;
        }
        const data = (await res.json()) as ApiBulkResponse;

        if (data.created.length > 0) {
          const created = data.created[0]!;
          removeTickets([created.ticketId]);
          setPendingTotal((n) => Math.max(0, n - 1));
          refreshServerData();
          toast.show({
            variant: "success",
            title: t.misc.toastSingleSuccess(created.lotNo),
          });
        } else if (data.failed.length > 0) {
          const failed = data.failed[0]!;
          toast.show({
            variant: "error",
            title: t.errors.validation,
            description: t.misc.failureLine(
              failed.ticketNo ?? failed.ticketId,
              failed.reason,
            ),
          });
        }
      } catch (error) {
        toast.show({
          variant: "error",
          title: t.errors.validation,
          description:
            error instanceof Error ? error.message : String(error),
        });
      } finally {
        setBusyTicketId(null);
      }
    },
    [isBusy, removeTickets, refreshServerData, toast],
  );

  // ─── Skip / Undo ─────────────────────────────────────────────────────
  const openSkipForm = useCallback((ticketId: string) => {
    setSkipFormFor(ticketId);
    setSkipReasonDraft("");
  }, []);

  const cancelSkipForm = useCallback(() => {
    setSkipFormFor(null);
    setSkipReasonDraft("");
  }, []);

  const submitSkip = useCallback(
    async (ticketId: string, ticketNo: string) => {
      const reason = skipReasonDraft.trim();
      if (reason.length < 5) return;
      if (isBusy) return;
      if (!window.confirm(t.actions.confirmSkipIntakePrompt(ticketNo))) return;

      setBusyTicketId(ticketId);
      try {
        const res = await fetch("/api/stock/lots/from-purchase/skip", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ purchaseTicketId: ticketId, reason }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as
            | { error?: string }
            | null;
          toast.show({
            variant: "error",
            title: t.errors.validation,
            description: body?.error ?? `HTTP ${res.status}`,
          });
          return;
        }
        // Optimistic remove from PENDING list (we're on this view) and
        // bump the SKIPPED tab count so the user sees the move happen.
        // `refreshServerData()` then invalidates the SKIPPED tab's
        // prefetched RSC so the just-skipped ticket actually shows up
        // there when the user clicks the tab — combined with the
        // `key={view}` remount in page.tsx, the new mount picks up the
        // fresh server-rendered list.
        removeTickets([ticketId]);
        setPendingTotal((n) => Math.max(0, n - 1));
        setSkippedTotal((n) => n + 1);
        cancelSkipForm();
        refreshServerData();
        toast.show({
          variant: "success",
          title: t.misc.toastSkipSuccess(ticketNo),
        });
      } catch (error) {
        toast.show({
          variant: "error",
          title: t.errors.validation,
          description:
            error instanceof Error ? error.message : String(error),
        });
      } finally {
        setBusyTicketId(null);
      }
    },
    [
      skipReasonDraft,
      isBusy,
      removeTickets,
      cancelSkipForm,
      refreshServerData,
      toast,
    ],
  );

  // ─── Cancel after skip (Case A) ──────────────────────────────────────
  const openCancelForm = useCallback((ticketId: string) => {
    setCancelFormFor(ticketId);
    setCancelReasonDraft("");
  }, []);

  const closeCancelForm = useCallback(() => {
    setCancelFormFor(null);
    setCancelReasonDraft("");
  }, []);

  const submitCancelAfterSkip = useCallback(
    async (ticketId: string, ticketNo: string) => {
      const reason = cancelReasonDraft.trim();
      if (reason.length < 5) return;
      if (isBusy) return;
      if (
        !window.confirm(
          `ยืนยันการยกเลิกใบรับซื้อ ${ticketNo}? การกระทำนี้จะเปลี่ยนสถานะเป็น CANCELLED`,
        )
      ) {
        return;
      }

      setBusyTicketId(ticketId);
      try {
        const res = await fetch(
          `/api/purchase-tickets/${ticketId}/cancel-after-skip`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason }),
          },
        );
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as
            | { error?: string }
            | null;
          toast.show({
            variant: "error",
            title: t.errors.validation,
            description: body?.error ?? `HTTP ${res.status}`,
          });
          return;
        }
        // The cancelled ticket is no longer eligible for intake at all —
        // remove from the SKIPPED list and shrink that count. The PENDING
        // count was already 0 for this ticket (it was skipped), so we
        // don't touch it. router.refresh() invalidates the Purchase list
        // RSC cache so /purchases reflects the new CANCELLED status when
        // the operator navigates there next.
        removeTickets([ticketId]);
        setSkippedTotal((n) => Math.max(0, n - 1));
        closeCancelForm();
        refreshServerData();
        toast.show({
          variant: "success",
          title: `ยกเลิกใบรับซื้อ ${ticketNo} เรียบร้อย`,
        });
      } catch (error) {
        toast.show({
          variant: "error",
          title: t.errors.validation,
          description:
            error instanceof Error ? error.message : String(error),
        });
      } finally {
        setBusyTicketId(null);
      }
    },
    [
      cancelReasonDraft,
      isBusy,
      removeTickets,
      closeCancelForm,
      refreshServerData,
      toast,
    ],
  );

  const onUndoSkip = useCallback(
    async (ticketId: string) => {
      if (isBusy) return;
      const ticket = tickets.find((t) => t.id === ticketId);
      const ticketNo = ticket?.ticketNo ?? ticketId;
      if (!window.confirm(t.actions.confirmUndoSkipPrompt(ticketNo))) return;

      setBusyTicketId(ticketId);
      try {
        const res = await fetch("/api/stock/lots/from-purchase/undo-skip", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ purchaseTicketId: ticketId }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as
            | { error?: string }
            | null;
          toast.show({
            variant: "error",
            title: t.errors.validation,
            description: body?.error ?? `HTTP ${res.status}`,
          });
          return;
        }
        // We're on the SKIPPED view; remove from the local list and
        // shift counts so the tab labels are immediately accurate.
        // Then refresh server data so the PENDING tab's RSC payload
        // includes the just-restored ticket.
        removeTickets([ticketId]);
        setSkippedTotal((n) => Math.max(0, n - 1));
        setPendingTotal((n) => n + 1);
        refreshServerData();
        toast.show({
          variant: "success",
          title: t.misc.toastUndoSkipSuccess(ticketNo),
        });
      } catch (error) {
        toast.show({
          variant: "error",
          title: t.errors.validation,
          description:
            error instanceof Error ? error.message : String(error),
        });
      } finally {
        setBusyTicketId(null);
      }
    },
    [isBusy, tickets, removeTickets, refreshServerData, toast],
  );

  // ─── Render ──────────────────────────────────────────────────────────

  const isEmpty = tickets.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <IntakeActionsBar
        view={view}
        pendingCount={pendingTotal}
        skippedCount={skippedTotal}
        selectedCount={selectedIds.size}
        totalSelectable={totalSelectable}
        baseHref={baseHref}
        baseQuery={baseQueryParams}
        canSelectAll={canCreate}
        isAllSelected={isAllSelected}
        onToggleSelectAll={toggleSelectAll}
        onBulkCreateAll={onBulkCreateAll}
        onBulkCreateSelected={onBulkCreateSelected}
        isBusy={isBusy}
      />

      {isEmpty ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {view === "skipped"
              ? t.empty.skippedEmpty
              : searchTerm
                ? t.empty.fromPurchaseNoResults(searchTerm)
                : t.empty.fromPurchaseEmpty}
          </CardContent>
        </Card>
      ) : view === "skipped" ? (
        <ul className="flex flex-col gap-3">
          {tickets.map((tk) => (
            <SkippedRow
              key={tk.id}
              ticket={tk}
              showBranch={showBranchColumn}
              canUndo={canUndoSkip}
              onUndo={onUndoSkip}
              canCancel={canCancelAfterSkip}
              isCancelFormOpen={cancelFormFor === tk.id}
              cancelReason={cancelReasonDraft}
              onCancelReasonChange={setCancelReasonDraft}
              onOpenCancelForm={openCancelForm}
              onCloseCancelForm={closeCancelForm}
              onSubmitCancel={submitCancelAfterSkip}
              isBusy={isBusy && busyTicketId !== tk.id}
            />
          ))}
        </ul>
      ) : (
        <ul className="flex flex-col gap-3">
          {tickets.map((tk) => {
            const isSelected = selectedIds.has(tk.id);
            const isThisRowBusy = busyTicketId === tk.id;
            const rowDisabled = isBulkBusy || (isBusy && !isThisRowBusy);
            const showSkipFormHere = skipFormFor === tk.id;

            return (
              <li key={tk.id}>
                <Card>
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      {canCreate ? (
                        <input
                          type="checkbox"
                          aria-label={`select ${tk.ticketNo}`}
                          className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                          checked={isSelected}
                          disabled={rowDisabled}
                          onChange={() => toggleOne(tk.id)}
                        />
                      ) : null}
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="font-mono text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                          {tk.ticketNo}
                        </span>
                        <span className="break-words text-base font-semibold text-zinc-900 dark:text-zinc-50">
                          {tk.customer?.fullName ?? "—"}
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {tk.customer?.code ?? "—"}
                          {showBranchColumn && tk.branch
                            ? ` · ${tk.branch.code}`
                            : ""}
                          {" · "}
                          {formatDate(tk.createdAt)}
                        </span>
                      </div>
                      <span className="hidden whitespace-nowrap text-right text-sm tabular-nums text-zinc-700 sm:block dark:text-zinc-300">
                        {formatNumber(tk.netWeight, 2)} {t.units.kg}
                        {" · "}
                        {formatNumber(tk.totalAmount, 2)} {t.units.baht}
                      </span>
                    </div>

                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-600 sm:hidden dark:text-zinc-400">
                      <dt>{t.fields.netWeight}</dt>
                      <dd className="text-right tabular-nums">
                        {formatNumber(tk.netWeight, 2)} {t.units.kg}
                      </dd>
                      <dt>{t.fields.pricePerKg}</dt>
                      <dd className="text-right tabular-nums">
                        {formatNumber(tk.pricePerKg, 2)} {t.units.bahtPerKg}
                      </dd>
                      <dt className="font-medium text-zinc-900 dark:text-zinc-50">
                        {t.fields.totalAmount}
                      </dt>
                      <dd className="text-right font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                        {formatNumber(tk.totalAmount, 2)} {t.units.baht}
                      </dd>
                    </dl>

                    {showSkipFormHere ? (
                      <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/40">
                        <label className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-amber-900 dark:text-amber-100">
                            {t.misc.skipReasonLabel}
                          </span>
                          <textarea
                            value={skipReasonDraft}
                            onChange={(e) =>
                              setSkipReasonDraft(e.currentTarget.value)
                            }
                            placeholder={t.misc.skipReasonPlaceholder}
                            rows={3}
                            className="resize-y rounded-md border border-amber-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-amber-800 dark:bg-zinc-900 dark:text-zinc-100"
                            maxLength={500}
                            autoFocus
                            disabled={isBusy}
                          />
                          <span className="text-[11px] text-amber-800 dark:text-amber-200">
                            {t.misc.skipReasonHelp}
                          </span>
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            onClick={() => submitSkip(tk.id, tk.ticketNo)}
                            disabled={
                              skipReasonDraft.trim().length < 5 || isBusy
                            }
                            aria-disabled={
                              skipReasonDraft.trim().length < 5 || isBusy
                            }
                          >
                            {isThisRowBusy
                              ? t.actions.submitting
                              : t.actions.confirmSkipIntake}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={cancelSkipForm}
                            disabled={isThisRowBusy}
                          >
                            {t.actions.cancelSkipIntake}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {canSkip ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => openSkipForm(tk.id)}
                            disabled={rowDisabled}
                            aria-disabled={rowDisabled}
                          >
                            {t.actions.skipIntake}
                          </Button>
                        ) : null}
                        {canCreate ? (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => onSingleCreate(tk.id, tk.ticketNo)}
                            disabled={rowDisabled}
                            aria-disabled={rowDisabled}
                          >
                            {isThisRowBusy
                              ? t.actions.submitting
                              : t.actions.createLot}
                          </Button>
                        ) : null}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
