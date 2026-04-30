"use client";

import { useMemo, useState, useActionState, type InputHTMLAttributes } from "react";

import type {
  PurchaseActionState,
  PurchaseFieldKey,
} from "@/modules/purchase/action-state";
import { purchaseT } from "@/modules/purchase/i18n";
import { RUBBER_TYPES } from "@/modules/purchase/rubber-types";
import { getEditableFields, type PurchaseStatus } from "@/modules/purchase/status";
import { Button, Input, Label } from "@/shared/ui";

import { FarmerPicker } from "./farmer-picker";

const t = purchaseT();

type FormAction = (
  prevState: PurchaseActionState,
  formData: FormData,
) => Promise<PurchaseActionState>;

type BranchOption = { id: string; code: string; name: string };

type CreateProps = {
  mode: "create";
  action: FormAction;
  availableBranches: ReadonlyArray<BranchOption>;
  defaultBranchId?: string | null;
};

type EditProps = {
  mode: "edit";
  action: FormAction;
  status: PurchaseStatus;
  initialValue: {
    rubberType: string;
    grossWeight: string;
    tareWeight: string;
    netWeight: string;
    pricePerKg: string;
    totalAmount: string;
    withholdingTaxPercent: string;
    withholdingTaxAmount: string;
    netPayableAmount: string;
    note: string | null;
  };
};

type Props = CreateProps | EditProps;

const initialState: PurchaseActionState = {};

export function PurchaseForm(props: Props) {
  const [state, formAction, pending] = useActionState(props.action, initialState);

  if (props.mode === "create") {
    return (
      <CreateForm
        {...props}
        state={state}
        formAction={formAction}
        pending={pending}
      />
    );
  }
  return (
    <EditForm
      {...props}
      state={state}
      formAction={formAction}
      pending={pending}
    />
  );
}

// ─── Create form ─────────────────────────────────────────────────────────────

