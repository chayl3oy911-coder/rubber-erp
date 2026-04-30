"use client";

import { useState } from "react";

import { transitionSalesStatusAction } from "@/modules/sales/actions";
import type { SalesOrderDTO } from "@/modules/sales/dto";
import { salesT } from "@/modules/sales/i18n";

const t = salesT();

const buttonBase =
  "inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

const variantClasses = {
  primary:
    "bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:ring-emerald-600",
  secondary:
    "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800",
  danger:
    "bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-600",
} as const;

type Props = {
  sale: SalesOrderDTO;
  canConfirm: boolean;
  canCancel: boolean;
};

export function StatusActions({ sale, canConfirm, canCancel }: Props) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  if (sale.status === "CANCELLED") return null;

  const isDraft = sale.status === "DRAFT";
  const isConfirmed = sale.status === "CONFIRMED";

  // For CONFIRMED → CANCELLED a non-empty reason is required by the
  // service. Native `required` on the textarea is the first line of defence
  // (server validates again).
  const reasonRequired = isConfirmed;

  const confirmAction = transitionSalesStatusAction.bind(
    null,
    sale.id,
    "CONFIRMED",
  );
  const cancelAction = transitionSalesStatusAction.bind(
    null,
    sale.id,
    "CANCELLED",
  );

  // Used for DRAFT → CONFIRMED. native confirm() before submit so the user
  // can back out from a destructive action.
  function onSubmitConfirm(e: React.FormEvent<HTMLFormElement>): void {
    const ok = window.confirm(t.actions.confirmConfirm(sale.salesNo));
    if (!ok) e.preventDefault();
  }

  // Used for DRAFT → CANCELLED (no reason needed).
  function onSubmitCancelDraft(e: React.FormEvent<HTMLFormElement>): void {
    const ok = window.confirm(t.actions.confirmCancelPrompt(sale.salesNo));
    if (!ok) e.preventDefault();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {isDraft && canConfirm ? (
          <form action={confirmAction} onSubmit={onSubmitConfirm}>
            <button
              type="submit"
              className={`${buttonBase} ${variantClasses.primary}`}
            >
              {t.actions.confirm}
            </button>
          </form>
        ) : null}

        {isDraft && canCancel ? (
          <form action={cancelAction} onSubmit={onSubmitCancelDraft}>
            <button
              type="submit"
              className={`${buttonBase} ${variantClasses.danger}`}
            >
              {t.actions.cancel}
            </button>
          </form>
        ) : null}

        {isConfirmed && canCancel ? (
          <button
            type="button"
            onClick={() => setCancelOpen((v) => !v)}
            className={`${buttonBase} ${variantClasses.danger}`}
          >
            {t.actions.cancel}
          </button>
        ) : null}
      </div>

      {isConfirmed && canCancel && cancelOpen ? (
        <form
          action={cancelAction}
          className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-500/30 dark:bg-red-500/10"
        >
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            {t.actions.confirmCancelPrompt(sale.salesNo)}
          </p>
          <p className="text-xs text-red-700 dark:text-red-300">
            {t.hints.cancelReversesStock}
          </p>
          <label
            htmlFor="cancelReason"
            className="text-sm font-medium text-red-800 dark:text-red-200"
          >
            {t.fields.cancelReason}
            {reasonRequired ? <span className="text-red-600"> *</span> : null}
          </label>
          <textarea
            id="cancelReason"
            name="cancelReason"
            rows={2}
            placeholder={t.placeholders.cancelReason}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            required={reasonRequired}
            maxLength={500}
            className="w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:border-red-500/40 dark:bg-zinc-900 dark:text-zinc-50"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={reasonRequired && cancelReason.trim().length === 0}
              className={`${buttonBase} ${variantClasses.danger}`}
            >
              {t.actions.cancelConfirm}
            </button>
            <button
              type="button"
              onClick={() => {
                setCancelOpen(false);
                setCancelReason("");
              }}
              className={`${buttonBase} ${variantClasses.secondary}`}
            >
              {t.actions.back}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
