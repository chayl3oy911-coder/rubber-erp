"use client";

import {
  useActionState,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";

import type { ReceivingEntityDTO } from "@/modules/receivingAccount/dto";
import {
  replaceSalesLinesAction,
  updateSalesAction,
} from "@/modules/sales/actions";
import {
  EMPTY_SALES_STATE,
  type SalesActionState,
  type SalesLineFormValue,
} from "@/modules/sales/action-state";
import type {
  EligibleLotForSaleDTO,
  SalesOrderDTO,
} from "@/modules/sales/dto";
import { salesT } from "@/modules/sales/i18n";
import { SALE_TYPES } from "@/modules/sales/types";
import { bankLabel } from "@/shared/banks";
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

// Brief visual cue to draw the operator's eye to a row (newly added or
// re-visited via "อยู่ในบิลแล้ว"). Pure CSS class toggle.
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

type Props = {
  sale: SalesOrderDTO;
  /**
   * Optional pre-fetched receiving entities for the DRAFT picker. When
   * absent, the receiving section becomes a read-only snapshot — useful
   * for CONFIRMED sales (where the picker is locked anyway).
   */
  receivingEntities?: ReadonlyArray<ReceivingEntityDTO>;
};

/**
 * Edit form. Field editability follows the service's matrix:
 *   - DRAFT     → header fields + lines (replace-all)
 *   - CONFIRMED → only `note`
 *   - CANCELLED → page should not render this form
 *
 * Header & lines are saved through SEPARATE Server Actions:
 *   - `updateSalesAction` (header)
 *   - `replaceSalesLinesAction` (DRAFT-only, replaces all lines)
 *
 * This matches the API contract: PATCH /api/sales/[id] for header,
 * PUT /api/sales/[id]/lines for lines. Each form is its own submit.
 */
export function SalesEditForm({ sale, receivingEntities }: Props) {
  const isDraft = sale.status === "DRAFT";
  const isConfirmed = sale.status === "CONFIRMED";

  return (
    <div className="flex flex-col gap-4">
      <HeaderEditForm sale={sale} receivingEntities={receivingEntities} />
      {isDraft ? <LinesEditForm sale={sale} /> : null}
      {isConfirmed ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          {t.errors.linesLocked}
        </p>
      ) : null}
    </div>
  );
}

// ─── Header form (always visible while not CANCELLED) ────────────────────────