function CreateForm({
  action: _action,
  availableBranches,
  defaultBranchId,
  state,
  formAction,
  pending,
}: CreateProps & {
  state: PurchaseActionState;
  formAction: (formData: FormData) => void;
  pending: boolean;
}) {
  const showBranchSelect = availableBranches.length > 1;
  const onlyBranch = availableBranches.length === 1 ? availableBranches[0] : null;
  const [branchId, setBranchId] = useState<string>(
    state.values?.branchId ??
      defaultBranchId ??
      onlyBranch?.id ??
      "",
  );

  const valueFor = (key: PurchaseFieldKey): string => {
    const fromState = state.values?.[key];
    if (fromState !== undefined) return fromState;
    return "";
  };

  const [grossInput, setGrossInput] = useState(valueFor("grossWeight"));
  const [tareInput, setTareInput] = useState(valueFor("tareWeight"));
  const [priceInput, setPriceInput] = useState(valueFor("pricePerKg"));
  const [percentInput, setPercentInput] = useState(
    valueFor("withholdingTaxPercent"),
  );

  const preview = useMemo(
    () => previewAmounts(grossInput, tareInput, priceInput, percentInput),
    [grossInput, tareInput, priceInput, percentInput],
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {showBranchSelect ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="branchId">
            {t.fields.branch} <span className="text-red-600">*</span>
          </Label>
          <select
            id="branchId"
            name="branchId"
            required
            disabled={pending}
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="">{t.placeholders.selectBranch}</option>
            {availableBranches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} – {b.name}
              </option>
            ))}
          </select>
          {state.fieldErrors?.branchId ? (
            <p role="alert" className="text-sm text-red-700 dark:text-red-400">
              {state.fieldErrors.branchId}
            </p>
          ) : null}
        </div>
      ) : onlyBranch ? (
        <div className="flex flex-col gap-1.5">
          <Label>{t.fields.branch}</Label>
          <input type="hidden" name="branchId" value={onlyBranch.id} />
          <p className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            {onlyBranch.code} – {onlyBranch.name}
          </p>
        </div>
      ) : null}

      <FarmerPicker
        branchId={branchId}
        required
        disabled={pending || !branchId}
        error={state.fieldErrors?.farmerId}
      />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rubberType">
          {t.fields.rubberType} <span className="text-red-600">*</span>
        </Label>
        <select
          id="rubberType"
          name="rubberType"
          required
          disabled={pending}
          defaultValue={valueFor("rubberType")}
          className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">{t.placeholders.selectRubberType}</option>
          {RUBBER_TYPES.map((r) => (
            <option key={r.code} value={r.code}>
              {r.th}
            </option>
          ))}
        </select>
        {state.fieldErrors?.rubberType ? (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {state.fieldErrors.rubberType}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NumericField
          id="grossWeight"
          label={`${t.fields.grossWeight} (${t.units.kg})`}
          required
          step={0.01}
          value={grossInput}
          onValueChange={setGrossInput}
          error={state.fieldErrors?.grossWeight}
          hint={t.hints.weightDecimals}
          disabled={pending}
          inputMode="decimal"
          min={0}
        />
        <NumericField
          id="tareWeight"
          label={`${t.fields.tareWeight} (${t.units.kg})`}
          step={0.01}
          value={tareInput}
          onValueChange={setTareInput}
          error={state.fieldErrors?.tareWeight}
          hint={t.hints.tareOptional}
          disabled={pending}
          inputMode="decimal"
          min={0}
        />
      </div>

      <PreviewBlock
        label={t.fields.netWeight}
        value={preview.net}
        unit={t.units.kg}
        hint={t.hints.serverComputedNet}
      />

      <NumericField
        id="pricePerKg"
        label={`${t.fields.pricePerKg} (${t.units.bahtPerKg})`}
        required
        step={0.0001}
        value={priceInput}
        onValueChange={setPriceInput}
        error={state.fieldErrors?.pricePerKg}
        hint={t.hints.priceDecimals}
        disabled={pending}
        inputMode="decimal"
        min={0}
      />

      <PreviewBlock
        label={t.fields.totalAmount}
        value={preview.total}
        unit={t.units.baht}
        hint={t.hints.serverComputedTotal}
      />

      <NumericField
        id="withholdingTaxPercent"
        label={t.fields.withholdingTaxPercent}
        step={0.01}
        value={percentInput}
        onValueChange={setPercentInput}
        error={state.fieldErrors?.withholdingTaxPercent}
        hint={t.hints.withholdingDefault0}
        disabled={pending}
        inputMode="decimal"
        min={0}
        max={100}
      />

      <PreviewBlock
        label={t.fields.withholdingTaxAmount}
        value={preview.tax}
        unit={t.units.baht}
        hint={t.hints.serverComputedTax}
        tone="muted"
      />

      <PreviewBlock
        label={t.fields.netPayableAmount}
        value={preview.netPayable}
        unit={t.units.baht}
        hint={t.hints.serverComputedNetPayable}
      />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="note">{t.fields.note}</Label>
        <textarea
          id="note"
          name="note"
          rows={3}
          defaultValue={valueFor("note")}
          placeholder={t.placeholders.note}
          disabled={pending}
          maxLength={1000}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500"
        />
        {state.fieldErrors?.note ? (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {state.fieldErrors.note}
          </p>
        ) : null}
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400"
        >
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? t.actions.saving : t.actions.submitCreate}
      </Button>
    </form>
  );
}

// ─── Edit form ───────────────────────────────────────────────────────────────

