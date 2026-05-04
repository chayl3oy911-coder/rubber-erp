"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { purchaseReturnT } from "@/modules/purchase-return/i18n";
import {
  PURCHASE_RETURN_REASONS,
  type PurchaseReturnReason,
  purchaseReturnReasonLabel,
} from "@/modules/purchase-return/types";
import { Button, Card, CardContent, useToast } from "@/shared/ui";

const t = purchaseReturnT();

type LotInfo = {
  id: string;
  branchCode: string | null;
  lotNo: string;
  rubberType: string;
  remainingWeight: string;
  effectiveCostPerKg: string;
  ticketNo: string | null;
  customerName: string | null;
  customerCode: string | null;
};

type Props = {
  lot: LotInfo;
};

function formatNumber(s: string, fractionDigits = 2): string {
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

/**
 * DRAFT-creation form. Lives at /purchase-returns/new and submits to
 * `POST /api/purchase-returns` with the lot's id baked in.
 *
 * Real-time client-side validation (mirrors the server schema):
 *   - returnWeight > 0 and ≤ lot.remainingWeight
 *   - reason === "OTHER" requires note ≥ 5 chars
 * The "save draft" button stays disabled until both pass.
 */
export function PurchaseReturnDraftForm({ lot }: Props) {
  const router = useRouter();
  const toast = useToast();

  const [returnWeight, setReturnWeight] = useState<string>(lot.remainingWeight);
  const [reason, setReason] = useState<PurchaseReturnReason>("PRODUCT_ISSUE");
  const [note, setNote] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const remaining = Number(lot.remainingWeight);
  const weightNum = Number(returnWeight);

  const errors = useMemo(() => {
    const e: { weight?: string; note?: string } = {};
    if (
      !Number.isFinite(weightNum) ||
      weightNum <= 0 ||
      String(returnWeight).trim() === ""
    ) {
      e.weight = t.errors.weightNotPositive;
    } else if (weightNum > remaining) {
      e.weight = t.errors.weightTooLarge;
    }
    if (reason === "OTHER" && note.trim().length < 5) {
      e.note = t.errors.reasonNoteRequired;
    }
    return e;
  }, [returnWeight, weightNum, reason, note, remaining]);

  const submitDisabled = Object.keys(errors).length > 0 || submitting;

  const remainingAfter = Math.max(0, remaining - (weightNum || 0));

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitDisabled) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/purchase-returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockLotId: lot.id,
          returnReasonType: reason,
          returnReasonNote: reason === "OTHER" ? note.trim() : note.trim() || undefined,
          returnWeight: weightNum,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        toast.show({
          variant: "error",
          title: "ไม่สามารถสร้างเอกสารได้",
          description: body?.error ?? `HTTP ${res.status}`,
        });
        return;
      }
      const data = (await res.json()) as {
        purchaseReturn: { id: string; returnNo: string };
      };
      toast.show({
        variant: "success",
        title: `สร้าง Draft ${data.purchaseReturn.returnNo} เรียบร้อย`,
      });
      router.push(`/purchase-returns/${data.purchaseReturn.id}`);
      router.refresh();
    } catch (error) {
      toast.show({
        variant: "error",
        title: "ไม่สามารถสร้างเอกสารได้",
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="flex flex-col gap-5" onSubmit={onSubmit}>
      <Card>
        <CardContent className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            {t.fields.stockLot}
          </h2>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div className="flex justify-between sm:flex-col sm:gap-1">
              <dt className="text-zinc-500 dark:text-zinc-400">
                {t.fields.stockLot}
              </dt>
              <dd className="font-mono font-semibold text-zinc-900 dark:text-zinc-50">
                {lot.lotNo}
              </dd>
            </div>
            <div className="flex justify-between sm:flex-col sm:gap-1">
              <dt className="text-zinc-500 dark:text-zinc-400">
                {t.fields.purchaseTicket}
              </dt>
              <dd className="font-mono text-zinc-900 dark:text-zinc-50">
                {lot.ticketNo ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between sm:flex-col sm:gap-1">
              <dt className="text-zinc-500 dark:text-zinc-400">
                {t.fields.customer}
              </dt>
              <dd className="text-zinc-900 dark:text-zinc-50">
                {lot.customerName ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between sm:flex-col sm:gap-1">
              <dt className="text-zinc-500 dark:text-zinc-400">น้ำหนักคงเหลือ</dt>
              <dd className="font-mono tabular-nums text-zinc-900 dark:text-zinc-50">
                {formatNumber(lot.remainingWeight, 2)} กก.
              </dd>
            </div>
            <div className="flex justify-between sm:flex-col sm:gap-1">
              <dt className="text-zinc-500 dark:text-zinc-400">
                ต้นทุน/กก. ปัจจุบัน
              </dt>
              <dd className="font-mono tabular-nums text-zinc-900 dark:text-zinc-50">
                {formatNumber(lot.effectiveCostPerKg, 2)} บาท
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {t.fields.reasonType}
            </span>
            <select
              value={reason}
              onChange={(e) =>
                setReason(e.currentTarget.value as PurchaseReturnReason)
              }
              className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              disabled={submitting}
            >
              {PURCHASE_RETURN_REASONS.map((r) => (
                <option key={r} value={r}>
                  {purchaseReturnReasonLabel(r)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {t.fields.reasonNote}
              {reason === "OTHER" ? " *" : ""}
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.currentTarget.value)}
              rows={3}
              maxLength={500}
              className={`resize-y rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 dark:bg-zinc-900 dark:text-zinc-100 ${
                errors.note
                  ? "border-rose-500 text-rose-900 focus:border-rose-500 focus:ring-rose-500 dark:border-rose-600"
                  : "border-zinc-300 text-zinc-900 focus:border-emerald-500 focus:ring-emerald-500 dark:border-zinc-700"
              }`}
              disabled={submitting}
              placeholder={
                reason === "OTHER" ? t.hints.reasonNoteOther : ""
              }
            />
            {errors.note ? (
              <span className="text-xs text-rose-600 dark:text-rose-400">
                {errors.note}
              </span>
            ) : reason === "OTHER" ? (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {t.hints.reasonNoteOther}
              </span>
            ) : null}
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {t.fields.returnWeight}
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={returnWeight}
              onChange={(e) => setReturnWeight(e.currentTarget.value)}
              className={`h-10 rounded-lg border bg-white px-3 text-sm tabular-nums focus:outline-none focus:ring-1 dark:bg-zinc-900 dark:text-zinc-100 ${
                errors.weight
                  ? "border-rose-500 text-rose-900 focus:border-rose-500 focus:ring-rose-500 dark:border-rose-600"
                  : "border-zinc-300 text-zinc-900 focus:border-emerald-500 focus:ring-emerald-500 dark:border-zinc-700"
              }`}
              aria-invalid={Boolean(errors.weight)}
              disabled={submitting}
            />
            {errors.weight ? (
              <span className="text-xs text-rose-600 dark:text-rose-400">
                {errors.weight}
              </span>
            ) : (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {t.hints.weightHint} · เหลือหลังคืน{" "}
                {formatNumber(String(remainingAfter), 2)} กก.
              </span>
            )}
          </label>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={submitting}
        >
          ยกเลิก
        </Button>
        <Button type="submit" disabled={submitDisabled}>
          {submitting ? "กำลังบันทึก…" : t.buttons.saveDraft}
        </Button>
      </div>
    </form>
  );
}
