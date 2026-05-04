import Link from "next/link";
import { notFound } from "next/navigation";

import { rubberTypeLabel } from "@/modules/purchase/rubber-types";
import { stockT } from "@/modules/stock/i18n";
import { listMovementsForLot, getStockLot } from "@/modules/stock/service";
import { hasPermission, requirePermission } from "@/shared/auth/dal";
import { Card, CardContent } from "@/shared/ui";

import { AdjustmentForm } from "../_components/adjustment-form";
import { LotStatusBadge } from "../_components/lot-status-badge";
import { MovementList } from "../_components/movement-list";
import { StockPagination } from "../_components/pagination";

const t = stockT();

const ghostLinkClass =
  "inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

function formatNumber(s: string, fractionDigits = 2): string {
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DetailRow({
  label,
  children,
  numeric = false,
}: {
  label: string;
  children: React.ReactNode;
  numeric?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-zinc-100 py-2 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-3 dark:border-zinc-800">
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 sm:w-48 sm:shrink-0 dark:text-zinc-400">
        {label}
      </dt>
      <dd
        className={`text-sm text-zinc-900 dark:text-zinc-50 ${
          numeric ? "tabular-nums" : ""
        }`}
      >
        {children}
      </dd>
    </div>
  );
}

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StockDetailPage({ params, searchParams }: Props) {
  const me = await requirePermission("stock.read");
  const { id } = await params;
  const sp = await searchParams;

  const lot = await getStockLot(me, id);
  if (!lot) notFound();

  const pickString = (key: string): string | undefined => {
    const v = sp[key];
    if (Array.isArray(v)) return v[0];
    return v;
  };

  const movementPage = Number(pickString("page") ?? 1);
  const movements = await listMovementsForLot(me, id, {
    page: Number.isFinite(movementPage) && movementPage > 0 ? movementPage : 1,
    pageSize: 20,
  });

  // `getStockLot` already enforced scope; `listMovementsForLot` returning
  // null would imply a race where the lot disappeared — surface as 404.
  if (!movements) notFound();

  const canAdjust = hasPermission(me, "stock.adjust");
  const canCreateReturn = hasPermission(me, "purchase.return.create");
  const isDepleted = lot.status === "DEPLETED";

  // Show "คืนสินค้าให้ผู้ขาย" only for an ACTIVE lot that came from a
  // purchase ticket and still has weight to return.
  const canShowReturnEntry =
    canCreateReturn &&
    lot.isActive &&
    lot.status === "ACTIVE" &&
    Number(lot.remainingWeight) > 0 &&
    !!lot.sourceTicket;

  // Build a baseQuery for movement pagination that strips the page so
  // StockPagination can re-set it. The detail route only paginates one
  // thing (movements), so a single shared `page` param is unambiguous.
  const movementBaseQuery = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k === "page") continue;
    if (Array.isArray(v)) {
      if (v[0]) movementBaseQuery.set(k, v[0]);
    } else if (v) {
      movementBaseQuery.set(k, v);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <Link href="/stock" className="text-sm text-emerald-700 hover:underline dark:text-emerald-400">
            {t.actions.backToList}
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {lot.lotNo}
            </h1>
            <LotStatusBadge status={lot.status} />
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t.page.detailTitle}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {lot.sourceTicket ? (
            <Link
              href={`/purchases/${lot.sourcePurchaseTicketId}`}
              className={ghostLinkClass}
            >
              {t.actions.viewSourceTicket}
            </Link>
          ) : null}
          {canShowReturnEntry ? (
            <Link
              href={`/purchase-returns/new?lotId=${lot.id}`}
              className="inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-lg bg-orange-600 px-3 text-sm font-medium text-white hover:bg-orange-500"
            >
              คืนสินค้าให้ผู้ขาย
            </Link>
          ) : null}
        </div>
      </header>

      <Card>
        <CardContent>
          <dl className="flex flex-col">
            <DetailRow label={t.fields.branch}>
              {lot.branch ? `${lot.branch.code} · ${lot.branch.name}` : "—"}
            </DetailRow>
            <DetailRow label={t.fields.sourceTicket}>
              {lot.sourceTicket ? (
                <Link
                  href={`/purchases/${lot.sourcePurchaseTicketId}`}
                  className="font-mono text-emerald-700 hover:underline dark:text-emerald-400"
                >
                  {lot.sourceTicket.ticketNo}
                </Link>
              ) : (
                "—"
              )}
            </DetailRow>
            <DetailRow label={t.fields.customer}>
              {lot.sourceTicket?.customer
                ? `${lot.sourceTicket.customer.fullName} · ${lot.sourceTicket.customer.code}`
                : "—"}
            </DetailRow>
            <DetailRow label={t.fields.rubberType}>
              {rubberTypeLabel(lot.rubberType) ?? lot.rubberType}
            </DetailRow>
            <DetailRow label={t.fields.initialWeight} numeric>
              {formatNumber(lot.initialWeight, 2)} {t.units.kg}
            </DetailRow>
            <DetailRow label={t.fields.remainingWeight} numeric>
              <span className="text-base font-semibold">
                {formatNumber(lot.remainingWeight, 2)} {t.units.kg}
              </span>
            </DetailRow>
            <DetailRow label={t.fields.initialCostPerKg} numeric>
              {formatNumber(lot.initialCostPerKg, 2)} {t.units.bahtPerKg}
            </DetailRow>
            <DetailRow label={t.fields.initialCostAmount} numeric>
              {formatNumber(lot.initialCostAmount, 2)} {t.units.baht}
            </DetailRow>
            <DetailRow label={t.fields.costAmount} numeric>
              <span className="text-base font-semibold">
                {formatNumber(lot.costAmount, 2)} {t.units.baht}
              </span>
            </DetailRow>
            <DetailRow label={t.fields.effectiveCostPerKg} numeric>
              <span className="text-base font-semibold">
                {formatNumber(lot.effectiveCostPerKg, 2)} {t.units.bahtPerKg}
              </span>
            </DetailRow>
            <DetailRow label={t.fields.createdAt}>
              {formatDateTime(lot.createdAt)}
            </DetailRow>
            <DetailRow label={t.fields.createdBy}>
              {lot.createdBy?.displayName ?? "—"}
            </DetailRow>
          </dl>
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            {t.misc.detailComputedHint}
          </p>
        </CardContent>
      </Card>

      {canAdjust && lot.status !== "CANCELLED" ? (
        <AdjustmentForm
          stockLotId={lot.id}
          remainingWeight={lot.remainingWeight}
          costAmount={lot.costAmount}
          effectiveCostPerKg={lot.effectiveCostPerKg}
          isDepleted={isDepleted}
        />
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          {t.page.movementHistoryTitle}
        </h2>
        <MovementList movements={movements.movements} />
        {movements.total > movements.pageSize ? (
          <StockPagination
            page={movements.page}
            pageSize={movements.pageSize}
            total={movements.total}
            baseQuery={movementBaseQuery}
            basePath={`/stock/${id}`}
          />
        ) : null}
      </section>
    </div>
  );
}
