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

function formatNumber(s: string, fractionDigits = 2): string {
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

type Props = {
  /** Restrict picker to this branch (when scoped). undefined = no scope. */
  branchId: string | undefined;
  /** Lot ids already in the bill — render "อยู่ในบิลแล้ว" instead of "เพิ่ม". */
  selectedLotIds: ReadonlySet<string>;
  /** Called when user clicks "เพิ่มเข้าบิล" on a row. */
  onAdd: (lot: EligibleLotForSaleDTO) => void;
  /** Called when user clicks "อยู่ในบิลแล้ว" — parent should focus the row. */
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
  selectedLotIds,
  onAdd,
  onRequestFocus,
}: Props) {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [state, setState] = useState<FetchState>(INITIAL_STATE);
  const [isPending, startTransition] = useTransition();

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
              const isSelected = selectedLotIds.has(lot.id);
              return (
                <li
                  key={lot.id}
                  className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between"
                >
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
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                      <span>
                        {t.fields.remainingWeight}:{" "}
                        <span className="tabular-nums text-zinc-900 dark:text-zinc-50">
                          {formatNumber(lot.remainingWeight, 2)} {t.units.kg}
                        </span>
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
                  {isSelected ? (
                    <button
                      type="button"
                      className={inBillBtnClass}
                      onClick={() => onRequestFocus?.(lot.id)}
                    >
                      {t.actions.alreadyAdded}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={addBtnClass}
                      onClick={() => onAdd(lot)}
                    >
                      {t.actions.addToBill}
                    </button>
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
