"use client";

import { useActionState, useState, type InputHTMLAttributes } from "react";

import type {
  CustomerActionState,
  CustomerFormBankAccountValues,
  CustomerScalarFieldKey,
} from "@/modules/customer/action-state";
import { CUSTOMER_BANKS } from "@/modules/customer/banks";
import { customerT } from "@/modules/customer/i18n";
import { MAX_BANK_ACCOUNTS_PER_CUSTOMER } from "@/modules/customer/schemas";
import { Button, Input, Label } from "@/shared/ui";

const t = customerT();

type CustomerFormAction = (
  prevState: CustomerActionState,
  formData: FormData,
) => Promise<CustomerActionState>;

type InitialBankAccount = {
  id?: string;
  bankName: string;
  bankAccountNo: string;
  accountName: string | null;
  isPrimary: boolean;
};

type InitialValue = {
  branchId?: string | null;
  code?: string | null;
  fullName?: string | null;
  phone?: string | null;
  nationalId?: string | null;
  notes?: string | null;
  bankAccounts?: ReadonlyArray<InitialBankAccount>;
};

type BranchOption = {
  id: string;
  code: string;
  name: string;
};

type Props = {
  action: CustomerFormAction;
  mode: "create" | "edit";
  initialValue?: InitialValue;
  /**
   * Available branches for selection. Required only in create mode.
   * If empty + create mode, the form renders an empty state instead.
   * Ignored in edit mode (branch transfer not allowed).
   */
  availableBranches?: ReadonlyArray<BranchOption>;
  lockedBranch?: BranchOption | null;
};

const initialState: CustomerActionState = {};

type RowState = CustomerFormBankAccountValues & { _key: string };

let rowKeyCounter = 0;
function nextRowKey(): string {
  rowKeyCounter += 1;
  return `r${rowKeyCounter}`;
}

function rowFromInitial(account: InitialBankAccount): RowState {
  return {
    _key: nextRowKey(),
    bankName: account.bankName,
    bankAccountNo: account.bankAccountNo,
    accountName: account.accountName ?? "",
    isPrimary: account.isPrimary,
  };
}

function rowFromValues(values: CustomerFormBankAccountValues): RowState {
  return {
    _key: nextRowKey(),
    bankName: values.bankName ?? "",
    bankAccountNo: values.bankAccountNo ?? "",
    accountName: values.accountName ?? "",
    isPrimary: !!values.isPrimary,
  };
}

