"use client";

import { useActionState, useMemo, useState } from "react";

import { adjustStockAction } from "@/modules/stock/actions";
import type { AdjustStockActionState } from "@/modules/stock/action-state";
import { stockT } from "@/modules/stock/i18n";
import { STOCK_ADJUSTMENT_REASONS } from "@/modules/stock/types";
import { Card, CardContent, Input, Label } from "@/shared/ui";

const t = stockT();

type Props = {
  stockLotId: string;
  remainingWeight: string;
  costAmount: string;
  effectiveCostPerKg: string;
  isDepleted: boolean;
};

const initialState: AdjustStockActionState = {};

const submitClass =
  "inline-flex h-12 w-full shrink-0 items-center justify-center whitespace-nowrap rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:disabled:bg-zinc-700";

const radioCardClass =
  "flex h-12 cursor-pointer items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors";

const inactiveCardClass =
  "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

const activeInClass =
  "border-emerald-600 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-300";

const activeOutClass =
  "border-amber-600 bg-amber-50 text-amber-800 dark:border-amber-500 dark:bg-amber-500/10 dark:text-amber-300";

const errorTextClass = "text-xs text-red-600 dark:text-red-400";

function formatNumber(s: string, fractionDigits = 2): string {
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

function parseSafe(s: string | undefined): number {
  if (!s) return NaN;
  const n = Number(s.trim());
  return Number.isFinite(n) ? n : NaN;
}

export function AdjustmentForm({
  stockLotId,
  remainingWeight,
  costAmount,
  effectiveCostPerKg,
  isDepleted,
}: Props) {
  const [state, formAction, isPending] = useActionState(
    adjustStockAction,
    initialState,
  );

  // Local state mirrors the form so we can render a live preview without
  // round-tripping. The Server Action remains the source of truth — preview
  // is informational only.
  const [direction, setDirection] = useState<"ADJUST_IN" | "ADJUST_OUT">(
    state.values?.adjustmentType ?? "ADJUST_OUT",
  );
  const [quantity, setQuantity] = useState<string>(
    state.values?.quantity ?? "",
  );

  const remainingNum = parseSafe(remainingWeight);
  const costNum = parseSafe(costAmount);
  const qtyNum = parseSafe(quantity);
  const validQty = Number.isFinite(qtyNum) && qtyNum > 0;

  const preview = useMemo(() => {
    if (!validQty || !Number.isFinite(remainingNum)) return null;
    const after =
      direction === "ADJUST_IN" ? remainingNum + qtyNum : remainingNum - qtyNum;
    const insufficient = direction === "ADJUST_OUT" && after < 0;
    const newRate =
      after > 0 && Number.isFinite(costNum)
        ? costNum / after
        : Number(effectiveCostPerKg);
    return {
      after,
      insufficient,
      newRate,
      depletedAfter: after <= 0,
    };
  }, [
    direction,
    qtyNum,
    remainingNum,
    costNum,
    effectiveCostPerKg,
    validQty,
  ]);

  // Confirm dialog before submit. Native confirm() works without extra deps
  // and stays accessible (keyboard-focusable, OS-default styling).
  function onSubmitCapture(e: React.FormEvent<HTMLFormElement>): void {
    if (!validQty) return;
    const qtyDisplay = formatNumber(String(qtyNum), 2);
    const ok = window.confirm(
      t.actions.confirmAdjustPrompt(direction, qtyDisplay),
    );
    if (!ok) e.preventDefault();
  }

  const remainingDisplay = formatNumber(remainingWeight, 2);
  const afterDisplay = preview ? formatNumber(String(preview.after), 2) : "—";
  const newRateDisplay = preview
    ? formatNumber(String(preview.newRate), 2)
    : formatNumber(effectiveCostPerKg, 2);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          {t.page.adjustSectionTitle}
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {t.hints.waterLossExplain}
        </p>

        <form
          action={formAction}
          onSubmit={onSubmitCapture}
          className="flex flex-col gap-4"
        >
          <input type="hidden" name="stockLotId" value={stockLotId} />

          {/* Direction radios — large tap targets */}
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {t.fields.adjustmentDirection}
            </legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label
                className={`${radioCardClass} ${
                  direction === "ADJUST_IN" ? activeInClass : inactiveCardClass
                }`}
              >
                <input
                  type="radio"
                  name="adjustmentType"
                  value="ADJUST_IN"
                  checked={direction === "ADJUST_IN"}
                  onChange={() => setDirection("ADJUST_IN")}
                  className="sr-only"
                />
                {t.adjustment.directionIn}
              </label>
              <label
                className={`${radioCardClass} ${
                  direction === "ADJUST_OUT"
                    ? activeOutClass
                    : inactiveCardClass
                }`}
              >
                <input
                  type="radio"
                  name="adjustmentType"
                  value="ADJUST_OUT"
                  checked={direction === "ADJUST_OUT"}
                  onChange={() => setDirection("ADJUST_OUT")}
                  className="sr-only"
                />
                {t.adjustment.directionOut}
              </label>
            </div>
            {state.fieldErrors?.adjustmentType ? (
              <p className={errorTextClass}>
                {state.fieldErrors.adjustmentType}
              </p>
            ) : null}
          </fieldset>

          {/* Quantity */}
          <div className="flex flex-col gap-1">
            <Label htmlFor="quantity">{t.fields.quantity}</Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              autoComplete="off"
              required
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t.hints.weightDecimals}
            </p>
            {state.fieldErrors?.quantity ? (
              <p className={errorTextClass}>{state.fieldErrors.quantity}</p>
            ) : null}
          </div>

          {/* Reason */}
          <div className="flex flex-col gap-1">
            <Label htmlFor="reasonType">{t.fields.reasonType}</Label>
            <select
              id="reasonType"
              name="reasonType"
              defaultValue={state.values?.reasonType ?? ""}
              className="h-10 rounded-lg border border-zinc-300 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              required
            >
              <option value="">{t.placeholders.selectReason}</option>
              {STOCK_ADJUSTMENT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {t.reason[r]}
                </option>
              ))}
            </select>
            {state.fieldErrors?.reasonType ? (
              <p className={errorTextClass}>{state.fieldErrors.reasonType}</p>
            ) : null}
          </div>

          {/* Note */}
          <div className="flex flex-col gap-1">
            <Label htmlFor="note">{t.fields.note}</Label>
            <textarea
              id="note"
              name="note"
              defaultValue={state.values?.note ?? ""}
              placeholder={t.placeholders.note}
              rows={3}
              required
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t.hints.adjustmentNoteRequired}
            </p>
            {state.fieldErrors?.note ? (
              <p className={errorTextClass}>{state.fieldErrors.note}</p>
            ) : null}
          </div>

          {/* Live preview */}
          <div className="flex flex-col gap-1 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900/50">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Preview
            </p>
            <dl className="flex flex-col gap-1 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-600 dark:text-zinc-400">
                  {t.adjustment.previewBefore}
                </dt>
                <dd className="whitespace-nowrap tabular-nums text-zinc-900 dark:text-zinc-50">
                  {remainingDisplay} {t.units.kg}
                </dd>
              </div>
              <div className="flex justify-between gap-3 font-semibold">
                <dt className="text-zinc-600 dark:text-zinc-400">
                  {t.adjustment.previewAfter}
                </dt>
                <dd
                  className={`whitespace-nowrap tabular-nums ${
                    preview?.insufficient
                      ? "text-red-600 dark:text-red-400"
                      : "text-zinc-900 dark:text-zinc-50"
                  }`}
                >
                  {afterDisplay} {t.units.kg}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-600 dark:text-zinc-400">
                  {t.adjustment.previewCostPerKg}
                </dt>
                <dd className="whitespace-nowrap tabular-nums text-zinc-900 dark:text-zinc-50">
                  {newRateDisplay} {t.units.bahtPerKg}
                </dd>
              </div>
            </dl>
            {preview?.insufficient ? (
              <p className="text-xs text-red-600 dark:text-red-400">
                {t.adjustment.previewWarningInsufficient}
              </p>
            ) : null}
          </div>

          {state.error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {state.error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={
              isPending ||
              (isDepleted && direction === "ADJUST_OUT") ||
              !validQty ||
              !!preview?.insufficient
            }
            className={submitClass}
          >
            {isPending ? "…" : t.actions.submitAdjust}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
