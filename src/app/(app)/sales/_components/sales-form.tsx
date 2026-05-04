"use client";

import {
  useActionState,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";

import type { ReceivingEntityDTO } from "@/modules/receivingAccount/dto";
import { createSalesAction } from "@/modules/sales/actions";
import {
  EMPTY_SALES_STATE,
  type SalesActionState,
  type SalesLineFormValue,
} from "@/modules/sales/action-state";
import type { EligibleLotForSaleDTO } from "@/modules/sales/dto";
import { salesT } from "@/modules/sales/i18n";
import { SALE_TYPES } from "@/modules/sales/types";
import { Card, CardContent, Input, Label } from "@/shared/ui";

import { ReceivingAccountPicker } from "./receiving-account-picker";
import { SalesLineRow } from "./sales-line-row";
import { SalesLotPicker } from "./sales-lot-picker";

const t = salesT();

const submitClass =
  "inline-flex h-12 w-full shrink-0 items-center justify-center whitespace-nowrap rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:disabled:bg-zinc-700 sm:w-auto";

const errorTextClass = "text-xs text-red-600 dark:text-red-400";

const inputClass =
  "h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

type Props = {
  branches: ReadonlyArray<{ id: string; code: string; name: string }>;
  defaultBranchId: string;
  showBranchSelect: boolean;
  receivingEntities: ReadonlyArray<ReceivingEntityDTO>;
};

function formatNumber(s: string | number, fractionDigits = 2): string {
  const n = typeof s === "number" ? s : Number(s);
  if (!Number.isFinite(n)) return String(s);
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

// Brief visual cue when a row is added or revisited via "อยู่ในบิลแล้ว".
// Pure CSS class toggle so we don't pull in any animation library.
function flashRow(el: HTMLElement): void {
  el.classList.add("ring-2", "ring-emerald-500", "ring-offset-2");
  window.setTimeout(() => {
    el.classList.remove("ring-2", "ring-emerald-500", "ring-offset-2");
  }, 800);
}

function lotToLine(
  lot: EligibleLotForSaleDTO,
  grossWeight: string,
): SalesLineFormValue {
  return {
    stockLotId: lot.id,
    lotNo: lot.lotNo,
    rubberType: lot.rubberType,
    effectiveCostPerKg: lot.effectiveCostPerKg,
    remainingWeight: lot.remainingWeight,
    grossWeight,
  };
}

export function SalesForm({
  branches,
  defaultBranchId,
  showBranchSelect,
  receivingEntities,
}: Props) {
  const [state, formAction, isPending] = useActionState<
    SalesActionState,
    FormData
  >(createSalesAction, EMPTY_SALES_STATE);

  const v = state.values;

  const [branchId, setBranchId] = useState<string>(
    v?.branchId ?? defaultBranchId,
  );
  const [buyerName, setBuyerName] = useState<string>(v?.buyerName ?? "");
  const [saleType, setSaleType] = useState<string>(v?.saleType ?? "SALE");
  const [drcPercent, setDrcPercent] = useState<string>(v?.drcPercent ?? "");
  const [pricePerKg, setPricePerKg] = useState<string>(v?.pricePerKg ?? "");
  const [withholdingTaxPercent, setWithholdingTaxPercent] = useState<string>(
    v?.withholdingTaxPercent ?? "0",
  );
  const [lines, setLines] = useState<SalesLineFormValue[]>(v?.lines ?? []);

  // Client-side mirror of the server's `requiredText` rule: trim the user
  // input before deciding whether the bill can be submitted. Server still
  // re-validates — this is purely to keep the submit button honest and
  // avoid round-tripping an obvious empty value.
  const buyerNameEmpty = buyerName.trim().length === 0;

  // Refs to the rendered <li> for each line so the picker's "อยู่ในบิลแล้ว"
  // affordance can scroll the operator straight to the relevant row (and
  // briefly highlight it via the CSS `:target` pseudo-class on hash nav).
  const lineRefs = useRef<Map<string, HTMLLIElement | null>>(new Map());

  const setLineRef = useCallback(
    (stockLotId: string) => (el: HTMLLIElement | null) => {
      if (el) lineRefs.current.set(stockLotId, el);
      else lineRefs.current.delete(stockLotId);
    },
    [],
  );

  // Map<stockLotId, grossWeight> — the picker uses this to (a) tag rows as
  // "อยู่ในบิลแล้ว" and (b) compute the persistent post-sale remaining
  // figure for those rows. Keeping the value as the raw user-typed string
  // avoids re-stringifying on render and matches what the bill stores.
  const selectedLines = useMemo(
    () => new Map(lines.map((l) => [l.stockLotId, l.grossWeight])),
    [lines],
  );

  // Add a lot to the bill using the gross-weight string the picker has
  // already validated (positive, ≤ remainingWeight). The grossWeight is
  // locked in from this point — operators must remove and re-add to change.
  const handleAdd = useCallback(
    (lot: EligibleLotForSaleDTO, grossWeight: string) => {
      setLines((prev) => {
        if (prev.some((l) => l.stockLotId === lot.id)) return prev;
        return [...prev, lotToLine(lot, grossWeight)];
      });
      // Scroll + flash the freshly-added row on the next tick so the
      // operator sees the bill update.
      window.setTimeout(() => {
        const el = lineRefs.current.get(lot.id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          flashRow(el);
        }
      }, 0);
    },
    [],
  );

  const handleRequestFocus = useCallback((stockLotId: string) => {
    const el = lineRefs.current.get(stockLotId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      flashRow(el);
    }
  }, []);

  const handleRemove = useCallback((index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ── Live aggregate preview ──────────────────────────────────────────────
  const drcNum = parseSafe(drcPercent);
  const priceNum = parseSafe(pricePerKg);
  const taxNum = parseSafe(withholdingTaxPercent);

  const grossTotal = useMemo(
    () =>
      lines.reduce((acc, l) => {
        const n = parseSafe(l.grossWeight);
        return Number.isFinite(n) && n > 0 ? acc + n : acc;
      }, 0),
    [lines],
  );

  const costTotal = useMemo(
    () =>
      lines.reduce((acc, l) => {
        const g = parseSafe(l.grossWeight);
        const c = parseSafe(l.effectiveCostPerKg);
        if (Number.isFinite(g) && g > 0 && Number.isFinite(c)) {
          return acc + round(g * c, 2);
        }
        return acc;
      }, 0),
    [lines],
  );

  const anyExceeds = useMemo(
    () =>
      lines.some((l) => {
        const g = parseSafe(l.grossWeight);
        const r = parseSafe(l.remainingWeight);
        return Number.isFinite(g) && Number.isFinite(r) && g > r;
      }),
    [lines],
  );

  const anyEmpty = useMemo(
    () =>
      lines.some((l) => {
        const g = parseSafe(l.grossWeight);
        return !(Number.isFinite(g) && g > 0);
      }),
    [lines],
  );

  // Partial preview: any field whose required inputs are missing stays null
  // so the UI renders "—" for it instead of a misleading 0.00. As soon as a
  // line is present, `grossWeightTotal` and `costAmount` become non-null —
  // the operator wants to see those running totals before they finish typing
  // DRC / price / tax. Each downstream field (DRC weight, gross amount,
  // withholding, net, profit) lights up only when its inputs are valid.
  const preview = useMemo(() => {
    if (lines.length === 0 || grossTotal <= 0) return null;

    const hasDrc = Number.isFinite(drcNum);
    const hasPrice = Number.isFinite(priceNum);

    const drcWeight = hasDrc ? round((grossTotal * drcNum) / 100, 2) : null;
    const grossAmount =
      drcWeight !== null && hasPrice ? round(drcWeight * priceNum, 2) : null;
    const safeTax = Number.isFinite(taxNum) ? taxNum : 0;
    const withholdingTaxAmount =
      grossAmount !== null ? round((grossAmount * safeTax) / 100, 2) : null;
    const netReceivable =
      grossAmount !== null && withholdingTaxAmount !== null
        ? round(grossAmount - withholdingTaxAmount, 2)
        : null;
    const costAmount = costTotal > 0 ? round(costTotal, 2) : null;
    const profit =
      grossAmount !== null && costAmount !== null
        ? round(grossAmount - costAmount, 2)
        : null;

    return {
      grossWeightTotal: grossTotal,
      drcWeight,
      grossAmount,
      withholdingTaxAmount,
      netReceivable,
      costAmount,
      profit,
    };
  }, [lines.length, drcNum, priceNum, taxNum, grossTotal, costTotal]);

  const linesJson = useMemo(() => JSON.stringify(lines), [lines]);

  const submitDisabled =
    isPending ||
    buyerNameEmpty ||
    lines.length === 0 ||
    anyExceeds ||
    anyEmpty;

  return (
    <form action={formAction} className="contents">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Left: lot picker (full width on mobile, 1 col on xl) */}
        <div className="order-2 xl:order-1">
          <SalesLotPicker
            branchId={branchId || undefined}
            selectedLines={selectedLines}
            onAdd={handleAdd}
            onRequestFocus={handleRequestFocus}
          />
        </div>

        {/* Right: header + lines + preview (2 cols on xl) */}
        <div className="order-1 flex flex-col gap-4 xl:order-2 xl:col-span-2">
          <Card>
            <CardContent className="flex flex-col gap-4">
              {showBranchSelect ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="branchId">{t.fields.branch}</Label>
                  <select
                    id="branchId"
                    name="branchId"
                    value={branchId}
                    onChange={(e) => {
                      setBranchId(e.target.value);
                      setLines([]); // wipe lines on branch switch (cross-branch lots are invalid)
                    }}
                    className={inputClass}
                    required
                  >
                    <option value="">{t.placeholders.selectBranch}</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} — {b.name}
                      </option>
                    ))}
                  </select>
                  {state.fieldErrors?.branchId ? (
                    <p className={errorTextClass}>
                      {state.fieldErrors.branchId}
                    </p>
                  ) : null}
                </div>
              ) : (
                <input type="hidden" name="branchId" value={branchId} />
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="buyerName">
                  {t.fields.buyerName}
                  <span className="text-red-600"> *</span>
                </Label>
                <Input
                  id="buyerName"
                  name="buyerName"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder={t.placeholders.buyerName}
                  maxLength={200}
                  required
                  aria-invalid={
                    state.fieldErrors?.buyerName || buyerNameEmpty
                      ? true
                      : undefined
                  }
                />
                {state.fieldErrors?.buyerName ? (
                  <p className={errorTextClass}>
                    {state.fieldErrors.buyerName}
                  </p>
                ) : buyerNameEmpty ? (
                  <p className={errorTextClass}>
                    {t.errors.buyerNameRequired}
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="saleType">{t.fields.saleType}</Label>
                  <select
                    id="saleType"
                    name="saleType"
                    value={saleType}
                    onChange={(e) => setSaleType(e.target.value)}
                    className={inputClass}
                    required
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
                    required
                  />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {t.hints.drcDoesNotDriveStock}
                  </p>
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
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={pricePerKg}
                    onChange={(e) => setPricePerKg(e.target.value)}
                    required
                  />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {t.hints.priceDecimals}
                  </p>
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
                    defaultValue={v?.expectedReceiveDate ?? ""}
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
                    defaultValue={v?.note ?? ""}
                    placeholder={t.placeholders.note}
                  />
                  {state.fieldErrors?.note ? (
                    <p className={errorTextClass}>{state.fieldErrors.note}</p>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Receiving / company-payment section */}
          <Card>
            <CardContent>
              <ReceivingAccountPicker
                entities={receivingEntities}
                branchId={branchId}
                initialEntityId={v?.receivingEntityId}
                initialBankAccountId={v?.receivingBankAccountId}
                entityFieldError={state.fieldErrors?.receivingEntityId}
                bankAccountFieldError={state.fieldErrors?.receivingBankAccountId}
              />
            </CardContent>
          </Card>

          {/* Lines section */}
          <Card>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  {t.page.cartTitle}
                </h2>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {t.preview.linesCount(lines.length)}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {t.hints.addLotDefaultsToRemaining} ·{" "}
                {t.hints.canSellPartialLot}
              </p>

              {/* Hidden field: full lines payload as JSON. */}
              <input type="hidden" name="linesJson" value={linesJson} />

              {lines.length === 0 ? (
                <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                  {t.page.cartEmpty}
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {lines.map((line, idx) => (
                    <SalesLineRow
                      key={line.stockLotId}
                      ref={setLineRef(line.stockLotId)}
                      index={idx}
                      line={line}
                      error={state.lineErrors?.[idx]}
                      onRemove={() => handleRemove(idx)}
                    />
                  ))}
                </ul>
              )}

              {state.fieldErrors?.lines ? (
                <p className={errorTextClass}>{state.fieldErrors.lines}</p>
              ) : null}
            </CardContent>
          </Card>

          {/* Preview + submit */}
          <Card>
            <CardContent className="flex flex-col gap-3">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {t.preview.title}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {t.misc.detailComputedHint}
              </p>
              <dl className="flex flex-col gap-1.5 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-zinc-500 dark:text-zinc-400">
                    {t.preview.grossWeightTotal}
                  </dt>
                  <dd className="whitespace-nowrap text-right tabular-nums text-zinc-900 dark:text-zinc-50">
                    {preview
                      ? `${formatNumber(preview.grossWeightTotal, 2)} ${t.units.kg}`
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-zinc-500 dark:text-zinc-400">
                    {t.preview.drcWeightTotal}
                  </dt>
                  <dd className="whitespace-nowrap text-right tabular-nums text-zinc-900 dark:text-zinc-50">
                    {preview && preview.drcWeight !== null
                      ? `${formatNumber(preview.drcWeight, 2)} ${t.units.kg}`
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 font-semibold">
                  <dt className="text-zinc-700 dark:text-zinc-300">
                    {t.preview.grossAmount}
                  </dt>
                  <dd className="whitespace-nowrap text-right tabular-nums text-zinc-900 dark:text-zinc-50">
                    {preview && preview.grossAmount !== null
                      ? `${formatNumber(preview.grossAmount, 2)} ${t.units.baht}`
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-zinc-500 dark:text-zinc-400">
                    {t.preview.withholdingTaxAmount}
                  </dt>
                  <dd className="whitespace-nowrap text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                    {preview && preview.withholdingTaxAmount !== null
                      ? `− ${formatNumber(preview.withholdingTaxAmount, 2)} ${t.units.baht}`
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 border-t border-zinc-200 pt-2 font-semibold dark:border-zinc-800">
                  <dt className="text-zinc-700 dark:text-zinc-300">
                    {t.preview.netReceivableAmount}
                  </dt>
                  <dd className="whitespace-nowrap text-right tabular-nums text-emerald-700 dark:text-emerald-300">
                    {preview && preview.netReceivable !== null
                      ? `${formatNumber(preview.netReceivable, 2)} ${t.units.baht}`
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 pt-2">
                  <dt className="text-zinc-500 dark:text-zinc-400">
                    {t.preview.costAmount}
                  </dt>
                  <dd className="whitespace-nowrap text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                    {preview && preview.costAmount !== null
                      ? `${formatNumber(preview.costAmount, 2)} ${t.units.baht}`
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 font-semibold">
                  <dt className="text-zinc-700 dark:text-zinc-300">
                    {t.preview.profitAmount}
                  </dt>
                  <dd className="whitespace-nowrap text-right tabular-nums text-zinc-900 dark:text-zinc-50">
                    {preview && preview.profit !== null
                      ? `${formatNumber(preview.profit, 2)} ${t.units.baht}`
                      : "—"}
                  </dd>
                </div>
              </dl>

              {anyExceeds ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
                  {t.preview.warningInsufficient}
                </p>
              ) : null}

              {state.error ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                  {state.error}
                </p>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="submit"
                  disabled={submitDisabled}
                  className={submitClass}
                >
                  {isPending ? t.actions.saving : t.actions.submitCreate}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