export function CustomerForm({
  action,
  mode,
  initialValue,
  availableBranches = [],
  lockedBranch = null,
}: Props) {
  const [state, formAction, pending] = useActionState(action, initialState);

  // Resolve a starting set of bank account rows. Server-action state takes
  // precedence (it preserves user edits across validation errors); otherwise
  // we hydrate from `initialValue` (edit mode) or start empty (create mode).
  const initialRows: RowState[] =
    state.values?.bankAccounts && state.values.bankAccounts.length > 0
      ? state.values.bankAccounts.map(rowFromValues)
      : (initialValue?.bankAccounts ?? []).map(rowFromInitial);

  const [rows, setRows] = useState<RowState[]>(initialRows);

  const valueFor = (key: CustomerScalarFieldKey): string => {
    const fromState = state.values?.[key];
    if (fromState !== undefined && fromState !== null) return String(fromState);
    const fromInitial = initialValue?.[key];
    if (fromInitial === undefined || fromInitial === null) return "";
    return String(fromInitial);
  };

  // Branch selection logic for create mode.
  const showBranchSelect =
    mode === "create" && !lockedBranch && availableBranches.length > 1;
  const showBranchHidden =
    mode === "create" && availableBranches.length === 1 && !lockedBranch;
  const singleBranch = showBranchHidden ? availableBranches[0] : null;
  const showLockedBranch =
    mode === "edit" || (mode === "create" && Boolean(lockedBranch));

  const submitLabel =
    mode === "create" ? t.actions.submitCreate : t.actions.submitUpdate;

  function setPrimary(idx: number): void {
    setRows((prev) => prev.map((r, i) => ({ ...r, isPrimary: i === idx })));
  }

  function addRow(): void {
    setRows((prev) => {
      if (prev.length >= MAX_BANK_ACCOUNTS_PER_CUSTOMER) return prev;
      const newRow: RowState = {
        _key: nextRowKey(),
        bankName: "",
        bankAccountNo: "",
        accountName: "",
        isPrimary: prev.length === 0,
      };
      return [...prev, newRow];
    });
  }

  function removeRow(idx: number): void {
    setRows((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      // If we removed the primary, auto-promote the new first row.
      if (next.length > 0 && !next.some((r) => r.isPrimary)) {
        next[0] = { ...next[0], isPrimary: true };
      }
      return next;
    });
  }

  function updateRow<K extends keyof CustomerFormBankAccountValues>(
    idx: number,
    key: K,
    value: CustomerFormBankAccountValues[K],
  ): void {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
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
            defaultValue={valueFor("branchId")}
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
      ) : null}

      {showBranchHidden && singleBranch ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="branchId">{t.fields.branch}</Label>
          <input type="hidden" name="branchId" value={singleBranch.id} />
          <p className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            {singleBranch.code} – {singleBranch.name}
          </p>
          {state.fieldErrors?.branchId ? (
            <p role="alert" className="text-sm text-red-700 dark:text-red-400">
              {state.fieldErrors.branchId}
            </p>
          ) : null}
        </div>
      ) : null}

      {showLockedBranch && lockedBranch ? (
        <div className="flex flex-col gap-1.5">
          <Label>{t.fields.branch}</Label>
          <p className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            {lockedBranch.code} – {lockedBranch.name}
          </p>
        </div>
      ) : null}

      <FormField
        id="code"
        name="code"
        label={t.fields.code}
        required={mode === "edit"}
        defaultValue={valueFor("code")}
        error={state.fieldErrors?.code}
        hint={mode === "create" ? t.hints.codeAuto : t.hints.code}
        autoComplete="off"
        autoCapitalize="characters"
        placeholder={t.placeholders.code}
        disabled={pending}
        maxLength={20}
      />

      <FormField
        id="fullName"
        name="fullName"
        label={t.fields.fullName}
        required
        defaultValue={valueFor("fullName")}
        error={state.fieldErrors?.fullName}
        placeholder={t.placeholders.fullName}
        disabled={pending}
        maxLength={200}
      />

      <FormField
        id="phone"
        name="phone"
        label={`${t.fields.phone} ${t.hints.optional}`}
        defaultValue={valueFor("phone")}
        error={state.fieldErrors?.phone}
        placeholder={t.placeholders.phone}
        inputMode="tel"
        disabled={pending}
        maxLength={40}
      />

      <FormField
        id="nationalId"
        name="nationalId"
        label={`${t.fields.nationalId} ${t.hints.optional}`}
        defaultValue={valueFor("nationalId")}
        error={state.fieldErrors?.nationalId}
        placeholder={t.placeholders.nationalId}
        disabled={pending}
        maxLength={20}
      />

      <BankAccountsField
        rows={rows}
        addRow={addRow}
        removeRow={removeRow}
        updateRow={updateRow}
        setPrimary={setPrimary}
        disabled={pending}
        generalError={state.bankAccountErrors?.general}
        rowErrors={state.bankAccountErrors?.rows ?? []}
      />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">
          {t.fields.notes} {t.hints.notesOptional}
        </Label>
        <textarea
          id="notes"
          name="notes"
          defaultValue={valueFor("notes")}
          rows={3}
          disabled={pending}
          maxLength={1000}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500"
        />
        {state.fieldErrors?.notes ? (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {state.fieldErrors.notes}
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
        {pending ? t.actions.saving : submitLabel}
      </Button>
    </form>
  );
}

// ─── Bank accounts editor ────────────────────────────────────────────────────

type BankAccountsFieldProps = {
  rows: RowState[];
  addRow: () => void;
  removeRow: (idx: number) => void;
  updateRow: <K extends keyof CustomerFormBankAccountValues>(
    idx: number,
    key: K,
    value: CustomerFormBankAccountValues[K],
  ) => void;
  setPrimary: (idx: number) => void;
  disabled: boolean;
  generalError?: string;
  rowErrors: ReadonlyArray<
    Partial<Record<"bankName" | "bankAccountNo" | "accountName" | "isPrimary", string>>
  >;
};

