"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { ReceivingEntityDTO } from "@/modules/receivingAccount/dto";
import { receivingAccountT } from "@/modules/receivingAccount/i18n";
import { salesT } from "@/modules/sales/i18n";
import { bankLabel } from "@/shared/banks";
import { Label } from "@/shared/ui";

const ra = receivingAccountT();
const t = salesT();

const inputClass =
  "h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

const errorTextClass = "text-xs text-red-600 dark:text-red-400";

export type ReceivingAccountPickerProps = {
  /**
   * Pre-filtered list of receiving entities the actor can pick from. The
   * parent server component is responsible for fetching this with branch
   * scope already applied (own branches + company-wide entries).
   */
  entities: ReadonlyArray<ReceivingEntityDTO>;
  /**
   * Current sales-form branch. Used to narrow entity options on the fly
   * when the user switches branch in the create form (which kept lines
   * empty already — same gesture should reset receiving so the snapshot
   * matches the picked branch).
   */
  branchId: string;
  /**
   * Initial selection when the form re-mounts after a server validation
   * error. Both must be present for the picker to lock onto a row.
   */
  initialEntityId?: string;
  initialBankAccountId?: string;
  /** Server-computed error for the entity field (validation/scope). */
  entityFieldError?: string;
  /** Server-computed error for the bank-account field. */
  bankAccountFieldError?: string;
  /**
   * Locked = the form is read-only here (CONFIRMED sale). The picker
   * still renders the snapshot read-only.
   */
  locked?: boolean;
};

function entityVisibleInBranch(
  e: ReceivingEntityDTO,
  branchId: string,
): boolean {
  if (!e.isActive) return false;
  if (e.branchId === null) return true;
  return e.branchId === branchId;
}

/**
 * Pick the row to default to when the user hasn't explicitly chosen yet.
 * Matches the server-side `resolveDefaultReceivingForSale` heuristic so
 * what the user sees is what the server will write:
 *   1. branch-scoped default for `branchId`
 *   2. company-wide default
 *   3. first active entity with at least one active bank account
 */
function pickDefault(
  entities: ReadonlyArray<ReceivingEntityDTO>,
  branchId: string,
): { entityId: string; bankAccountId: string } | null {
  const visible = entities.filter((e) => entityVisibleInBranch(e, branchId));
  const branchDefault = visible.find(
    (e) => e.isDefault && e.branchId === branchId && e.primaryBankAccount,
  );
  const companyDefault = visible.find(
    (e) => e.isDefault && e.branchId === null && e.primaryBankAccount,
  );
  const firstUsable = visible.find((e) => e.primaryBankAccount);
  const chosen = branchDefault ?? companyDefault ?? firstUsable;
  if (!chosen || !chosen.primaryBankAccount) return null;
  return {
    entityId: chosen.id,
    bankAccountId: chosen.primaryBankAccount.id,
  };
}

