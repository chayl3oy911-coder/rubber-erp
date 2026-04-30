"use client";

import { useActionState, type InputHTMLAttributes } from "react";

import type {
  BranchActionState,
  BranchFieldKey,
} from "@/modules/branch/action-state";
import { Button, Input, Label } from "@/shared/ui";

type BranchFormAction = (
  prevState: BranchActionState,
  formData: FormData
) => Promise<BranchActionState>;

type InitialValue = {
  code?: string | null;
  name?: string | null;
  address?: string | null;
  phone?: string | null;
};

type Props = {
  action: BranchFormAction;
  initialValue?: InitialValue;
  submitLabel: string;
};

const initialState: BranchActionState = {};

export function BranchForm({ action, initialValue, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, initialState);

  const valueFor = (key: BranchFieldKey): string => {
    const fromState = state.values?.[key];
    if (fromState !== undefined) return fromState;
    const fromInitial = initialValue?.[key];
    return fromInitial ?? "";
  };

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormField
        id="code"
        label="รหัสสาขา"
        defaultValue={valueFor("code")}
        error={state.fieldErrors?.code}
        hint="ใช้ A-Z, 0-9, _, - เท่านั้น"
        required
        autoComplete="off"
        autoCapitalize="characters"
        placeholder="เช่น HQ, BR01"
        disabled={pending}
        maxLength={20}
      />
      <FormField
        id="name"
        label="ชื่อสาขา"
        defaultValue={valueFor("name")}
        error={state.fieldErrors?.name}
        required
        disabled={pending}
        placeholder="เช่น สาขาใหญ่ตลาดน้ำ"
        maxLength={120}
      />
      <FormField
        id="phone"
        label="เบอร์โทร (ถ้ามี)"
        defaultValue={valueFor("phone")}
        error={state.fieldErrors?.phone}
        disabled={pending}
        placeholder="เช่น 02-xxx-xxxx"
        inputMode="tel"
        maxLength={40}
      />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="address">ที่อยู่ (ถ้ามี)</Label>
        <textarea
          id="address"
          name="address"
          defaultValue={valueFor("address")}
          rows={3}
          disabled={pending}
          maxLength={500}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500"
        />
        {state.fieldErrors?.address ? (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {state.fieldErrors.address}
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
        {pending ? "กำลังบันทึก..." : submitLabel}
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

function FormField({ id, label, error, hint, ...inputProps }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} {...inputProps} />
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
