"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { purchaseT } from "@/modules/purchase/i18n";
import { PURCHASE_STATUSES } from "@/modules/purchase/status";

const t = purchaseT();

type BranchOption = { id: string; code: string; name: string };

type Props = {
  branches: ReadonlyArray<BranchOption>;
  showBranchFilter: boolean;
  selectedBranchId?: string;
  selectedStatus?: string;
  dateFrom?: string;
  dateTo?: string;
};

export function ListFilters({
  branches,
  showBranchFilter,
  selectedBranchId,
  selectedStatus,
  dateFrom,
  dateTo,
}: Props) {
  const router = useRouter();
  const params = useSearchParams();

  function commit(key: string, value: string | null): void {
    const next = new URLSearchParams(params.toString());
    if (value === null || value === "") {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    next.delete("page");
    const qs = next.toString();
    router.replace(qs ? `/purchases?${qs}` : "/purchases");
  }

  function clearAll(): void {
    const next = new URLSearchParams();
    const q = params.get("q");
    if (q) next.set("q", q);
    const qs = next.toString();
    router.replace(qs ? `/purchases?${qs}` : "/purchases");
  }

  const hasAnyFilter = !!(
    selectedBranchId ||
    selectedStatus ||
    dateFrom ||
    dateTo
  );

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:flex-row sm:flex-wrap sm:items-end">
      {showBranchFilter ? (
        <div className="flex flex-col gap-1">
          <label
            htmlFor="filter-branch"
            className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
          >
            {t.fields.branch}
          </label>
          <select
            id="filter-branch"
            value={selectedBranchId ?? ""}
            onChange={(e) => commit("branchId", e.target.value || null)}
            className="h-9 rounded-lg border border-zinc-300 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="">{t.filters.allBranches}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="flex flex-col gap-1">
        <label
          htmlFor="filter-status"
          className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
        >
          {t.fields.status}
        </label>
        <select
          id="filter-status"
          value={selectedStatus ?? ""}
          onChange={(e) => commit("status", e.target.value || null)}
          className="h-9 rounded-lg border border-zinc-300 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">{t.filters.allStatuses}</option>
          {PURCHASE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t.status[s] ?? s}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="filter-from"
          className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
        >
          {t.filters.dateFrom}
        </label>
        <input
          id="filter-from"
          type="date"
          value={dateFrom ?? ""}
          onChange={(e) => commit("dateFrom", e.target.value || null)}
          className="h-9 rounded-lg border border-zinc-300 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="filter-to"
          className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
        >
          {t.filters.dateTo}
        </label>
        <input
          id="filter-to"
          type="date"
          value={dateTo ?? ""}
          onChange={(e) => commit("dateTo", e.target.value || null)}
          className="h-9 rounded-lg border border-zinc-300 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      {hasAnyFilter ? (
        <div className="flex items-end">
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex h-9 items-center rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {t.actions.clear}
          </button>
        </div>
      ) : null}
    </div>
  );
}
