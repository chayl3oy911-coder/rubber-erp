"use client";

import { forwardRef } from "react";

import { rubberTypeLabel } from "@/modules/purchase/rubber-types";
import type { SalesLineFormValue } from "@/modules/sales/action-state";
import { salesT } from "@/modules/sales/i18n";

const t = salesT();

const inputClass =
  "h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm tabular-nums text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

const useAllBtnClass =
  "inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-emerald-600 bg-white px-3 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-emerald-500 dark:bg-zinc-900 dark:text-emerald-300";

const removeBtnClass =
  "inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-red-300 bg-white px-3 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 dark:border-red-900 dark:bg-zinc-900 dark:text-red-300";

function formatNumber(s: string, fractionDigits = 2): string {
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

type Props = {
  index: number;
  line: SalesLineFormValue;
  error?: string;
  /** When true, all inputs/buttons are disabled (e.g. CONFIRMED edit). */
  disabled?: boolean;
  onChangeGross: (next: string) => void;
  onUseAll: () => void;
  onRemove: () => void;
};

/**
 * Editable row for a single line in the sales bill.
 *
 * Renders the lot snapshot read-only (lotNo, rubberType, remaining,
 * cost/kg) plus an editable `grossWeight` input. The lot snapshot fields
 * come from `line` directly (set when the picker added it) so the row is
 * self-contained — no extra fetch needed even after a server validation
 * round-trip.
 *
 * The forwarded ref points at the gross-weight input so the parent can
 * focus it (e.g. when the user clicks "อยู่ในบิลแล้ว" in the picker).
 */
export const SalesLineRow = forwardRef<HTMLInputElement, Props>(
  function SalesLineRow(
    { index, line, error, disabled, onChangeGross, onUseAll, onRemove },
    ref,
  ) {
    const remainingNum = Number(line.remainingWeight);
    const grossNum = Number(line.grossWeight);
    const exceeds =
      Number.isFinite(remainingNum) &&
      Number.isFinite(grossNum) &&
      grossNum > remainingNum;
    const empty = !line.grossWeight || grossNum <= 0;

    return (
      <li
        data-line-index={index}
        className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {line.lotNo || `Lot ${index + 1}`}
          </span>
          {line.rubberType ? (
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {rubberTypeLabel(line.rubberType) ?? line.rubberType}
            </span>
          ) : null}
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            · {t.fields.remainingWeight}:{" "}
            <span className="tabular-nums text-zinc-900 dark:text-zinc-50">
              {formatNumber(line.remainingWeight, 2)} {t.units.kg}
            </span>
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            · {t.fields.effectiveCostPerKg}:{" "}
            <span className="tabular-nums text-zinc-900 dark:text-zinc-50">
              {formatNumber(line.effectiveCostPerKg, 2)} {t.units.bahtPerKg}
            </span>
          </span>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
          <div className="flex-1">
            <label
              htmlFor={`gross-${index}`}
              className="mb-1 block text-xs text-zinc-600 dark:text-zinc-400"
            >
              {t.fields.lineGrossWeight} ({t.units.kg})
            </label>
            <input
              id={`gross-${index}`}
              ref={ref}
              type="number"
              step="0.01"
              min="0"
              max={line.remainingWeight || undefined}
              inputMode="decimal"
              className={inputClass}
              value={line.grossWeight}
              onChange={(e) => onChangeGross(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                  e.preventDefault();
                }
              }}
              disabled={disabled}
              required
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className={useAllBtnClass}
              onClick={onUseAll}
              disabled={disabled}
            >
              {t.actions.useAllRemaining}
            </button>
            <button
              type="button"
              className={removeBtnClass}
              onClick={onRemove}
              disabled={disabled}
            >
              {t.actions.removeLine}
            </button>
          </div>
        </div>

        {error ? (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        ) : exceeds ? (
          <p className="text-xs text-red-600 dark:text-red-400">
            {t.errors.insufficientStock}
          </p>
        ) : empty ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {t.errors.lineGrossPositive}
          </p>
        ) : null}
      </li>
    );
  },
);
