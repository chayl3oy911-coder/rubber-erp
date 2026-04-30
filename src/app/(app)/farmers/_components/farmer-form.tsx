"use client";

import { useActionState, type InputHTMLAttributes } from "react";

import type {
  FarmerActionState,
  FarmerFieldKey,
} from "@/modules/farmer/action-state";
import { farmerT } from "@/modules/farmer/i18n";
import { Button, Input, Label } from "@/shared/ui";

const t = farmerT();

type FarmerFormAction = (
  prevState: FarmerActionState,
  formData: FormData,
) => Promise<FarmerActionState>;

type InitialValue = {
  branchId?: string | null;
  code?: string | null;
  fullName?: string | null;
  phone?: string | null;
  nationalId?: string | null;
  bankName?: string | null;
  bankAccountNo?: string | null;
  notes?: string | null;
};

type BranchOption = {
  id: string;
  code: string;
  name: string;
};

type Props = {
  action: FarmerFormAction;
  mode: "create" | "edit";
  initialValue?: InitialValue;
  /**
   * Available branches for selection. Required only in create mode.
   * If empty + create mode, the form renders an empty state instead.
   * Ignored in edit mode (branch transfer not allowed this round).
   */
  availableBranches?: ReadonlyArray<BranchOption>;
  /**
   * If true (super admin in edit mode, or a non-changeable display), shows
   * the branch as read-only text. Always true in edit mode.
   */
  lockedBranch?: BranchOption | null;
};

const initialState: FarmerActionState = {};

export function FarmerForm({
  action,
  mode,
  initialValue,
  availableBranches = [],
  lockedBranch = null,
}: Props) {
  const [state, formAction, pending] = useActionState(action, initialState);

  const valueFor = (key: FarmerFieldKey): string => {
    const fromState = state.values?.[key];
    if (fromState !== undefined) return fromState;
    const fromInitial = initialValue?.[key];
    return fromInitial ?? "";
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
        required
        defaultValue={valueFor("code")}
        error={state.fieldErrors?.code}
        hint={t.hints.code}
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          id="bankName"
          name="bankName"
          label={`${t.fields.bankName} ${t.hints.optional}`}
          defaultValue={valueFor("bankName")}
          error={state.fieldErrors?.bankName}
          placeholder={t.placeholders.bankName}
          disabled={pending}
          maxLength={100}
        />
        <FormField
          id="bankAccountNo"
          name="bankAccountNo"
          label={`${t.fields.bankAccountNo} ${t.hints.optional}`}
          defaultValue={valueFor("bankAccountNo")}
          error={state.fieldErrors?.bankAccountNo}
          placeholder={t.placeholders.bankAccountNo}
          disabled={pending}
          maxLength={50}
        />
      </div>

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