function BankAccountsField({
  rows,
  addRow,
  removeRow,
  updateRow,
  setPrimary,
  disabled,
  generalError,
  rowErrors,
}: BankAccountsFieldProps) {
  const canAdd = rows.length < MAX_BANK_ACCOUNTS_PER_CUSTOMER;

  return (
    <fieldset className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <legend className="px-1 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        {t.fields.bankAccounts} {t.hints.optional}
      </legend>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {t.hints.maxBankAccounts}
      </p>

      {rows.length === 0 ? (
        <p className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
          {t.hints.bankAccountsOptional}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row, idx) => {
            const errors = rowErrors[idx] ?? {};
            return (
              <li
                key={row._key}
                className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-700 dark:bg-zinc-900/40"
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`bankAccounts[${idx}].bankName`}>
                      {t.fields.bankName} <span className="text-red-600">*</span>
                    </Label>
                    <select
                      id={`bankAccounts[${idx}].bankName`}
                      name={`bankAccounts[${idx}].bankName`}
                      required
                      disabled={disabled}
                      value={row.bankName ?? ""}
                      onChange={(e) =>
                        updateRow(idx, "bankName", e.target.value)
                      }
                      className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                    >
                      <option value="">{t.placeholders.selectBank}</option>
                      {CUSTOMER_BANKS.map((b) => (
                        <option key={b.code} value={b.code}>
                          {b.th}
                        </option>
                      ))}
                    </select>
                    {errors.bankName ? (
                      <p
                        role="alert"
                        className="text-sm text-red-700 dark:text-red-400"
                      >
                        {errors.bankName}
                      </p>
                    ) : null}
                  </div>
                  <FormField
                    id={`bankAccounts[${idx}].bankAccountNo`}
                    name={`bankAccounts[${idx}].bankAccountNo`}
                    label={t.fields.bankAccountNo}
                    required
                    value={row.bankAccountNo ?? ""}
                    onChange={(e) =>
                      updateRow(idx, "bankAccountNo", e.target.value)
                    }
                    error={errors.bankAccountNo}
                    placeholder={t.placeholders.bankAccountNo}
                    disabled={disabled}
                    maxLength={50}
                  />
                </div>

                <FormField
                  id={`bankAccounts[${idx}].accountName`}
                  name={`bankAccounts[${idx}].accountName`}
                  label={`${t.fields.accountName} ${t.hints.optional}`}
                  value={row.accountName ?? ""}
                  onChange={(e) =>
                    updateRow(idx, "accountName", e.target.value)
                  }
                  error={errors.accountName}
                  placeholder={t.placeholders.accountName}
                  disabled={disabled}
                  maxLength={200}
                />

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                    <input
                      type="radio"
                      name="bankAccounts._primary"
                      checked={row.isPrimary === true}
                      onChange={() => setPrimary(idx)}
                      disabled={disabled}
                      className="h-4 w-4 cursor-pointer accent-emerald-600 disabled:cursor-not-allowed"
                    />
                    {t.fields.isPrimary}
                  </label>
                  {/* The radio above only updates client state. We mirror the
                      selection into a hidden input named `isPrimary` so the
                      action sees the value per row. */}
                  <input
                    type="hidden"
                    name={`bankAccounts[${idx}].isPrimary`}
                    value={row.isPrimary ? "true" : ""}
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    disabled={disabled}
                    className="inline-flex h-8 items-center justify-center rounded-md border border-red-200 bg-white px-3 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/30 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-500/10"
                  >
                    {t.actions.removeBankAccount}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={addRow}
          disabled={disabled || !canAdd}
          className="inline-flex h-9 items-center justify-center rounded-md border border-emerald-300 bg-white px-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-500/40 dark:bg-zinc-900 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
        >
          {t.actions.addBankAccount}
        </button>
        {rows.length > 0 ? (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {t.hints.primaryAutoSelect}
          </span>
        ) : null}
      </div>

      {generalError ? (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400"
        >
          {generalError}
        </p>
      ) : null}
    </fieldset>
  );
}

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  error?: string;
  hint?: string;
};

function FormField({ id, label, error, hint, required, ...inputProps }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </Label>
      <Input id={id} required={required} {...inputProps} />
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
