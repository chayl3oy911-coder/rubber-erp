"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { purchaseT } from "@/modules/purchase/i18n";
import { Button, useToast } from "@/shared/ui";

const t = purchaseT();

const REASON_MIN = 5;
const REASON_MAX = 500;

type Props = {
  purchaseId: string;
  ticketNo: string;
};

/**
 * Inline cancel-after-skip control on the purchase detail page.
 * Identical contract to the form on `/stock/from-purchase?view=skipped`
 * — the operator can cancel from either entry point and end up with
 * the same audit + status transition.
 */
export function PurchaseCancelAfterSkipButton({ purchaseId, ticketNo }: Props) {
  const router = useRouter();
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const trimmed = reason.trim();
  const submitDisabled = trimmed.length < REASON_MIN || submitting;

  const onSubmit = async () => {
    if (submitDisabled) return;
    if (
      !window.confirm(
        `ยืนยันการยกเลิกใบรับซื้อ ${ticketNo}? การกระทำนี้จะเปลี่ยนสถานะเป็น CANCELLED`,
      )
    ) {
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/purchase-tickets/${purchaseId}/cancel-after-skip`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: trimmed }),
        },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        toast.show({
          variant: "error",
          title: "ยกเลิกไม่สำเร็จ",
          description: body?.error ?? `HTTP ${res.status}`,
        });
        return;
      }
      toast.show({
        variant: "success",
        title: `ยกเลิกใบรับซื้อ ${ticketNo} เรียบร้อย`,
      });
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.show({
        variant: "error",
        title: "ยกเลิกไม่สำเร็จ",
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {!open ? (
        <Button
          type="button"
          variant="danger"
          onClick={() => setOpen(true)}
          disabled={submitting}
        >
          {t.actions.cancelAfterSkip}
        </Button>
      ) : (
        <div className="flex flex-col gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm dark:border-rose-900 dark:bg-rose-950/40">
          <p className="text-xs text-rose-900 dark:text-rose-100">
            {t.actions.cancelAfterSkipHint}
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.currentTarget.value)}
            rows={3}
            maxLength={REASON_MAX}
            className="resize-y rounded-md border border-rose-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 dark:border-rose-800 dark:bg-zinc-900 dark:text-zinc-100"
            autoFocus
            disabled={submitting}
          />
          <span className="text-[11px] text-rose-800 dark:text-rose-200">
            อย่างน้อย {REASON_MIN} ตัวอักษร · {trimmed.length}/{REASON_MAX}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="danger"
              onClick={onSubmit}
              disabled={submitDisabled}
            >
              {submitting ? "กำลังประมวลผล…" : t.actions.cancelAfterSkipConfirm}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setReason("");
              }}
              disabled={submitting}
            >
              ปิด
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
