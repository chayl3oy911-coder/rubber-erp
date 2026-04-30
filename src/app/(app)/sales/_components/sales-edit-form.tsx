"use client";

import { useActionState, useMemo, useState } from "react";

import { updateSalesAction } from "@/modules/sales/actions";
import {
  EMPTY_SALES_STATE,
  type SalesActionState,
} from "@/modules/sales/action-state";
import type { SalesOrderDTO } from "@/modules/sales/dto";
import { salesT } from "@/modules/sales/i18n";
import { SALE_TYPES } from "@/modules/sales/types";
import { Card, CardContent, Input, Label } from "@/shared/ui";

const t = salesT();

const submitClass =
  "inline-flex h-12 w-full shrink-0 items-center justify-center whitespace-nowrap rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:disabled:bg-zinc-700 sm:w-auto";

const errorTextClass = "text-xs text-red-600 dark:text-red-400";

const inputClass =
  "h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

type Props = {
  sale: SalesOrderDTO;
};

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
  const n = Number(String(s).trim());
  return Number.isFinite(n) ? n : NaN;
}

function round(n: number, dp: number): number {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}

/**
 * Edit form. Field editability follows the service's matrix:
 *   - DRAFT     → all fields
 *   - CONFIRMED → only `note`
 *   - CANCELLED → nothing (page should not even render this form)
 */
