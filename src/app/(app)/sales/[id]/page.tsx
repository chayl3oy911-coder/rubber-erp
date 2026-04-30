import Link from "next/link";
import { notFound } from "next/navigation";

import { salesT } from "@/modules/sales/i18n";
import {
  getSalesOrder,
  listMovementsForSale,
} from "@/modules/sales/service";
import { hasPermission, requirePermission } from "@/shared/auth/dal";
import { Card, CardContent } from "@/shared/ui";

import { SaleTypeBadge } from "../_components/sale-type-badge";
import { SalesMovementList } from "../_components/sales-movement-list";
import { SalesStatusBadge } from "../_components/sales-status-badge";
import { StatusActions } from "../_components/status-actions";

const t = salesT();

const ghostLinkClass =
  "inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

const editLinkClass =
  "inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-500";

function formatNumber(s: string, fractionDigits = 2): string {
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

function formatDateTime(iso: string | null | undefined): string {
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

function formatDateOnly(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function SalesDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const me = await requirePermission("sales.read");
  const { id } = await params;
  const sp = await searchParams;
  const errorBanner = (() => {
    const raw = sp.error;
    if (Array.isArray(raw)) return raw[0];
    return raw;
  })();

  const sale = await getSalesOrder(me, id);
  if (!sale) notFound();

  const movements = await listMovementsForSale(me, sale.id, {
    page: 1,
    pageSize: 100,
  });

  const canEdit = hasPermission(me, "sales.create");
  const canConfirm = hasPermission(me, "sales.confirm");
  const canCancel = hasPermission(me, "sales.cancel");

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              {sale.salesNo}
            </span>
            <SalesStatusBadge status={sale.status} size="sm" />
            <SaleTypeBadge type={sale.saleType} size="sm" />
            {!sale.isActive ? (
              <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                inactive
              </span>
            ) : null}
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {sale.buyerName}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {sale.branch ? `${sale.branch.code} · ${sale.branch.name}` : "—"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/sales" className={ghostLinkClass}>
            {t.actions.back}
          </Link>
          {canEdit && sale.status !== "CANCELLED" ? (
            <Link href={`/sales/${sale.id}/edit`} className={editLinkClass}>
              {t.actions.edit}
            </Link>
          ) : null}
        </div>
      </header>

      {errorBanner ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {errorBanner}
        </p>
      ) : null}

      <StatusActions sale={sale} canConfirm={canConfirm} canCancel={canCancel} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Sale + lot info */}
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {t.page.detailTitle}
            </h2>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <Field label={t.fields.sourceLot}>
                {sale.sourceLot ? (
                  <Link
                    href={`/stock/${sale.sourceLot.id}`}
                    className="font-mono text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    {sale.sourceLot.lotNo}
                  </Link>
                ) : (
                  "—"
                )}
                {sale.sourceLot?.sourceTicket ? (
                  <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                    ← {sale.sourceLot.sourceTicket.ticketNo}
                  </span>
                ) : null}
              </Field>
              <Field label={t.fields.rubberType}>{sale.rubberType}</Field>
              <Field label={t.fields.grossWeight}>
                {formatNumber(sale.grossWeight, 2)} {t.units.kg}
              </Field>
              <Field label={t.fields.drcPercent}>
                {formatNumber(sale.drcPercent, 2)} {t.units.percent}
              </Field>
              <Field label={t.fields.drcWeight}>
                {formatNumber(sale.drcWeight, 2)} {t.units.kg}
              </Field>
              <Field label={t.fields.pricePerKg}>
                {formatNumber(sale.pricePerKg, 4)} {t.units.bahtPerKg}
              </Field>
              <Field label={t.fields.expectedReceiveDate}>
                {formatDateOnly(sale.expectedReceiveDate)}
              </Field>
              <Field label={t.fields.note}>{sale.note ?? "—"}</Field>
            </dl>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t.misc.documentReadyHint}
            </p>
          </CardContent>
        </Card>

        {/* Snapshot */}
        <Card>
          <CardContent className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {t.misc.salesSnapshotTitle}
            </h2>
            <dl className="flex flex-col gap-1.5 text-sm">
              <SnapshotRow
                label={t.fields.grossAmount}
                value={`${formatNumber(sale.grossAmount, 2)} ${t.units.baht}`}
                emphasis
              />
              <SnapshotRow
                label={`${t.fields.withholdingTaxPercent} (${formatNumber(
                  sale.withholdingTaxPercent,
                  2,
                )} ${t.units.percent})`}
                value={`− ${formatNumber(sale.withholdingTaxAmount, 2)} ${t.units.baht}`}
                muted
              />
              <SnapshotRow
                label={t.fields.netReceivableAmount}
                value={`${formatNumber(sale.netReceivableAmount, 2)} ${t.units.baht}`}
                accent="emerald"
                divider
                emphasis
              />
              <SnapshotRow
                label={t.fields.costAmount}
                value={`${formatNumber(sale.costAmount, 2)} ${t.units.baht}`}
                muted
                divider
              />
              <SnapshotRow
                label={t.fields.profitAmount}
                value={`${formatNumber(sale.profitAmount, 2)} ${t.units.baht}`}
                emphasis
              />
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Audit summary */}
      <Card>
        <CardContent className="flex flex-col gap-2 text-sm">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Audit
          </h2>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
            <Field label={t.fields.createdAt}>
              {formatDateTime(sale.createdAt)}
            </Field>
            <Field label={t.fields.createdBy}>
              {sale.createdBy?.displayName ?? "—"}
            </Field>
            <Field label={t.fields.confirmedAt}>
              {formatDateTime(sale.confirmedAt)}
            </Field>
            <Field label={t.fields.confirmedBy}>
              {sale.confirmedBy?.displayName ?? "—"}
            </Field>
            <Field label={t.fields.cancelledAt}>
              {formatDateTime(sale.cancelledAt)}
            </Field>
            <Field label={t.fields.cancelledBy}>
              {sale.cancelledBy?.displayName ?? "—"}
            </Field>
            {sale.cancelReason ? (
              <Field label={t.fields.cancelReason} fullWidth>
                {sale.cancelReason}
              </Field>
            ) : null}
          </dl>
        </CardContent>
      </Card>

      {/* Movement history */}
      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          {t.misc.movementHistoryTitle}
        </h2>
        <SalesMovementList movements={movements?.movements ?? []} />
      </section>
    </div>
  );
}