function EditForm({
  status,
  initialValue,
  state,
  formAction,
  pending,
}: EditProps & {
  state: PurchaseActionState;
  formAction: (formData: FormData) => void;
  pending: boolean;
}) {
  const editable = getEditableFields(status);

  type EditableInputKey =
    | "rubberType"
    | "grossWeight"
    | "tareWeight"
    | "pricePerKg"
    | "withholdingTaxPercent"
    | "note";

  const valueFor = (key: EditableInputKey): string => {
    const fromState = state.values?.[key];
    if (fromState !== undefined) return fromState;
    if (key === "note") return initialValue.note ?? "";
    return initialValue[key] ?? "";
  };

  const [grossInput, setGrossInput] = useState(valueFor("grossWeight"));
  const [tareInput, setTareInput] = useState(valueFor("tareWeight"));
  const [priceInput, setPriceInput] = useState(valueFor("pricePerKg"));
  const [percentInput, setPercentInput] = useState(
    valueFor("withholdingTaxPercent"),
  );

  const preview = useMemo(
    () => previewAmounts(grossInput, tareInput, priceInput, percentInput),
    [grossInput, tareInput, priceInput, percentInput],
  );

  const lockedHint =
    !editable.has("grossWeight") ||
    !editable.has("pricePerKg") ||
    !editable.has("withholdingTaxPercent")
      ? t.hints.statusLockedFields(t.status[status] ?? status)
      : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {lockedHint ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          {lockedHint}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rubberType">{t.fields.rubberType}</Label>
        <select
          id="rubberType"
          name="rubberType"
          disabled={pending || !editable.has("rubberType")}
          defaultValue={valueFor("rubberType")}
          className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          {RUBBER_TYPES.map((r) => (
            <option key={r.code} value={r.code}>
              {r.th}
            </option>
          ))}
        </select>
        {state.fieldErrors?.rubberType ? (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {state.fieldErrors.rubberType}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NumericField
          id="grossWeight"
          label={`${t.fields.grossWeight} (${t.units.kg})`}
          step={0.01}
          value={grossInput}
          onValueChange={setGrossInput}
          error={state.fieldErrors?.grossWeight}
          hint={editable.has("grossWeight") ? t.hints.weightDecimals : undefined}
          disabled={pending || !editable.has("grossWeight")}
          inputMode="decimal"
          min={0}
        />
        <NumericField
          id="tareWeight"
          label={`${t.fields.tareWeight} (${t.units.kg})`}
          step={0.01}
          value={tareInput}
          onValueChange={setTareInput}
          error={state.fieldErrors?.tareWeight}
          hint={editable.has("tareWeight") ? t.hints.tareOptional : undefined}
          disabled={pending || !editable.has("tareWeight")}
          inputMode="decimal"
          min={0}
        />
      </div>

      <PreviewBlock
        label={t.fields.netWeight}
        value={preview.net}
        unit={t.units.kg}
        hint={t.hints.serverComputedNet}
      />

      <NumericField
        id="pricePerKg"
        label={`${t.fields.pricePerKg} (${t.units.bahtPerKg})`}
        step={0.0001}
        value={priceInput}
        onValueChange={setPriceInput}
        error={state.fieldErrors?.pricePerKg}
        hint={editable.has("pricePerKg") ? t.hints.priceDecimals : undefined}
        disabled={pending || !editable.has("pricePerKg")}
        inputMode="decimal"
        min={0}
      />

      <PreviewBlock
        label={t.fields.totalAmount}
        value={preview.total}
        unit={t.units.baht}
        hint={t.hints.serverComputedTotal}
      />

      <NumericField
        id="withholdingTaxPercent"
        label={t.fields.withholdingTaxPercent}
        step={0.01}
        value={percentInput}
        onValueChange={setPercentInput}
        error={state.fieldErrors?.withholdingTaxPercent}
        hint={
          editable.has("withholdingTaxPercent")
            ? t.hints.percentDecimals
            : undefined
        }
        disabled={pending || !editable.has("withholdingTaxPercent")}
        inputMode="decimal"
        min={0}
        max={100}
      />

      <PreviewBlock
        label={t.fields.withholdingTaxAmount}
        value={preview.tax}
        unit={t.units.baht}
        hint={t.hints.serverComputedTax}
        tone="muted"
      />

      <PreviewBlock
        label={t.fields.netPayableAmount}
        value={preview.netPayable}
        unit={t.units.baht}
        hint={t.hints.serverComputedNetPayable}
      />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="note">{t.fields.note}</Label>
        <textarea
          id="note"
          name="note"
          rows={3}
          defaultValue={valueFor("note")}
          placeholder={t.placeholders.note}
          disabled={pending || !editable.has("note")}
          maxLength={1000}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500"
        />
        {state.fieldErrors?.note ? (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {state.fieldErrors.note}
          </p>
        ) : null}
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400"
        >
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? t.actions.saving : t.actions.saveDraft}
      </Button>
    </form>
  );
}

// ─── Subcomponents & helpers ─────────────────────────────────────────────────

type NumericFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange"
> & {
  id: string;
  label: string;
  value: string;
  onValueChange: (next: string) => void;
  error?: string;
  hint?: string;
};

function NumericField({
  id,
  label,
  value,
  onValueChange,
  error,
  hint,
  required,
  ...rest
}: NumericFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </Label>
      <Input
        id={id}
        name={id}
        type="number"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        required={required}
        {...rest}
      />
      {error ? (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      ) : null}
      {!error && hint ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
      ) : null}
    </div>
  );
}