export function ReceivingAccountPicker({
  entities,
  branchId,
  initialEntityId,
  initialBankAccountId,
  entityFieldError,
  bankAccountFieldError,
  locked = false,
}: ReceivingAccountPickerProps) {
  const visibleEntities = useMemo(
    () => entities.filter((e) => entityVisibleInBranch(e, branchId)),
    [entities, branchId],
  );

  // ── Selection model ────────────────────────────────────────────────
  // We avoid `useEffect`-driven resets (those cause cascading renders in
  // React 19) by storing only the user's explicit choice in state. The
  // effective selection is then *derived* from the current state, the
  // current branch's visible entities, and the form's initial values.
  // When the user hasn't touched the picker yet (`userPick` is null),
  // we fall back to either the post-error initial values or the default
  // heuristic — both already reactive to the branchId change.
  type Pick = { entityId: string; bankAccountId: string };
  const [userPick, setUserPick] = useState<Pick | null>(() => {
    if (
      initialEntityId &&
      initialBankAccountId &&
      visibleEntities.some(
        (e) =>
          e.id === initialEntityId &&
          e.bankAccounts.some(
            (a) => a.id === initialBankAccountId && a.isActive,
          ),
      )
    ) {
      return {
        entityId: initialEntityId,
        bankAccountId: initialBankAccountId,
      };
    }
    return null;
  });

  // Effective entityId/bankAccountId — derived, not effected.
  const { entityId, bankAccountId, selectedEntity, bankOptions, selectedBank } =
    useMemo(() => {
      const fallback = pickDefault(visibleEntities, branchId);
      // 1. user explicitly picked → honour if still valid
      let pickEntityId = userPick?.entityId ?? "";
      let pickBankId = userPick?.bankAccountId ?? "";

      const isPickValid =
        pickEntityId !== "" &&
        visibleEntities.some(
          (e) =>
            e.id === pickEntityId &&
            e.bankAccounts.some(
              (a) => a.id === pickBankId && a.isActive,
            ),
        );
      if (!isPickValid) {
        // 2. no explicit pick (or pick is stale because branch changed)
        //    → fall back to default heuristic
        pickEntityId = fallback?.entityId ?? "";
        pickBankId = fallback?.bankAccountId ?? "";
      }
      const sel = visibleEntities.find((e) => e.id === pickEntityId) ?? null;
      const banks = sel
        ? sel.bankAccounts.filter((a) => a.isActive)
        : [];
      const selBank = banks.find((a) => a.id === pickBankId) ?? null;
      return {
        entityId: pickEntityId,
        bankAccountId: pickBankId,
        selectedEntity: sel,
        bankOptions: banks,
        selectedBank: selBank,
      };
    }, [visibleEntities, branchId, userPick]);

  // ── Event handlers (the only paths that set state) ──────────────────
  function onPickEntity(nextEntityId: string) {
    if (locked) return;
    if (nextEntityId === "") {
      setUserPick({ entityId: "", bankAccountId: "" });
      return;
    }
    const ent = visibleEntities.find((e) => e.id === nextEntityId);
    const banks = ent
      ? ent.bankAccounts.filter((a) => a.isActive)
      : [];
    const nextBankId =
      banks.find((a) => a.isPrimary)?.id ?? banks[0]?.id ?? "";
    setUserPick({ entityId: nextEntityId, bankAccountId: nextBankId });
  }

  function onPickBank(nextBankId: string) {
    if (locked) return;
    setUserPick({
      entityId,
      bankAccountId: nextBankId,
    });
  }

  const noUsableEntity = visibleEntities.length === 0;

  return (
    <section className="flex flex-col gap-3">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {t.misc.receivingSectionTitle}
        </h3>
        {!locked ? (
          <Link
            href="/settings/receiving-accounts"
            className="text-xs font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
          >
            {ra.actions.goToSettings}
          </Link>
        ) : null}
      </header>

      {noUsableEntity ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          {t.misc.receivingMissingCta}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="receivingEntityId">{t.fields.receivingEntity}</Label>
          <select
            id="receivingEntityId"
            name="receivingEntityId"
            value={entityId}
            onChange={(e) => onPickEntity(e.target.value)}
            className={inputClass}
            disabled={locked || noUsableEntity}
            required={!noUsableEntity}
          >
            <option value="">—</option>
            {visibleEntities.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
                {e.branchId === null ? ` · ${ra.badges.companyWide}` : ""}
                {e.isDefault ? ` · ${ra.badges.default}` : ""}
              </option>
            ))}
          </select>
          {entityFieldError ? (
            <p className={errorTextClass}>{entityFieldError}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="receivingBankAccountId">
            {t.fields.receivingBank}
          </Label>
          <select
            id="receivingBankAccountId"
            name="receivingBankAccountId"
            value={bankAccountId}
            onChange={(e) => onPickBank(e.target.value)}
            className={inputClass}
            disabled={locked || noUsableEntity || !selectedEntity}
            required={!noUsableEntity}
          >
            <option value="">—</option>
            {bankOptions.map((a) => {
              const label = bankLabel(a.bankName) ?? a.bankName;
              return (
                <option key={a.id} value={a.id}>
                  {label} · {a.bankAccountNo}
                  {a.isPrimary ? ` · ${ra.badges.primary}` : ""}
                </option>
              );
            })}
          </select>
          {bankAccountFieldError ? (
            <p className={errorTextClass}>{bankAccountFieldError}</p>
          ) : null}
        </div>
      </div>

      {selectedEntity && selectedBank ? (
        <dl className="grid grid-cols-1 gap-x-3 gap-y-1 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300 sm:grid-cols-3">
          <div className="flex items-baseline justify-between gap-2 sm:flex-col sm:items-start">
            <dt className="text-zinc-500 dark:text-zinc-400">
              {t.fields.receivingEntityType}
            </dt>
            <dd className="font-medium text-zinc-900 dark:text-zinc-50">
              {ra.type[selectedEntity.type] ?? selectedEntity.type}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-2 sm:flex-col sm:items-start">
            <dt className="text-zinc-500 dark:text-zinc-400">
              {t.fields.receivingTaxId}
            </dt>
            <dd className="font-mono text-zinc-900 dark:text-zinc-50">
              {selectedEntity.taxId ?? "—"}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-2 sm:flex-col sm:items-start">
            <dt className="text-zinc-500 dark:text-zinc-400">
              {t.fields.receivingBankAccountName}
            </dt>
            <dd className="text-zinc-900 dark:text-zinc-50">
              {selectedBank.bankAccountName}
            </dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}
