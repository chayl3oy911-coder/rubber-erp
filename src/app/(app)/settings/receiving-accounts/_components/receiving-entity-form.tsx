"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import {
  createReceivingEntityAction,
  updateReceivingEntityAction,
} from "@/modules/receivingAccount/actions";
import {
  EMPTY_RECEIVING_ENTITY_STATE,
  type ReceivingBankAccountFieldKey,
  type ReceivingEntityActionState,
  type ReceivingFormBankAccountValues,
} from "@/modules/receivingAccount/action-state";
import type { ReceivingEntityDTO } from "@/modules/receivingAccount/dto";
import { receivingAccountT } from "@/modules/receivingAccount/i18n";
import {
  MAX_BANK_ACCOUNTS_PER_RECEIVING_ENTITY,
  RECEIVING_ENTITY_TYPES,
  type ReceivingEntityType,
} from "@/modules/receivingAccount/types";
import { BANKS } from "@/shared/banks";
import { Card, CardContent, Input, Label } from "@/shared/ui";

const t = receivingAccountT();

const submitClass =
  "inline-flex h-12 w-full shrink-0 items-center justify-center whitespace-nowrap rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:disabled:bg-zinc-700 sm:w-auto";

const ghostButtonClass =
  "inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

const errorTextClass = "text-xs text-red-600 dark:text-red-400";

const inputClass =
  "h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

type BranchOpt = { id: string; code: string; name: string };

type Props = {
  /** Editing → entity supplied. Creating → entity = null. */
  entity: ReceivingEntityDTO | null;
  /**
   * Branch options for the picker. Empty list means: show only the
   * "company-wide" option (workspaces with HQ-only users still need to
   * be able to create company-wide entries).
   */
  branches: ReadonlyArray<BranchOpt>;
  /**
   * Whether the actor can pick a `branchId === null` (company-wide).
   * Restricted to users with `settings.receivingAccount.update` so a
   * sales_staff with create rights can't accidentally overwrite the
   * HQ default. (`hq_admin` and above always pass.)
   */
  canCreateCompanyWide: boolean;
};

function emptyBankRow(): ReceivingFormBankAccountValues {
  return {
    bankName: "",
    bankAccountNo: "",
    bankAccountName: "",
    isPrimary: false,
    isActive: true,
  };
}

function bankRowsFromEntity(
  e: ReceivingEntityDTO,
): ReceivingFormBankAccountValues[] {
  if (e.bankAccounts.length === 0) return [emptyBankRow()];
  return e.bankAccounts.map((a) => ({
    id: a.id,
    bankName: a.bankName,
    bankAccountNo: a.bankAccountNo,
    bankAccountName: a.bankAccountName,
    isPrimary: a.isPrimary,
    isActive: a.isActive,
  }));
}