function PreviewBlock({
  label,
  value,
  unit,
  hint,
  tone = "primary",
}: {
  label: string;
  value: string;
  unit: string;
  hint: string;
  tone?: "primary" | "muted";
}) {
  const wrapperClass =
    tone === "primary"
      ? "rounded-lg bg-emerald-50 px-3 py-2 text-base font-semibold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"
      : "rounded-lg bg-zinc-50 px-3 py-2 text-base font-semibold text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300";
  const unitClass =
    tone === "primary"
      ? "text-sm font-normal text-emerald-700 dark:text-emerald-400"
      : "text-sm font-normal text-zinc-500 dark:text-zinc-400";
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <p className={wrapperClass}>
        {value} <span className={unitClass}>{unit}</span>
      </p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
    </div>
  );
}

/**
 * Client-side preview of the same arithmetic the server runs. UI-only —
 * the server treats client-supplied calculations as untrusted and recomputes
 * with `Prisma.Decimal`. Empty/blank tare or percent are treated as 0 so the
 * preview matches the schema's `.default(0)`.
 */
function previewAmounts(
  grossStr: string,
  tareStr: string,
  priceStr: string,
  percentStr: string,
): { net: string; total: string; tax: string; netPayable: string } {
  const gross = Number(grossStr);
  const tareRaw = tareStr.trim();
  const tare = tareRaw === "" ? 0 : Number(tareStr);
  const price = Number(priceStr);
  const percentRaw = percentStr.trim();
  const percent = percentRaw === "" ? 0 : Number(percentStr);

  const empty = { net: "—", total: "—", tax: "—", netPayable: "—" } as const;
  if (!Number.isFinite(gross) || !Number.isFinite(tare)) return empty;

  const net = gross - tare;
  if (net <= 0 || !Number.isFinite(net)) return empty;

  const total =
    Number.isFinite(price) && price > 0
      ? Math.round(net * price * 100) / 100
      : NaN;

  const tax =
    Number.isFinite(total) && Number.isFinite(percent) && percent >= 0
      ? Math.round((total * percent) / 100 * 100) / 100
      : NaN;

  const netPayable =
    Number.isFinite(total) && Number.isFinite(tax) ? total - tax : NaN;

  const fmt2 = (n: number) =>
    n.toLocaleString("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return {
    net: net.toLocaleString("th-TH", { maximumFractionDigits: 2 }),
    total: Number.isFinite(total) ? fmt2(total) : "—",
    tax: Number.isFinite(tax) ? fmt2(tax) : "—",
    netPayable: Number.isFinite(netPayable) ? fmt2(netPayable) : "—",
  };
}
