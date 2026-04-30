import Link from "next/link";
import { notFound } from "next/navigation";

import { purchaseT } from "@/modules/purchase/i18n";
import { rubberTypeLabel } from "@/modules/purchase/rubber-types";
import { getPurchase } from "@/modules/purchase/service";
import { hasPermission, requirePermission } from "@/shared/auth/dal";
import { Card, CardContent } from "@/shared/ui";

import { StatusActions } from "../_components/status-actions";
import { StatusBadge } from "../_components/status-badge";

const t = purchaseT();

const ghostLinkClass =
  "inline-flex h-9 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

const editLinkClass =
  "inline-flex h-9 items-center justify-center rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-500";

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
  return new Date(iso).toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function PurchaseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const me = await requirePermission("purchase.read");
  const { id } = await params;
  const sp = await searchParams;

  const purchase = await getPurchase(me, id);
  if (!purchase) notFound();

  const flashError =
    typeof sp.error === "string"
      ? sp.error
      : Array.isArray(sp.error)
        ? sp.error[0]
        : undefined;

  const canEdit = hasPermission(me, "purchase.update");
  const canApprove = hasPermission(me, "purchase.approve");
  const canCancel = hasPermission(me, "purchase.cancel");

  const editableInThisStatus =
    purchase.status === "DRAFT" || purchase.status === "WAITING_QC";
  const showEditLink = canEdit && editableInThisStatus;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3">
        <Link
          href="/purchases"
          className="text-sm text-emerald-700 hover:underline dark:text-emerald-400"
        >
          {t.actions.back}
        </Link>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              <span className="font-mono text-emerald-700 dark:text-emerald-400">
                {purchase.ticketNo}
              </span>
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {t.page.detailTitle}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={purchase.status} />
            {showEditLink ? (
              <Link
                href={`/purchases/${purchase.id}/edit`}
                className={editLinkClass}
              >
                {t.actions.edit}
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      {flashError ? (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400"
        >
          {flashError}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col gap-5">
            <Section title={t.page.detailTitle}>
              <DetailRow
                label={t.fields.branch}
                value={
                  purchase.branch
                    ? `${purchase.branch.code} – ${purchase.branch.name}`
                    : "—"
                }
              />
              <DetailRow
                label={t.fields.farmer}
                value={
                  purchase.farmer ? (
                    <span>
                      <span className="font-mono text-emerald-700 dark:text-emerald-400">
                        {purchase.farmer.code}
                      </span>
                      <span className="ml-2 font-medium">
                        {purchase.farmer.fullName}
                      </span>
                      {purchase.farmer.phone ? (
                        <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                          {purchase.farmer.phone}
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
              <DetailRow
                label={t.fields.rubberType}
                value={rubberTypeLabel(purchase.rubberType) ?? purchase.rubberType}
              />
              <DetailRow
                label={t.fields.note}
                value={purchase.note ?? "—"}
              />
            </Section>

            <Section title={t.misc.detailComputedHint}>
              <DetailRow
                label={t.fields.grossWeight}
                value={`${formatNumber(purchase.grossWeight, 2)} ${t.units.kg}`}
              />
              <DetailRow
                label={t.fields.tareWeight}
                value={`${formatNumber(purchase.tareWeight, 2)} ${t.units.kg}`}
              />
              <DetailRow
                label={t.fields.netWeight}
                value={`${formatNumber(purchase.netWeight, 2)} ${t.units.kg}`}
                strong
              />
              <DetailRow
                label={t.fields.pricePerKg}
                value={`${formatNumber(purchase.pricePerKg, 4)} ${t.units.bahtPerKg}`}
              />
              <DetailRow
                label={t.fields.totalAmount}
                value={`${formatNumber(purchase.totalAmount, 2)} ${t.units.baht}`}
                strong
              />
              <DetailRow
                label={t.fields.withholdingTaxPercent}
                value={`${formatNumber(purchase.withholdingTaxPercent, 2)} ${t.units.percent}`}
              />
              <DetailRow
                label={t.fields.withholdingTaxAmount}
                value={`${formatNumber(purchase.withholdingTaxAmount, 2)} ${t.units.baht}`}
              />
              <DetailRow
                label={t.fields.netPayableAmount}
                value={`${formatNumber(purchase.netPayableAmount, 2)} ${t.units.baht}`}
                strong
              />
            </Section>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {t.fields.actions}
              </h2>
              <StatusActions
                purchaseId={purchase.id}
                status={purchase.status}
                permissions={{
                  canUpdate: canEdit,
                  canApprove,
                  canCancel,
                }}
              />
              <Link href="/purchases" className={ghostLinkClass}>
                {t.actions.back}
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-3 text-sm">
              <DetailRow
                label={t.fields.createdAt}
                value={formatDateTime(purchase.createdAt)}
              />
              <DetailRow
                label={t.fields.createdBy}
                value={purchase.createdBy?.displayName ?? "—"}
              />
              <DetailRow
                label={t.fields.approvedAt}
                value={formatDateTime(purchase.approvedAt)}
              />
              <DetailRow
                label={t.fields.approvedBy}
                value={purchase.approvedBy?.displayName ?? "—"}
              />
              {purchase.status === "CANCELLED" ? (
                <>
                  <DetailRow
                    label={t.fields.cancelledAt}
                    value={formatDateTime(purchase.cancelledAt)}
                  />
                  <DetailRow
                    label={t.fields.cancelledBy}
                    value={purchase.cancelledBy?.displayName ?? "—"}
                  />
                  <DetailRow
                    label={t.fields.cancelReason}
                    value={purchase.cancelReason ?? "—"}
                  />
                </>
              ) : null}
            </CardContent>
          </Card>

          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {t.misc.documentReadyHint}
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {title}
      </h2>
      <dl className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
        {children}
      </dl>
    </section>
  );
}

function DetailRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 py-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dt className="text-sm text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd
        className={
          strong
            ? "text-sm font-semibold text-zinc-900 sm:text-right dark:text-zinc-50"
            : "text-sm text-zinc-900 sm:text-right dark:text-zinc-50"
        }
      >
        {value}
      </dd>
    </div>
  );
}
