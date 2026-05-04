"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import { rubberTypeLabel } from "@/modules/purchase/rubber-types";
import type { EligibleLotForSaleDTO } from "@/modules/sales/dto";
import { salesT } from "@/modules/sales/i18n";
import { Card, CardContent, Input } from "@/shared/ui";

const t = salesT();

const PAGE_SIZE = 50;

const addBtnClass =
  "inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:disabled:bg-zinc-700";

const inBillBtnClass =
  "inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-emerald-600 bg-white px-3 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-emerald-500 dark:bg-zinc-900 dark:text-emerald-300";

const loadMoreBtnClass =
  "inline-flex h-10 w-full items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

const baseInputClass =
  "h-9 w-full rounded-lg border bg-white px-2.5 text-right text-sm tabular-nums text-zinc-900 outline-none transition-colors sm:w-[140px] dark:bg-zinc-900 dark:text-zinc-50";

const okInputClass =
  "border-zinc-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700";

const errorInputClass =
  "border-red-500 text-red-700 focus:border-red-500 focus:ring-2 focus:ring-red-500/30 dark:border-red-500 dark:text-red-300";

function formatNumber(s: string | number, fractionDigits = 2): string {
  const n = typeof s === "number" ? s : Number(s);
  if (!Number.isFinite(n)) return String(s);
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

type Props = {
  /** Restrict picker to this branch (when scoped). undefined = no scope. */
  branchId: string | undefined;
  /**
   * Map of stockLotId → grossWeight string for lines currently in the bill.
   * Used to (a) detect "already added" rows so we render the persistent
   * info block instead of an input, and (b) compute the live "เหลือหลังขาย"
   * for those rows so the operator can keep eyeballing remaining stock
   * even after committing to a partial sale.
   */
  selectedLines: ReadonlyMap<string, string>;
  /**
   * Called when user clicks "+ เพิ่มเข้าบิล". `grossWeight` is the string
   * the user typed (or the prefilled `lot.remainingWeight` if untouched).
   * Picker validates that the value is a positive number ≤ remainingWeight
   * before this fires, so the parent can trust it for the line payload.
   */
  onAdd: (lot: EligibleLotForSaleDTO, grossWeight: string) => void;
  /** Called when user clicks "อยู่ในบิลแล้ว" — parent should focus/scroll the row. */
  onRequestFocus?: (stockLotId: string) => void;
};

type FetchState = {
  lots: EligibleLotForSaleDTO[];
  total: number;
  page: number;
  error: string | null;
};

const INITIAL_STATE: FetchState = {
  lots: [],
  total: 0,
  page: 0,
  error: null,
};

export function SalesLotPicker({
  branchId,
  selectedLines,
  onAdd,
  onRequestFocus,
}: Props) {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [state, setState] = useState<FetchState>(INITIAL_STATE);
  const [isPending, startTransition] = useTransition();
  // Per-lot weight the user has typed (or that we have prefilled implicitly).
  // Indexed by stockLotId. Once a lot is added to the bill we drop its entry
  // so the next time it surfaces (e.g. removed-then-readded) the input
  // re-prefills from the lot's current `remainingWeight`.
  const [pendingWeights, setPendingWeights] = useState<Record<string, string>>(
    {},
  );

  // 250ms debounce for the search box.
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => window.clearTimeout(id);
  }, [q]);

  // Fetch a page and reconcile state. `replace=true` swaps the list (used for
  // page 1 / search / branch changes); `replace=false` appends (load-more).
  // All `setState` calls happen AFTER the awaited fetch — the React 19
  // `react-hooks/set-state-in-effect` lint rule treats synchronous setState
  // inside an effect-triggered callback as a cascading render; awaiting the
  // network round-trip first cleanly satisfies that.
  const loadPage = useCallback(
    async (
      page: number,
      query: string,
      branch: string | undefined,
      replace: boolean,
    ) => {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (branch) params.set("branchId", branch);
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      try {
        const res = await fetch(
          `/api/sales/eligible-lots?${params.toString()}`,
          { credentials: "same-origin" },
        );
        if (!res.ok) {
          setState((prev) => ({ ...prev, error: t.errors.validation }));
          return;
        }
        const data = (await res.json()) as {
          lots: EligibleLotForSaleDTO[];
          total: number;
          page: number;
          pageSize: number;
        };
        setState((prev) => ({
          lots: replace ? data.lots : [...prev.lots, ...data.lots],
          total: data.total,
          page: data.page,
          error: null,
        }));
      } catch {
        setState((prev) => ({ ...prev, error: t.errors.validation }));
      }
    },
    [],
  );

  // Reset + load page 1 whenever debounced search or branch changes.
  // `useTransition` keeps the UI responsive (and gives `isPending` for
  // the loading state) without doing a synchronous setState in the effect.
  useEffect(() => {
    startTransition(() => {
      void loadPage(1, debouncedQ, branchId, true);
    });
  }, [debouncedQ, branchId, loadPage]);

  const handleWeightChange = useCallback(
    (lotId: string, next: string) => {
      setPendingWeights((prev) => ({ ...prev, [lotId]: next }));
    },
    [],
  );

  const handleAddClick = useCallback(
    (lot: EligibleLotForSaleDTO) => {
      const weightStr = pendingWeights[lot.id] ?? lot.remainingWeight;
      onAdd(lot, weightStr);
      // Drop the entry so a later remove-then-readd defaults back to the
      // (possibly updated) lot.remainingWeight rather than a stale value.
      setPendingWeights((prev) => {
        if (!(lot.id in prev)) return prev;
        const next = { ...prev };
        delete next[lot.id];
        return next;
      });
    },
    [onAdd, pendingWeights],
  );

  const hasMore = state.page > 0 && state.lots.length < state.total;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            {t.page.pickerTitle}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {t.page.pickerSubtitle}
          </p>
        </div>

        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.placeholders.pickerSearch}
          inputMode="search"
          autoComplete="off"
        />

        {state.error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {state.error}
          </p>
        ) : null}

        {state.lots.length === 0 && !isPending ? (
          <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
            {debouncedQ
              ? t.empty.noEligibleLotsForSearch(debouncedQ)
              : t.empty.noEligibleLots}
          </p>
        ) : null}

        {state.lots.length > 0 ? (
          <ul
            className={
              "flex max-h-[60vh] flex-col gap-2 overflow-y-auto pr-1 sm:max-h-[70vh]"
            }
          >
            {state.lots.map((lot) => {
              const remainingNum = Number(lot.remainingWeight);
              const selectedGrossStr = selectedLines.get(lot.id);
              const isSelected = selectedGrossStr !== undefined;
              // For NOT-selected rows: editable input value + validation.
              const weightStr =
                pendingWeights[lot.id] ?? lot.remainingWeight;
              const weightNum = Number(weightStr);
              const weightValid =
                Number.isFinite(weightNum) && weightNum > 0;
              const exceeds =
                weightValid &&
                Number.isFinite(remainingNum) &&
                weightNum > remainingNum;
              const empty = !weightValid;
              const addDisabled = isSelected || empty || exceeds;
              // remainingAfter: from the value the user is about to add when
              // the row is editable, or from the locked-in line grossWeight
              // when the lot is already in the bill. Clamped at 0 either way.
              const selectedGrossNum = isSelected
                ? Number(selectedGrossStr)
                : null;
              const usedNum =
                isSelected && Number.isFinite(selectedGrossNum as number)
                  ? Math.max(0, selectedGrossNum as number)
                  : weightValid
                    ? weightNum
                    : 0;
              const remainingAfter = Number.isFinite(remainingNum)
                ? Math.max(0, remainingNum - usedNum)
                : remainingNum;

              return (
                <li
                  key={lot.id}
                  className={[
                    "flex flex-col gap-2 rounded-lg border bg-white p-3 dark:bg-zinc-900",
                    isSelected
                      ? "border-emerald-300 dark:border-emerald-900"
                      : "border-zinc-200 dark:border-zinc-800",
                  ].join(" ")}
                >
                  {/* Snapshot row — lot id, type, ticket, customer */}
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        {lot.lotNo}
                      </span>
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {rubberTypeLabel(lot.rubberType) ?? lot.rubberType}
                      </span>
                      {lot.sourceTicket ? (
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          · {lot.sourceTicket.ticketNo}
                        </span>
                      ) : null}
                      {lot.customer ? (
                        <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                          · {lot.customer.fullName}
                        </span>
                      ) : null}
                    </div>
                    {/* Always-visible stock + cost snapshot. The label flips
                        from "คงเหลือ" → "คงเหลือเดิม" when the lot is in the
                        bill so it's clear that a portion has been committed. */}
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                      <span>
                        {isSelected ? (
                          <span className="tabular-nums text-zinc-900 dark:text-zinc-50">
                            {t.misc.pickerOriginalRemaining(
                              formatNumber(lot.remainingWeight, 2),
                              t.units.kg,
                            )}
                          </span>
                        ) : (
                          <>
                            {t.fields.remainingWeight}:{" "}
                            <span className="tabular-nums text-zinc-900 dark:text-zinc-50">
                              {formatNumber(lot.remainingWeight, 2)}{" "}
                              {t.units.kg}
                            </span>
                          </>
                        )}
                      </span>
                      <span>
                        {t.fields.effectiveCostPerKg}:{" "}
                        <span className="tabular-nums text-zinc-900 dark:text-zinc-50">
                          {formatNumber(lot.effectiveCostPerKg, 2)}{" "}
                          {t.units.bahtPerKg}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Action row */}
                  {isSelected ? (
                    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs">
                        <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                          {t.misc.pickerUsedInBill(
                            formatNumber(selectedGrossStr ?? "0", 2),
                            t.units.kg,
                          )}
                        </span>
                        <span className="tabular-nums text-zinc-600 dark:text-zinc-400">
                          ·{" "}
                          {t.misc.pickerRemainingAfterFromTotal(
                            formatNumber(remainingAfter, 2),
                            formatNumber(lot.remainingWeight, 2),
                            t.units.kg,
                          )}
                        </span>
                      </div>
                      <button
                        type="button"
                        className={inBillBtnClass}
                        onClick={() => onRequestFocus?.(lot.id)}
                      >
                        {t.actions.alreadyAdded}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                        <div className="flex flex-1 flex-col gap-1 sm:flex-none">
                          <label
                            htmlFor={`pick-${lot.id}`}
                            className="text-xs text-zinc-600 dark:text-zinc-400"
                          >
                            {t.misc.pickerWeightLabel} ({t.units.kg})
                          </label>
                          <input
                            id={`pick-${lot.id}`}
                            type="number"
                            step="0.01"
                            min="0"
                            inputMode="decimal"
                            className={`${baseInputClass} ${exceeds || empty ? errorInputClass : okInputClass}`}
                            value={weightStr}
                            onChange={(e) =>
                              handleWeightChange(lot.id, e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                                e.preventDefault();
                              }
                              if (e.key === "Enter" && !addDisabled) {
                                e.preventDefault();
                                handleAddClick(lot);
                              }
                            }}
                            onWheel={(e) => e.currentTarget.blur()}
                            aria-invalid={exceeds || empty || undefined}
                          />
                        </div>
                        <div className="flex flex-1 flex-col items-start gap-1 sm:items-end">
                          <span className="text-xs tabular-nums text-zinc-600 dark:text-zinc-400">
                            {t.misc.pickerRemainingAfterShort(
                              formatNumber(remainingAfter, 2),
                              t.units.kg,
                            )}
                          </span>
                          <button
                            type="button"
                            className={addBtnClass}
                            onClick={() => handleAddClick(lot)}
                            disabled={addDisabled}
                          >
                            {t.actions.addToBill}
                          </button>
                        </div>
                      </div>
                      {exceeds ? (
                        <p className="text-xs font-medium text-red-600 dark:text-red-400">
                          {t.errors.insufficientStockShort}
                        </p>
                      ) : empty ? (
                        <p className="text-xs text-red-600 dark:text-red-400">
                          {t.errors.lineGrossPositive}
                        </p>
                      ) : null}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}

        {hasMore ? (
          <button
            type="button"
            className={loadMoreBtnClass}
            disabled={isPending}
            onClick={() =>
              startTransition(() => {
                void loadPage(state.page + 1, debouncedQ, branchId, false);
              })
            }
          >
            {isPending ? t.actions.saving : t.actions.loadMore}
          </button>
        ) : null}

        {state.lots.length > 0 ? (
          <p className="text-right text-[11px] text-zinc-500 dark:text-zinc-400">
            {t.misc.paginationInfo(1, state.lots.length, state.total)}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
