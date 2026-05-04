"use client";

import { forwardRef } from "react";

import { rubberTypeLabel } from "@/modules/purchase/rubber-types";
import type { SalesLineFormValue } from "@/modules/sales/action-state";
import { salesT } from "@/modules/sales/i18n";

const t = salesT();

const removeBtnClass =
  "inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-md border border-red-300 bg-white px-2.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:bg-zinc-900 dark:text-red-300";

function formatNumber(s: string | number, fractionDigits = 2): string {
  const n = typeof s === "number" ? s : Number(s);
  if (!Number.isFinite(n)) return String(s);
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

type Props = {
  index: number;
  line: SalesLineFormValue;
  /** Server-side per-line error from the previous submit, if any. */
  error?: string;
  /** When true, all controls (e.g. the remove button) are disabled. */
  disabled?: boolean;
  onRemove: () => void;
};

/**
 * Compact, read-only line item shown after a lot has been added to the
 * bill. The grossWeight is fixed at add time (set in the lot picker) and
 * cannot be edited from the bill — to change a weight the operator must
 * remove the line and add the lot again from the picker. This keeps each
 * row very terse and avoids a stale "edit-and-forget-to-recompute" bug
 * pattern.
 *
 * The forwarded ref points at the `<li>` element so the parent can
 * `scrollIntoView` (and optionally flash) when the user clicks
 * "อยู่ในบิลแล้ว" in the picker.
 */
export const SalesLineRow = forwardRef<HTMLLIElement, Props>(
  function SalesLineRow({ index, line, error, disabled, onRemove }, ref) {
    const remainingNum = Number(line.remainingWeight);
    const grossNum = Number(line.grossWeight);
    // remainingAfter = remaining − sold, clamped at 0. Computed once at
    // render; the value never changes for the lifetime of the line because
    // grossWeight is locked in after add.
    const remainingAfter =
      Number.isFinite(remainingNum) && Number.isFinite(grossNum)
        ? Math.max(0, remainingNum - grossNum)
        : remainingNum;

    return (
      <li
        ref={ref}
        data-line-index={index}
        tabIndex={-1}
        className="flex flex-col gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition-colors target:bg-emerald-50 dark:border-zinc-800 dark:bg-zinc-900 dark:target:bg-emerald-950 sm:flex-row sm:items-center sm:gap-3"
      >
        {/* Snapshot — single line on desktop, wraps gracefully on mobile */}
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {line.lotNo || `Lot ${index + 1}`}
          </span>
          {line.rubberType ? (
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {rubberTypeLabel(line.rubberType) ?? line.rubberType}
            </span>
          ) : null}
          <span className="text-xs text-zinc-700 dark:text-zinc-300">
            ·{" "}
            <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
              {t.misc.soldShortFormat(
                formatNumber(line.grossWeight, 2),
                t.units.kg,
              )}
            </span>
          </span>
          <span className="text-xs text-zinc-600 dark:text-zinc-400">
            ·{" "}
            <span className="tabular-nums">
              {t.misc.remainingFromTotalFormat(
                formatNumber(remainingAfter, 2),
                formatNumber(line.remainingWeight, 2),
                t.units.kg,
              )}
            </span>
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            ·{" "}
            <span className="tabular-nums">
              {t.misc.costShortFormat(formatNumber(line.effectiveCostPerKg, 2))}
            </span>
          </span>
        </div>

        <button
          type="button"
          className={removeBtnClass}
          onClick={onRemove}
          disabled={disabled}
          title={t.actions.removeLine}
        >
          {t.actions.removeLine}
        </button>

        {/* Server validation error from previous submit (if any). */}
        {error ? (
          <p className="basis-full text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}
      </li>
    );
  },
);
