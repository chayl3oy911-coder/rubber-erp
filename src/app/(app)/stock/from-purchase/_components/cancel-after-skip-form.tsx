"use client";

import { purchaseT } from "@/modules/purchase/i18n";
import { Button } from "@/shared/ui";

const t = purchaseT();

const REASON_MIN = 5;
const REASON_MAX = 500;

type Props = {
  reason: string;
  onReasonChange: (next: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isBusy: boolean;
};

/**
 * Inline reason form for "Cancel ticket after skip" (Step 12 / Case A).
 *
 * Visually mirrors the SKIP form but in a different colour family (red,
 * not amber) so the operator can tell at a glance which terminal action
 * they are about to take. Reason is required (min 5 chars after trim);
 * the submit button stays disabled until that threshold is met or while
 * a request is in flight.
 */
export function CancelAfterSkipForm({
  reason,
  onReasonChange,
  onSubmit,
  onCancel,
  isBusy,
}: Props) {
  const trimmed = reason.trim();
  const submitDisabled = trimmed.length < REASON_MIN || isBusy;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm dark:border-rose-900 dark:bg-rose-950/40">
      <p className="text-xs text-rose-900 dark:text-rose-100">
        {t.actions.cancelAfterSkipHint}
      </p>
      <label className="flex flex-col gap-1">
        <span className="sr-only">{t.actions.cancelAfterSkip}</span>
        <textarea
          value={reason}
          onChange={(e) => onReasonChange(e.currentTarget.value)}
          rows={3}
          className="resize-y rounded-md border border-rose-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 dark:border-rose-800 dark:bg-zinc-900 dark:text-zinc-100"
          maxLength={REASON_MAX}
          autoFocus
          disabled={isBusy}
        />
        <span className="text-[11px] text-rose-800 dark:text-rose-200">
          ระบุเหตุผลอย่างน้อย {REASON_MIN} ตัวอักษร · {trimmed.length}/{REASON_MAX}
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="danger"
          onClick={onSubmit}
          disabled={submitDisabled}
          aria-disabled={submitDisabled}
        >
          {isBusy ? "กำลังประมวลผล…" : t.actions.cancelAfterSkipConfirm}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={isBusy}
        >
          ยกเลิก
        </Button>
      </div>
    </div>
  );
}