function Field({
  label,
  children,
  fullWidth = false,
}: {
  label: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? "sm:col-span-2" : undefined}>
      <dt className="text-xs text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="text-zinc-900 tabular-nums dark:text-zinc-50">
        {children}
      </dd>
    </div>
  );
}

function SnapshotRow({
  label,
  value,
  muted = false,
  emphasis = false,
  accent,
  divider = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
  emphasis?: boolean;
  accent?: "emerald";
  divider?: boolean;
}) {
  const colorClass =
    accent === "emerald"
      ? "text-emerald-700 dark:text-emerald-300"
      : muted
        ? "text-zinc-600 dark:text-zinc-400"
        : "text-zinc-900 dark:text-zinc-50";
  const fontClass = emphasis ? "font-semibold" : "";
  return (
    <div
      className={`flex justify-between gap-3 ${
        divider ? "border-t border-zinc-200 pt-2 dark:border-zinc-800" : ""
      }`}
    >
      <dt
        className={`min-w-0 ${
          muted
            ? "text-zinc-500 dark:text-zinc-400"
            : "text-zinc-700 dark:text-zinc-300"
        }`}
      >
        {label}
      </dt>
      <dd
        className={`whitespace-nowrap text-right tabular-nums ${colorClass} ${fontClass}`}
      >
        {value}
      </dd>
    </div>
  );
}
