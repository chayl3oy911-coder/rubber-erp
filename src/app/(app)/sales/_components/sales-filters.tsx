"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { salesT } from "@/modules/sales/i18n";
import { SALE_TYPES, SALES_ORDER_STATUSES } from "@/modules/sales/types";

const t = salesT();

type BranchOption = { id: string; code: string; name: string };

type Props = {
  branches: ReadonlyArray<BranchOption>;
  showBranchFilter: boolean;
  selectedBranchId?: string;
  selectedStatus?: string;
  selectedSaleType?: string;
  selectedDateFrom?: string;
  selectedDateTo?: string;
};

const selectClass =
  "h-9 rounded-lg border border-zinc-300 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

const inputClass =
  "h-9 rounded-lg border border-zinc-300 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

export function SalesFilters({
  branches,
  showBranchFilter,
  selectedBranchId,
  selectedStatus,
  selectedSaleType,
  selectedDateFrom,
  selectedDateTo,
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
    router.replace(qs ? `/sales?${qs}` : "/sales");
  }

  function clearAll(): void {
    const next = new URLSearchParams();
    const q = params.get("q");
    if (q) next.set("q", q);
    const qs = next.toString();
    router.replace(qs ? `/sales?${qs}` : "/sales");
  }

  const hasAnyFilter = !!(
    selectedBranchId ||
    selectedStatus ||
    selectedSaleType ||
    selectedDateFrom ||
    selectedDateTo
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
            className={selectClass}
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
          className={selectClass}
        >
          <option value="">{t.filters.allStatuses}</option>
          {SALES_ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t.status[s] ?? s}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="filter-saleType"
          className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
        >
          {t.fields.saleType}
        </label>
        <select
          id="filter-saleType"
          value={selectedSaleType ?? ""}
          onChange={(e) => commit("saleType", e.target.value || null)}
          className={selectClass}
        >
          <option value="">{t.filters.allSaleTypes}</option>
          {SALE_TYPES.map((st) => (
            <option key={st} value={st}>
              {t.saleType[st] ?? st}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="filter-dateFrom"
          className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
        >
          {t.filters.dateFrom}
        </label>
        <input
          id="filter-dateFrom"
          type="date"
          value={selectedDateFrom ?? ""}
          onChange={(e) => commit("dateFrom", e.target.value || null)}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="filter-dateTo"
          className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
        >
          {t.filters.dateTo}
        </label>
        <input
          id="filter-dateTo"
          type="date"
          value={selectedDateTo ?? ""}
          onChange={(e) => commit("dateTo", e.target.value || null)}
          className={inputClass}
        />
      </div>

      {hasAnyFilter ? (
        <div className="flex items-end">
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex h-9 shrink-0 items-center rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {t.actions.clear}
          </button>
        </div>
      ) : null}
    </div>
  );
}
