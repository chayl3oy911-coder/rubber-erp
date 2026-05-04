import Link from "next/link";
import { notFound } from "next/navigation";

import { purchaseReturnT } from "@/modules/purchase-return/i18n";
import {
  PurchaseReturnBranchMismatchError,
  PurchaseReturnNotFoundError,
  getPurchaseReturnById,
} from "@/modules/purchase-return/service";
import { purchaseReturnReasonLabel } from "@/modules/purchase-return/types";
import { hasPermission, requirePermission } from "@/shared/auth/dal";
import { Card, CardContent } from "@/shared/ui";

import { PurchaseReturnDetailActions } from "../_components/return-detail-actions";
import { PurchaseReturnStatusBadge } from "../_components/return-status-badge";

const t = purchaseReturnT();

function formatNumber(s: string, fractionDigits = 2): string {
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function PurchaseReturnDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await requirePermission("purchase.return.read");
  const { id } = await params;

  let row;
  try {
    row = await getPurchaseReturnById(me, id);
  } catch (error) {
    if (
      error instanceof PurchaseReturnNotFoundError ||
      error instanceof PurchaseReturnBranchMismatchError
    ) {
      notFound();
    }
    throw error;
  }

  const canConfirm =
    row.status === "DRAFT" && hasPermission(me, "purchase.return.confirm");
  const canCancel =
    row.status === "DRAFT" && hasPermission(me, "purchase.return.cancel");
  const showActions = canConfirm || canCancel;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <Link
          href="/purchase-returns"
          className="text-sm text-emerald-700 hover:underline dark:text-emerald-400"
        >
          {t.buttons.backToList}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {row.returnNo}
          </h1>
          <PurchaseReturnStatusBadge status={row.status} size="md" />
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t.page.detailTitle}
        </p>
      </header>

      {showActions ? (
        <Card>
          <CardContent>
            <PurchaseReturnDetailActions
              returnId={row.id}
              returnNo={row.returnNo}
              canConfirm={canConfirm}
              canCancel={canCancel}
            />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              ข้อมูลใบรับซื้อ / Stock Lot
            </h2>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
              <Field
                label={t.fields.purchaseTicket}
                value={
                  row.purchaseTicket?.ticketNo ?? row.ticketNoSnapshot ?? "—"
                }
                href={
                  row.purchaseTicket?.id
                    ? `/purchases/${row.purchaseTicket.id}`
                    : null
                }
                mono
              />
              <Field
                label={t.fields.stockLot}
                value={row.stockLot?.lotNo ?? row.lotNoSnapshot ?? "—"}
                href={
                  row.stockLot?.id ? `/stock/${row.stockLot.id}` : null
                }
                mono
              />
              <Field
                label={t.fields.customer}
                value={
                  row.purchaseTicket?.customerName ??
                  row.customerNameSnapshot ??
                  "—"
                }
              />
              <Field
                label={t.fields.branch}
                value={row.branch ? `${row.branch.code} · ${row.branch.name}` : "—"}
              />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              เหตุผลและน้ำหนัก
            </h2>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
              <Field
                label={t.fields.reasonType}
                value={purchaseReturnReasonLabel(row.returnReasonType)}
              />
              <Field
                label={t.fields.returnWeight}
                value={`${formatNumber(row.returnWeight, 2)} กก.`}
                mono
              />
              <Field
                label={t.fields.returnCostAmount}
                value={`${formatNumber(row.returnCostAmount, 2)} บาท`}
                mono
              />
              <Field
                label={t.fields.refundStatus}
                value={t.refundStatus[row.refundStatus as keyof typeof t.refundStatus] ?? row.refundStatus}
              />
            </dl>
            {row.returnReasonNote ? (
              <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                <span className="font-medium">{t.fields.reasonNote}:</span>{" "}
                {row.returnReasonNote}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            ประวัติเอกสาร
          </h2>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <Field
              label={t.fields.createdAt}
              value={formatDateTime(row.createdAt)}
            />
            <Field
              label={t.fields.createdBy}
              value={row.createdBy?.displayName ?? "—"}
            />
            <Field
              label={t.fields.confirmedAt}
              value={formatDateTime(row.confirmedAt)}
            />
            <Field
              label={t.fields.confirmedBy}
              value={row.confirmedBy?.displayName ?? "—"}
            />
            {row.cancelledAt || row.cancelReason ? (
              <>
                <Field
                  label={t.fields.cancelledAt}
                  value={formatDateTime(row.cancelledAt)}
                />
                <Field
                  label={t.fields.cancelledBy}
                  value={row.cancelledBy?.displayName ?? "—"}
                />
                <div className="sm:col-span-2 lg:col-span-4">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {t.fields.cancelReason}:
                  </span>{" "}
                  <span className="text-zinc-900 dark:text-zinc-50">
                    {row.cancelReason ?? "—"}
                  </span>
                </div>
              </>
            ) : null}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  href,
  mono,
}: {
  label: string;
  value: string;
  href?: string | null;
  mono?: boolean;
}) {
  const valueClass = `${
    mono ? "font-mono " : ""
  }text-zinc-900 dark:text-zinc-50`;
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className={valueClass}>
        {href ? (
          <Link
            href={href}
            className="text-emerald-700 hover:underline dark:text-emerald-400"
          >
            {value}
          </Link>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
