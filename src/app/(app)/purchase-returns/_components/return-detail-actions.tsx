"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { purchaseReturnT } from "@/modules/purchase-return/i18n";
import { Button, useToast } from "@/shared/ui";

const t = purchaseReturnT();

const REASON_MIN = 5;
const REASON_MAX = 500;

type Props = {
  returnId: string;
  returnNo: string;
  canConfirm: boolean;
  canCancel: boolean;
};

/**
 * DRAFT-stage actions: confirm or cancel. Both are guarded by the
 * server-side permission checks (we just hide buttons the actor lacks
 * permission for to keep the UI tidy).
 *
 * Hard double-click protection: a single `submitting` flag disables
 * BOTH buttons and the inline cancel form for the duration of any
 * request, so a frenetic operator cannot fire confirm + cancel
 * concurrently. The server is also defended via FOR UPDATE inside
 * the service.
 */
export function PurchaseReturnDetailActions({
  returnId,
  returnNo,
  canConfirm,
  canCancel,
}: Props) {
  const router = useRouter();
  const toast = useToast();

  const [submitting, setSubmitting] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const onConfirm = async () => {
    if (submitting) return;
    if (
      !window.confirm(
        `ยืนยันการคืน ${returnNo}? การกระทำนี้จะหัก Stock ทันทีและไม่สามารถย้อนกลับได้`,
      )
    ) {
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/purchase-returns/${returnId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        toast.show({
          variant: "error",
          title: "ยืนยันไม่สำเร็จ",
          description: body?.error ?? `HTTP ${res.status}`,
        });
        return;
      }
      toast.show({
        variant: "success",
        title: `ยืนยัน ${returnNo} เรียบร้อย`,
      });
      router.refresh();
    } catch (error) {
      toast.show({
        variant: "error",
        title: "ยืนยันไม่สำเร็จ",
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const onCancelDraft = async () => {
    const reason = cancelReason.trim();
    if (reason.length < REASON_MIN || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/purchase-returns/${returnId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
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
        title: `ยกเลิก ${returnNo} เรียบร้อย`,
      });
      setCancelOpen(false);
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
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {canConfirm ? (
          <Button
            type="button"
            onClick={onConfirm}
            disabled={submitting || cancelOpen}
            aria-disabled={submitting || cancelOpen}
          >
            {submitting && !cancelOpen
              ? "กำลังประมวลผล…"
              : t.buttons.confirm}
          </Button>
        ) : null}
        {canCancel && !cancelOpen ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setCancelOpen(true)}
            disabled={submitting}
            aria-disabled={submitting}
          >
            {t.buttons.cancelDraft}
          </Button>
        ) : null}
      </div>

      <p className="text-xs text-rose-700 dark:text-rose-300">
        {t.hints.confirmIrreversible}
      </p>

      {cancelOpen ? (
        <div className="flex flex-col gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm dark:border-rose-900 dark:bg-rose-950/40">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-rose-900 dark:text-rose-100">
              เหตุผลที่ยกเลิก Draft
            </span>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.currentTarget.value)}
              rows={3}
              maxLength={REASON_MAX}
              className="resize-y rounded-md border border-rose-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 dark:border-rose-800 dark:bg-zinc-900 dark:text-zinc-100"
              autoFocus
              disabled={submitting}
            />
            <span className="text-[11px] text-rose-800 dark:text-rose-200">
              อย่างน้อย {REASON_MIN} ตัวอักษร · {cancelReason.trim().length}/
              {REASON_MAX}
            </span>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="danger"
              onClick={onCancelDraft}
              disabled={cancelReason.trim().length < REASON_MIN || submitting}
              aria-disabled={
                cancelReason.trim().length < REASON_MIN || submitting
              }
            >
              {submitting ? "กำลังประมวลผล…" : "ยืนยันการยกเลิก"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setCancelOpen(false);
                setCancelReason("");
              }}
              disabled={submitting}
            >
              ปิด
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