export function SalesEditForm({ sale }: Props) {
  const action = updateSalesAction.bind(null, sale.id);
  const [state, formAction, isPending] = useActionState<
    SalesActionState,
    FormData
  >(action, EMPTY_SALES_STATE);

  const isDraft = sale.status === "DRAFT";
  const isConfirmed = sale.status === "CONFIRMED";

  const v = state.values;

  const [buyerName, setBuyerName] = useState<string>(
    v?.buyerName ?? sale.buyerName,
  );
  const [saleType, setSaleType] = useState<string>(
    v?.saleType ?? sale.saleType,
  );
  const [grossWeight, setGrossWeight] = useState<string>(
    v?.grossWeight ?? sale.grossWeight,
  );
  const [drcPercent, setDrcPercent] = useState<string>(
    v?.drcPercent ?? sale.drcPercent,
  );
  const [pricePerKg, setPricePerKg] = useState<string>(
    v?.pricePerKg ?? sale.pricePerKg,
  );
  const [withholdingTaxPercent, setWithholdingTaxPercent] = useState<string>(
    v?.withholdingTaxPercent ?? sale.withholdingTaxPercent,
  );

  const grossNum = parseSafe(grossWeight);
  const drcNum = parseSafe(drcPercent);
  const priceNum = parseSafe(pricePerKg);
  const taxNum = parseSafe(withholdingTaxPercent);

  const remaining = sale.sourceLot ? Number(sale.sourceLot.remainingWeight) : NaN;
  // For DRAFT: the lot might have shrunk via adjustments; "available for me"
  // = current remaining + my own gross (since I haven't cut yet, it is still
  // counted as "remaining"). Since my draft has not deducted anything, the
  // available is just the lot's remaining today.
  const insufficient =
    isDraft &&
    Number.isFinite(grossNum) &&
    Number.isFinite(remaining) &&
    grossNum > remaining;

  const preview = useMemo(() => {
    if (
      !Number.isFinite(grossNum) ||
      !Number.isFinite(drcNum) ||
      !Number.isFinite(priceNum) ||
      grossNum <= 0
    ) {
      return null;
    }
    const drcWeight = round((grossNum * drcNum) / 100, 2);
    const grossAmount = round(drcWeight * priceNum, 2);
    const safeTax = Number.isFinite(taxNum) ? taxNum : 0;
    const withholdingTaxAmount = round((grossAmount * safeTax) / 100, 2);
    const netReceivable = round(grossAmount - withholdingTaxAmount, 2);
    const costPerKg = sale.sourceLot
      ? Number(sale.sourceLot.effectiveCostPerKg)
      : NaN;
    const costAmount = Number.isFinite(costPerKg)
      ? round(grossNum * costPerKg, 2)
      : 0;
    const profit = round(grossAmount - costAmount, 2);
    return {
      drcWeight,
      grossAmount,
      withholdingTaxAmount,
      netReceivable,
      costPerKg,
      costAmount,
      profit,
    };
  }, [grossNum, drcNum, priceNum, taxNum, sale.sourceLot]);

  return (
    <form action={formAction} className="contents">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="buyerName">{t.fields.buyerName}</Label>
              <Input
                id="buyerName"
                name="buyerName"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                disabled={!isDraft}
                placeholder={t.placeholders.buyerName}
              />
              {state.fieldErrors?.buyerName ? (
                <p className={errorTextClass}>
                  {state.fieldErrors.buyerName}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="saleType">{t.fields.saleType}</Label>
              <select
                id="saleType"
                name="saleType"
                value={saleType}
                onChange={(e) => setSaleType(e.target.value)}
                disabled={!isDraft}
                className={inputClass}
              >
                {SALE_TYPES.map((st) => (
                  <option key={st} value={st}>
                    {t.saleType[st] ?? st}
                  </option>
                ))}
              </select>
              {state.fieldErrors?.saleType ? (
                <p className={errorTextClass}>
                  {state.fieldErrors.saleType}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="grossWeight">
                  {t.fields.grossWeight} ({t.units.kg})
                </Label>
                <Input
                  id="grossWeight"
                  name="grossWeight"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  value={grossWeight}
                  onChange={(e) => setGrossWeight(e.target.value)}
                  disabled={!isDraft}
                />
                {state.fieldErrors?.grossWeight ? (
                  <p className={errorTextClass}>
                    {state.fieldErrors.grossWeight}
                  </p>
                ) : null}
                {insufficient ? (
                  <p className={errorTextClass}>
                    {t.preview.warningInsufficient}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="drcPercent">
                  {t.fields.drcPercent} ({t.units.percent})
                </Label>
                <Input
                  id="drcPercent"
                  name="drcPercent"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  inputMode="decimal"
                  value={drcPercent}
                  onChange={(e) => setDrcPercent(e.target.value)}
                  disabled={!isDraft}
                />
                {state.fieldErrors?.drcPercent ? (
                  <p className={errorTextClass}>
                    {state.fieldErrors.drcPercent}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pricePerKg">
                  {t.fields.pricePerKg} ({t.units.bahtPerKg})
                </Label>
                <Input
                  id="pricePerKg"
                  name="pricePerKg"
                  type="number"
                  step="0.0001"
                  min="0"
                  inputMode="decimal"
                  value={pricePerKg}
                  onChange={(e) => setPricePerKg(e.target.value)}
                  disabled={!isDraft}
                />
                {state.fieldErrors?.pricePerKg ? (
                  <p className={errorTextClass}>
                    {state.fieldErrors.pricePerKg}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="withholdingTaxPercent">
                  {t.fields.withholdingTaxPercent} ({t.units.percent})
                </Label>
                <Input
                  id="withholdingTaxPercent"
                  name="withholdingTaxPercent"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  inputMode="decimal"
                  value={withholdingTaxPercent}
                  onChange={(e) => setWithholdingTaxPercent(e.target.value)}
                  disabled={!isDraft}
                />
                {state.fieldErrors?.withholdingTaxPercent ? (
                  <p className={errorTextClass}>
                    {state.fieldErrors.withholdingTaxPercent}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="expectedReceiveDate">
                  {t.fields.expectedReceiveDate}
                </Label>
                <Input
                  id="expectedReceiveDate"
                  name="expectedReceiveDate"
                  type="date"
                  defaultValue={
                    v?.expectedReceiveDate ??
                    (sale.expectedReceiveDate
                      ? sale.expectedReceiveDate.slice(0, 10)
                      : "")
                  }
                  disabled={!isDraft}
                />
                {state.fieldErrors?.expectedReceiveDate ? (
                  <p className={errorTextClass}>
                    {state.fieldErrors.expectedReceiveDate}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="note">{t.fields.note}</Label>
                <Input
                  id="note"
                  name="note"
                  defaultValue={v?.note ?? sale.note ?? ""}
                  placeholder={t.placeholders.note}
                />
                {state.fieldErrors?.note ? (
                  <p className={errorTextClass}>{state.fieldErrors.note}</p>
                ) : null}
              </div>
            </div>

            {state.error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                {state.error}
              </p>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="submit"
                disabled={isPending || (isDraft && insufficient)}
                className={submitClass}
              >
                {isPending ? t.actions.saving : t.actions.saveDraft}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Live preview, only meaningful for DRAFT */}
        <Card>
          <CardContent className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {t.preview.title}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {isConfirmed
                ? t.misc.detailComputedHint
                : t.misc.detailComputedHint}
            </p>
            <dl className="flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-500 dark:text-zinc-400">
                  {t.preview.drcWeight}
                </dt>
                <dd className="whitespace-nowrap text-right tabular-nums text-zinc-900 dark:text-zinc-50">
                  {preview
                    ? `${formatNumber(String(preview.drcWeight), 2)} ${t.units.kg}`
                    : `${formatNumber(sale.drcWeight, 2)} ${t.units.kg}`}
                </dd>
              </div>
              <div className="flex justify-between gap-3 font-semibold">
                <dt className="text-zinc-700 dark:text-zinc-300">
                  {t.preview.grossAmount}
                </dt>
                <dd className="whitespace-nowrap text-right tabular-nums text-zinc-900 dark:text-zinc-50">
                  {preview
                    ? `${formatNumber(String(preview.grossAmount), 2)} ${t.units.baht}`
                    : `${formatNumber(sale.grossAmount, 2)} ${t.units.baht}`}
                </dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-zinc-200 pt-2 font-semibold dark:border-zinc-800">
                <dt className="text-zinc-700 dark:text-zinc-300">
                  {t.preview.netReceivableAmount}
                </dt>
                <dd className="whitespace-nowrap text-right tabular-nums text-emerald-700 dark:text-emerald-300">
                  {preview
                    ? `${formatNumber(String(preview.netReceivable), 2)} ${t.units.baht}`
                    : `${formatNumber(sale.netReceivableAmount, 2)} ${t.units.baht}`}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