export function ReceivingEntityForm({
  entity,
  branches,
  canCreateCompanyWide,
}: Props) {
  const isEdit = entity !== null;
  const action = isEdit
    ? updateReceivingEntityAction.bind(null, entity.id)
    : createReceivingEntityAction;
  const [state, formAction, isPending] = useActionState<
    ReceivingEntityActionState,
    FormData
  >(action, EMPTY_RECEIVING_ENTITY_STATE);

  const v = state.values;

  // ── Scalar fields ───────────────────────────────────────────────────
  const initialBranchId = entity
    ? entity.branchId ?? ""
    : v?.branchId ?? (canCreateCompanyWide ? "" : branches[0]?.id ?? "");
  const [branchId, setBranchId] = useState<string>(initialBranchId);

  const initialType: ReceivingEntityType =
    (entity?.type as ReceivingEntityType) ??
    (v?.type as ReceivingEntityType) ??
    "COMPANY";
  const [type, setType] = useState<ReceivingEntityType>(initialType);

  const [name, setName] = useState<string>(v?.name ?? entity?.name ?? "");
  const [taxId, setTaxId] = useState<string>(v?.taxId ?? entity?.taxId ?? "");
  const [address, setAddress] = useState<string>(
    v?.address ?? entity?.address ?? "",
  );
  const [isDefault, setIsDefault] = useState<boolean>(
    v?.isDefault ?? entity?.isDefault ?? false,
  );
  const [isActive, setIsActive] = useState<boolean>(
    v?.isActive ?? entity?.isActive ?? true,
  );

  // ── Bank accounts ───────────────────────────────────────────────────
  const initialRows = useMemo<ReceivingFormBankAccountValues[]>(() => {
    if (v?.bankAccounts && v.bankAccounts.length > 0) return v.bankAccounts;
    if (entity) return bankRowsFromEntity(entity);
    return [{ ...emptyBankRow(), isPrimary: true }];
  }, [v?.bankAccounts, entity]);

  const [rows, setRows] = useState<ReceivingFormBankAccountValues[]>(
    initialRows,
  );

  function patchRow(
    idx: number,
    patch: Partial<ReceivingFormBankAccountValues>,
  ) {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    );
  }

  function setPrimary(idx: number) {
    setRows((prev) =>
      prev.map((r, i) => ({ ...r, isPrimary: i === idx && r.isActive })),
    );
  }

  function addRow() {
    setRows((prev) =>
      prev.length >= MAX_BANK_ACCOUNTS_PER_RECEIVING_ENTITY
        ? prev
        : [...prev, emptyBankRow()],
    );
  }

  function removeRow(idx: number) {
    setRows((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((_, i) => i !== idx);
      // If we removed the (only) primary, promote the first active row.
      if (!next.some((r) => r.isPrimary && r.isActive)) {
        const firstActive = next.findIndex((r) => r.isActive);
        if (firstActive >= 0) next[firstActive] = { ...next[firstActive], isPrimary: true };
      }
      return next;
    });
  }

  const fieldErrors = state.fieldErrors;
  const bankErrors = state.bankAccountErrors;

  const cannotAddMore = rows.length >= MAX_BANK_ACCOUNTS_PER_RECEIVING_ENTITY;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-4">
          {/* Branch scope (create only — edit locks branchId per the API). */}
          {!isEdit ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="branchId">{t.fields.branch}</Label>
              <select
                id="branchId"
                name="branchId"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className={inputClass}
              >
                {canCreateCompanyWide ? (
                  <option value="">{t.placeholders.branchAll}</option>
                ) : null}
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} — {b.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {branchId === ""
                  ? t.hints.branchScopeNull
                  : t.hints.branchScopePerBranch}
              </p>
              {fieldErrors?.branchId ? (
                <p className={errorTextClass}>{fieldErrors.branchId}</p>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="branchId-readonly">{t.fields.branch}</Label>
              <Input
                id="branchId-readonly"
                value={
                  entity?.branchId === null
                    ? t.placeholders.branchAll
                    : entity?.branch
                      ? `${entity.branch.code} — ${entity.branch.name}`
                      : (entity?.branchId ?? "—")
                }
                disabled
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type">{t.fields.type}</Label>
              <select
                id="type"
                name="type"
                value={type}
                onChange={(e) =>
                  setType(e.target.value as ReceivingEntityType)
                }
                className={inputClass}
                required
              >
                {RECEIVING_ENTITY_TYPES.map((tp) => (
                  <option key={tp} value={tp}>
                    {t.type[tp]}
                  </option>
                ))}
              </select>
              {fieldErrors?.type ? (
                <p className={errorTextClass}>{fieldErrors.type}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="taxId">{t.fields.taxId}</Label>
              <Input
                id="taxId"
                name="taxId"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder={t.placeholders.taxId}
                maxLength={30}
                inputMode="numeric"
              />
              {fieldErrors?.taxId ? (
                <p className={errorTextClass}>{fieldErrors.taxId}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">
              {t.fields.name}
              <span className="text-red-600"> *</span>
            </Label>
            <Input
              id="name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.placeholders.name}
              maxLength={200}
              required
            />
            {fieldErrors?.name ? (
              <p className={errorTextClass}>{fieldErrors.name}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="address">{t.fields.address}</Label>
            <Input
              id="address"
              name="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t.placeholders.address}
              maxLength={500}
            />
            {fieldErrors?.address ? (
              <p className={errorTextClass}>{fieldErrors.address}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                name="isDefault"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                value="true"
              />
              {t.fields.isDefault}
            </label>
            {isEdit ? (
              <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  value="true"
                />
                {t.fields.isActive}
              </label>
            ) : null}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {t.hints.isDefault}
          </p>
          {fieldErrors?.isDefault ? (
            <p className={errorTextClass}>{fieldErrors.isDefault}</p>
          ) : null}
          {fieldErrors?.isActive ? (
            <p className={errorTextClass}>{fieldErrors.isActive}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {t.fields.bankAccounts}
            </h2>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {t.misc.accountCountWithMax(rows.filter((r) => r.isActive).length)}
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {t.hints.maxBankAccounts} · {t.hints.isPrimary}
          </p>

          <ul className="flex flex-col gap-3">
            {rows.map((row, idx) => (
              <li key={row.id ?? `new-${idx}`}>
                <BankAccountRow
                  index={idx}
                  row={row}
                  errors={bankErrors?.rows?.[idx]}
                  onChange={(patch) => patchRow(idx, patch)}
                  onSetPrimary={() => setPrimary(idx)}
                  onRemove={
                    rows.length > 1 ? () => removeRow(idx) : undefined
                  }
                />
              </li>
            ))}
          </ul>

          {bankErrors?.general ? (
            <p className={errorTextClass}>{bankErrors.general}</p>
          ) : null}

          <div>
            <button
              type="button"
              onClick={addRow}
              disabled={cannotAddMore}
              className={ghostButtonClass}
            >
              {cannotAddMore ? t.hints.cannotAddMore : t.actions.addBankAccount}
            </button>
          </div>
        </CardContent>
      </Card>

      {state.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <Link
          href="/settings/receiving-accounts"
          className={ghostButtonClass}
        >
          {t.actions.back}
        </Link>
        <button
          type="submit"
          disabled={isPending || name.trim() === ""}
          className={submitClass}
        >
          {isPending
            ? t.actions.saving
            : isEdit
              ? t.actions.submitUpdate
              : t.actions.submitCreate}
        </button>
      </div>
    </form>
  );
}

// ─── Bank account row ───────────────────────────────────────────────────────

function BankAccountRow({
  index,
  row,
  errors,
  onChange,
  onSetPrimary,
  onRemove,
}: {
  index: number;
  row: ReceivingFormBankAccountValues;
  errors?: Partial<Record<ReceivingBankAccountFieldKey, string>>;
  onChange: (patch: Partial<ReceivingFormBankAccountValues>) => void;
  onSetPrimary: () => void;
  onRemove?: () => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      {/* Hidden id (only present when editing an existing row). */}
      {row.id ? (
        <input
          type="hidden"
          name={`bankAccounts[${index}].id`}
          value={row.id}
        />
      ) : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`bankName-${index}`}>{t.fields.bankName}</Label>
          <select
            id={`bankName-${index}`}
            name={`bankAccounts[${index}].bankName`}
            value={row.bankName}
            onChange={(e) => onChange({ bankName: e.target.value })}
            className={inputClass}
            required
          >
            <option value="">{t.placeholders.selectBank}</option>
            {BANKS.map((b) => (
              <option key={b.code} value={b.code}>
                {b.th}
              </option>
            ))}
          </select>
          {errors?.bankName ? (
            <p className={errorTextClass}>{errors.bankName}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`bankAccountNo-${index}`}>
            {t.fields.bankAccountNo}
          </Label>
          <Input
            id={`bankAccountNo-${index}`}
            name={`bankAccounts[${index}].bankAccountNo`}
            value={row.bankAccountNo ?? ""}
            onChange={(e) => onChange({ bankAccountNo: e.target.value })}
            placeholder={t.placeholders.bankAccountNo}
            maxLength={50}
            required
          />
          {errors?.bankAccountNo ? (
            <p className={errorTextClass}>{errors.bankAccountNo}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`bankAccountName-${index}`}>
            {t.fields.bankAccountName}
          </Label>
          <Input
            id={`bankAccountName-${index}`}
            name={`bankAccounts[${index}].bankAccountName`}
            value={row.bankAccountName ?? ""}
            onChange={(e) => onChange({ bankAccountName: e.target.value })}
            placeholder={t.placeholders.bankAccountName}
            maxLength={200}
            required
          />
          {errors?.bankAccountName ? (
            <p className={errorTextClass}>{errors.bankAccountName}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="radio"
              name={`bankAccountsPrimaryRadio`}
              checked={row.isPrimary}
              onChange={() => onSetPrimary()}
              disabled={!row.isActive}
            />
            {t.fields.isPrimary}
          </label>
          {/*
            We render the value via a hidden input — controlled radios above
            handle UX, but since only ONE row can be checked the FormData
            would otherwise lose the others' isPrimary=false. Hidden inputs
            are explicit per row.
          */}
          <input
            type="hidden"
            name={`bankAccounts[${index}].isPrimary`}
            value={row.isPrimary ? "true" : ""}
          />
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={row.isActive}
              onChange={(e) => onChange({ isActive: e.target.checked })}
            />
            {t.fields.isActive}
          </label>
          <input
            type="hidden"
            name={`bankAccounts[${index}].isActive`}
            value={row.isActive ? "true" : ""}
          />
        </div>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-red-600 underline-offset-2 hover:underline dark:text-red-400"
          >
            {t.actions.removeBankAccount}
          </button>
        ) : null}
      </div>
      {errors?.isPrimary ? (
        <p className={errorTextClass}>{errors.isPrimary}</p>
      ) : null}
      {errors?.isActive ? (
        <p className={errorTextClass}>{errors.isActive}</p>
      ) : null}
    </div>
  );
}
