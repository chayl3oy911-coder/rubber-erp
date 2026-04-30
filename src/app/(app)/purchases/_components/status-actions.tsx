"use client";

import { useState } from "react";

import { transitionPurchaseStatusAction } from "@/modules/purchase/actions";
import { purchaseT } from "@/modules/purchase/i18n";
import {
  cancelReasonRequired,
  planTransition,
  type PurchaseStatus,
} from "@/modules/purchase/status";

const t = purchaseT();

type Props = {
  purchaseId: string;
  status: PurchaseStatus;
  permissions: {
    canUpdate: boolean;
    canApprove: boolean;
    canCancel: boolean;
  };
};

const TARGETS: ReadonlyArray<PurchaseStatus> = [
  "WAITING_QC",
  "WAITING_APPROVAL",
  "APPROVED",
  "CANCELLED",
];

const buttonBase =
  "inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

const variantClasses: Record<string, string> = {
  primary:
    "bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:ring-emerald-600",
  secondary:
    "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800",
  approve:
    "bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:ring-emerald-600",
  danger:
    "bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-600",
};

export function StatusActions({ purchaseId, status, permissions }: Props) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const reasonRequired = cancelReasonRequired(status);
  const cancelDisabled = reasonRequired && cancelReason.trim().length === 0;

  function actionFor(to: PurchaseStatus) {
    return transitionPurchaseStatusAction.bind(null, purchaseId, to);
  }

  function permissionAllows(to: PurchaseStatus): boolean {
    if (to === "APPROVED") return permissions.canApprove;
    if (to === "CANCELLED") return permissions.canCancel;
    return permissions.canUpdate;
  }

  const buttons = TARGETS.flatMap((to) => {
    const plan = planTransition(status, to);
    if (!plan) return [];
    if (!permissionAllows(to)) return [];
    return [{ to, plan }];
  });

  if (buttons.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {buttons.map(({ to, plan }) => {
          if (to === "CANCELLED") {
            return (
              <button
                key={to}
                type="button"
                onClick={() => setCancelOpen((v) => !v)}
                className={`${buttonBase} ${variantClasses.danger}`}
              >
                {t.actions.cancel}
              </button>
            );
          }
          const variant =
            plan.action === "approve" ? "approve" : "primary";
          const label =
            to === "WAITING_QC"
              ? t.actions.submitForQC
              : to === "WAITING_APPROVAL"
                ? t.actions.submitForApproval
                : t.actions.approve;
          return (
            <form key={to} action={actionFor(to)}>
              <button
                type="submit"
                className={`${buttonBase} ${variantClasses[variant]}`}
              >
                {label}
              </button>
            </form>
          );
        })}
      </div>

      {cancelOpen ? (
        <form
          action={actionFor("CANCELLED")}
          className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-500/30 dark:bg-red-500/10"
        >
          <label
            htmlFor="cancelReason"
            className="text-sm font-medium text-red-800 dark:text-red-300"
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
              disabled={cancelDisabled}
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