function HeaderEditForm({
  sale,
  receivingEntities,
}: {
  sale: SalesOrderDTO;
  receivingEntities?: ReadonlyArray<ReceivingEntityDTO>;
}) {
  const action = updateSalesAction.bind(null, sale.id);
  const [state, formAction, isPending] = useActionState<
    SalesActionState,
    FormData
  >(action, EMPTY_SALES_STATE);

  const isDraft = sale.status === "DRAFT";

  const v = state.values;

  const [buyerName, setBuyerName] = useState<string>(
    v?.buyerName ?? sale.buyerName,
  );
  const [saleType, setSaleType] = useState<string>(
    v?.saleType ?? sale.saleType,
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

  return (
    <form action={formAction}>
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {t.fields.salesNo}: {sale.salesNo}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {sale.branch
                ? `${sale.branch.code} — ${sale.branch.name}`
                : sale.branchId}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="buyerName">
              {t.fields.buyerName}
              {isDraft ? <span className="text-red-600"> *</span> : null}
            </Label>
            <Input
              id="buyerName"
              name="buyerName"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              placeholder={t.placeholders.buyerName}
              maxLength={200}
              disabled={!isDraft}
              required
              aria-invalid={
                state.fieldErrors?.buyerName ||
                (isDraft && buyerName.trim().length === 0)
                  ? true
                  : undefined
              }
            />
            {state.fieldErrors?.buyerName ? (
              <p className={errorTextClass}>{state.fieldErrors.buyerName}</p>
            ) : isDraft && buyerName.trim().length === 0 ? (
              <p className={errorTextClass}>{t.errors.buyerNameRequired}</p>
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
                disabled={!isDraft}
                required
              >
                {SALE_TYPES.map((st) => (
                  <option key={st} value={st}>
                    {t.saleType[st] ?? st}
                  </option>
                ))}
              </select>
              {state.fieldErrors?.saleType ? (
                <p className={errorTextClass}>{state.fieldErrors.saleType}</p>
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
                required
              />
              {state.fieldErrors?.drcPercent ? (
                <p className={errorTextClass}>{state.fieldErrors.drcPercent}</p>
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
                disabled={!isDraft}
                required
              />
              {state.fieldErrors?.pricePerKg ? (
                <p className={errorTextClass}>{state.fieldErrors.pricePerKg}</p>
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

          {/* Receiving section — DRAFT picker, CONFIRMED snapshot. */}
          {isDraft && receivingEntities ? (
            <ReceivingAccountPicker
              entities={receivingEntities}
              branchId={sale.branchId}
              initialEntityId={
                v?.receivingEntityId ?? sale.receivingEntityId ?? undefined
              }
              initialBankAccountId={
                v?.receivingBankAccountId ??
                sale.receivingBankAccountId ??
                undefined
              }
              entityFieldError={state.fieldErrors?.receivingEntityId}
              bankAccountFieldError={
                state.fieldErrors?.receivingBankAccountId
              }
            />
          ) : (
            <ReceivingSnapshot sale={sale} />
          )}

          {state.error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {state.error}
            </p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="submit"
              disabled={
                isPending || (isDraft && buyerName.trim().length === 0)
              }
              className={submitClass}
            >
              {isPending ? t.actions.saving : t.actions.saveDraft}
            </button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

// ─── Lines edit form (DRAFT only — replace-all semantics) ────────────────────

function LinesEditForm({ sale }: { sale: SalesOrderDTO }) {
  const action = replaceSalesLinesAction.bind(null, sale.id);
  const [state, formAction, isPending] = useActionState<
    SalesActionState,
    FormData
  >(action, EMPTY_SALES_STATE);

  // Hydrate from current sale OR echoed values (after server validation).
  const initialLines = useMemo<SalesLineFormValue[]>(() => {
    if (state.values?.lines && state.values.lines.length > 0) {
      return state.values.lines;
    }
    return sale.lines.map((l) => ({
      stockLotId: l.stockLotId,
      lotNo: l.lot?.lotNo ?? "",
      rubberType: l.rubberType,
      effectiveCostPerKg: l.lot?.effectiveCostPerKg ?? l.costPerKgSnapshot,
      // For an existing line, "remainingWeight" displayed is the lot's
      // current remaining + this line's grossWeight (because if this DRAFT
      // were confirmed, we'd give back this much). That keeps the
      // "ใช้ทั้งหมด" button useful for editing.
      remainingWeight: (() => {
        const lotRem = Number(l.lot?.remainingWeight ?? "0");
        const lineGross = Number(l.grossWeight);
        const total = (Number.isFinite(lotRem) ? lotRem : 0) +
          (Number.isFinite(lineGross) ? lineGross : 0);
        return total.toFixed(2);
      })(),
      grossWeight: l.grossWeight,
    }));
  }, [sale.lines, state.values?.lines]);

  const [lines, setLines] = useState<SalesLineFormValue[]>(initialLines);
  // Refs to the rendered <li> per line so the picker's "อยู่ในบิลแล้ว"
  // button (and the post-add scroll cue) can target the correct row.
  const lineRefs = useRef<Map<string, HTMLLIElement | null>>(new Map());

  const setLineRef = useCallback(
    (stockLotId: string) => (el: HTMLLIElement | null) => {
      if (el) lineRefs.current.set(stockLotId, el);
      else lineRefs.current.delete(stockLotId);
    },
    [],
  );

  // Map<stockLotId, grossWeight> — the picker uses this to (a) tag rows as
  // "อยู่ในบิลแล้ว" and (b) show the persistent post-sale remaining figure
  // for those rows.
  const selectedLines = useMemo(
    () => new Map(lines.map((l) => [l.stockLotId, l.grossWeight])),
    [lines],
  );

  // Add a lot using the gross-weight string the picker validated. From this
  // point grossWeight is locked — to change it the operator removes the
  // line and adds the lot again (this matches the new-form UX exactly).
  const handleAdd = useCallback(
    (lot: EligibleLotForSaleDTO, grossWeight: string) => {
      setLines((prev) => {
        if (prev.some((l) => l.stockLotId === lot.id)) return prev;
        return [...prev, lotToLine(lot, grossWeight)];
      });
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

  const grossTotal = lines.reduce((acc, l) => {
    const n = parseSafe(l.grossWeight);
    return Number.isFinite(n) && n > 0 ? acc + n : acc;
  }, 0);

  const anyExceeds = lines.some((l) => {
    const g = parseSafe(l.grossWeight);
    const r = parseSafe(l.remainingWeight);
    return Number.isFinite(g) && Number.isFinite(r) && g > r;
  });
  const anyEmpty = lines.some((l) => {
    const g = parseSafe(l.grossWeight);
    return !(Number.isFinite(g) && g > 0);
  });

  const linesJson = JSON.stringify(lines);
  const submitDisabled =
    isPending || lines.length === 0 || anyExceeds || anyEmpty;

  return (
    <form action={formAction}>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="order-2 xl:order-1">
          <SalesLotPicker
            branchId={sale.branchId}
            selectedLines={selectedLines}
            onAdd={handleAdd}
            onRequestFocus={handleRequestFocus}
          />
        </div>
        <div className="order-1 flex flex-col gap-4 xl:order-2 xl:col-span-2">
          <Card>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  {t.misc.linesSectionTitle}
                </h2>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {t.preview.linesCount(lines.length)} ·{" "}
                  {t.preview.grossWeightTotal}: {formatNumber(grossTotal, 2)}{" "}
                  {t.units.kg}
                </span>
              </div>

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
                  {isPending ? t.actions.saving : t.actions.saveLines}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}

// ─── Receiving snapshot (read-only, used for CONFIRMED + post-cancel) ───────
//
// Pulls values from the snapshot columns (`receivingEntityNameSnapshot`,
// etc.) so the bill prints the values that were committed at create time,
// not the latest master-data state. Master-data edits never retro-apply.

function ReceivingSnapshot({ sale }: { sale: SalesOrderDTO }) {
  const hasAny =
    sale.receivingEntityNameSnapshot ||
    sale.receivingBankNameSnapshot ||
    sale.receivingBankAccountNoSnapshot;
  if (!hasAny) {
    return (
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {t.misc.receivingSectionTitle}
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">—</p>
      </section>
    );
  }
  const bankName = sale.receivingBankNameSnapshot;
  const bankDisplay = bankName ? bankLabel(bankName) ?? bankName : "—";
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        {t.misc.receivingSectionTitle}
      </h3>
      <dl className="grid grid-cols-1 gap-x-3 gap-y-1 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300 sm:grid-cols-2">
        <div className="flex flex-col gap-0.5">
          <dt className="text-zinc-500 dark:text-zinc-400">
            {t.fields.receivingEntity}
          </dt>
          <dd className="font-medium text-zinc-900 dark:text-zinc-50">
            {sale.receivingEntityNameSnapshot ?? "—"}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-zinc-500 dark:text-zinc-400">
            {t.fields.receivingBank}
          </dt>
          <dd className="text-zinc-900 dark:text-zinc-50">
            {bankDisplay}
            {sale.receivingBankAccountNoSnapshot
              ? ` · ${sale.receivingBankAccountNoSnapshot}`
              : ""}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-zinc-500 dark:text-zinc-400">
            {t.fields.receivingBankAccountName}
          </dt>
          <dd className="text-zinc-900 dark:text-zinc-50">
            {sale.receivingBankAccountNameSnapshot ?? "—"}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-zinc-500 dark:text-zinc-400">
            {t.fields.receivingTaxId}
          </dt>
          <dd className="font-mono text-zinc-900 dark:text-zinc-50">
            {sale.receivingTaxIdSnapshot ?? "—"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
