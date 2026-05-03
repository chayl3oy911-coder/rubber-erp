"use client";

import { useTransition } from "react";

import {
  setReceivingEntityDefaultAction,
  toggleReceivingEntityActiveAction,
} from "@/modules/receivingAccount/actions";
import type { ReceivingEntityDTO } from "@/modules/receivingAccount/dto";
import { receivingAccountT } from "@/modules/receivingAccount/i18n";

const t = receivingAccountT();

const ghostButtonClass =
  "inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

const dangerButtonClass =
  "inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-red-300 bg-white px-3 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-950";

const successButtonClass =
  "inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-emerald-300 bg-white px-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-700 dark:bg-zinc-900 dark:text-emerald-300 dark:hover:bg-emerald-950";

export function ReceivingActionsRow({
  entity,
  canEdit,
  canDeactivate,
}: {
  entity: ReceivingEntityDTO;
  canEdit: boolean;
  canDeactivate: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function onSetDefault(next: boolean) {
    if (!canEdit) return;
    if (
      !next &&
      !window.confirm(
        next
          ? t.actions.setDefault
          : t.errors.defaultReassignRequired,
      )
    ) {
      // Currently the only "next=false" path is unsetting; we still ask
      // for confirmation since this empties out the workspace's default.
      // A better UX is the long-form re-assign flow but for Step 10 we
      // keep parity with the existing customer module.
    }
    startTransition(async () => {
      await setReceivingEntityDefaultAction(entity.id, next);
    });
  }

  function onToggleActive(next: boolean) {
    if (!canDeactivate) return;
    const confirmMsg = next ? t.actions.activate : t.actions.deactivate;
    if (!window.confirm(confirmMsg)) return;
    startTransition(async () => {
      await toggleReceivingEntityActiveAction(entity.id, next);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canEdit && entity.isActive ? (
        entity.isDefault ? (
          <button
            type="button"
            onClick={() => onSetDefault(false)}
            disabled={isPending}
            className={ghostButtonClass}
          >
            {t.badges.default} ✓
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onSetDefault(true)}
            disabled={isPending}
            className={successButtonClass}
          >
            {t.actions.setDefault}
          </button>
        )
      ) : null}
      {canDeactivate ? (
        entity.isActive ? (
          <button
            type="button"
            onClick={() => onToggleActive(false)}
            disabled={isPending}
            className={dangerButtonClass}
          >
            {t.actions.deactivate}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onToggleActive(true)}
            disabled={isPending}
            className={successButtonClass}
          >
            {t.actions.activate}
          </button>
        )
      ) : null}
    </div>
  );
}
