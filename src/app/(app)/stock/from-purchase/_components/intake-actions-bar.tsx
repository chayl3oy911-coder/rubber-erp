"use client";

import Link from "next/link";

import { stockT } from "@/modules/stock/i18n";
import { Button } from "@/shared/ui";

const t = stockT();

type Props = {
  view: "pending" | "skipped";
  pendingCount: number;
  skippedCount: number;
  selectedCount: number;
  totalSelectable: number;
  baseHref: string;
  baseQuery: URLSearchParams;
  canSelectAll: boolean;
  isAllSelected: boolean;
  onToggleSelectAll: () => void;
  onBulkCreateAll: () => void;
  onBulkCreateSelected: () => void;
  isBusy: boolean;
};

/**
 * Sticky toolbar above the eligible-purchases list.
 *
 * Why a separate component: the toolbar mixes link-style tab navigation
 * (which uses Next's `Link` to keep prefetching) with imperative buttons
 * that fire client-side handlers. Separating it out keeps the client
 * component below shorter and tab-key navigation predictable.
 *
 * The "select all" checkbox is a tri-state visual:
 *   - empty when selection is empty
 *   - filled when every selectable row is selected
 *   - "indeterminate" handled via aria-checked="mixed" + a CSS hint
 *
 * (We don't use the native `indeterminate` DOM property because that
 * requires a ref + effect; the visual hint via class is plenty for our
 * intent while staying server-render-safe.)
 */
export function IntakeActionsBar({
  view,
  pendingCount,
  skippedCount,
  selectedCount,
  totalSelectable,
  baseHref,
  baseQuery,
  canSelectAll,
  isAllSelected,
  onToggleSelectAll,
  onBulkCreateAll,
  onBulkCreateSelected,
  isBusy,
}: Props) {
  const tabBase =
    "inline-flex h-9 items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors";
  const tabActive =
    "border-emerald-600 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-300";
  const tabIdle =
    "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

  // We preserve search/branch filters when switching tabs but always
  // reset the page (a count of "8 skipped" rarely matches page=3 of the
  // pending tab). `URLSearchParams` is mutable — clone via copy ctor.
  const cloneQuery = (next: "pending" | "skipped"): string => {
    const params = new URLSearchParams(baseQuery);
    params.delete("page");
    if (next === "pending") params.delete("view");
    else params.set("view", next);
    const qs = params.toString();
    return qs ? `${baseHref}?${qs}` : baseHref;
  };

  const showSelectionUI = view === "pending" && canSelectAll;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={cloneQuery("pending")}
          className={`${tabBase} ${view === "pending" ? tabActive : tabIdle}`}
          aria-current={view === "pending" ? "page" : undefined}
        >
          {t.misc.pendingCount(pendingCount)}
        </Link>
        <Link
          href={cloneQuery("skipped")}
          className={`${tabBase} ${view === "skipped" ? tabActive : tabIdle}`}
          aria-current={view === "skipped" ? "page" : undefined}
        >
          {t.misc.skippedCount(skippedCount)}
        </Link>
      </div>

      {showSelectionUI ? (
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex select-none items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
              checked={isAllSelected && totalSelectable > 0}
              aria-checked={
                selectedCount === 0
                  ? "false"
                  : isAllSelected
                    ? "true"
                    : "mixed"
              }
              disabled={totalSelectable === 0 || isBusy}
              onChange={onToggleSelectAll}
            />
            <span>
              {isAllSelected ? t.actions.deselectAll : t.actions.selectAll}
            </span>
          </label>

          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {t.misc.selectedCount(selectedCount)}
          </span>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onBulkCreateSelected}
              disabled={isBusy || selectedCount === 0}
              aria-disabled={isBusy || selectedCount === 0}
            >
              {t.actions.bulkCreateSelected}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onBulkCreateAll}
              disabled={isBusy || totalSelectable === 0}
              aria-disabled={isBusy || totalSelectable === 0}
            >
              {t.actions.bulkCreateAll}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
