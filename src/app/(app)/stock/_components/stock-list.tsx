import Link from "next/link";

import { rubberTypeLabel } from "@/modules/purchase/rubber-types";
import type { StockLotDTO } from "@/modules/stock/dto";
import { stockT } from "@/modules/stock/i18n";
import { Card, CardContent } from "@/shared/ui";

import { LotStatusBadge } from "./lot-status-badge";

const t = stockT();

const detailLinkClass =
  "inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

const detailLinkCompactClass =
  "inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

type Props = {
  lots: StockLotDTO[];
  searchTerm?: string;
  showBranchColumn?: boolean;
};

function formatNumber(s: string, fractionDigits = 2): string {
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

export function StockList({
  lots,
  searchTerm,
  showBranchColumn = true,
}: Props) {
  if (lots.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {searchTerm ? t.empty.noResults(searchTerm) : t.empty.list}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/*
        Card list — used for small AND medium viewports (anything below `lg`).
        Switching to cards earlier (at lg, not sm) keeps the table out of the
        squeezed/scroll-required state on tablets and small laptop windows.
      */}
      <ul className="flex flex-col gap-3 lg:hidden">
        {lots.map((l) => (
          <li key={l.id}>
            <Card>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="whitespace-nowrap font-mono text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                      {l.lotNo}
                    </span>
                    <span className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                      {l.sourceTicket?.customer?.fullName ?? "—"}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {l.sourceTicket
                        ? `${l.sourceTicket.ticketNo}`
                        : "—"}
                      {showBranchColumn && l.branch
                        ? ` · ${l.branch.code}`
                        : ""}
                      {l.sourceTicket?.customer
                        ? ` · ${l.sourceTicket.customer.code}`
                        : ""}
                    </span>
                  </div>
                  <div className="shrink-0">
                    <LotStatusBadge status={l.status} size="sm" />
                  </div>
                </div>
                <dl className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
                  <div className="flex justify-between gap-3">
                    <dt className="min-w-0">{t.fields.rubberType}</dt>
                    <dd className="whitespace-nowrap text-right">
                      {rubberTypeLabel(l.rubberType) ?? l.rubberType}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="min-w-0">{t.fields.initialWeight}</dt>
                    <dd className="whitespace-nowrap text-right tabular-nums">
                      {formatNumber(l.initialWeight, 2)} {t.units.kg}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 font-semibold text-zinc-900 dark:text-zinc-50">
                    <dt className="min-w-0">{t.fields.remainingWeight}</dt>
                    <dd className="whitespace-nowrap text-right tabular-nums">
                      {formatNumber(l.remainingWeight, 2)} {t.units.kg}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="min-w-0">{t.fields.initialCostPerKg}</dt>
                    <dd className="whitespace-nowrap text-right tabular-nums">
                      {formatNumber(l.initialCostPerKg, 2)}{" "}
                      {t.units.bahtPerKg}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="min-w-0">{t.fields.initialCostAmount}</dt>
                    <dd className="whitespace-nowrap text-right tabular-nums">
                      {formatNumber(l.initialCostAmount, 2)} {t.units.baht}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 font-semibold text-zinc-900 dark:text-zinc-50">
                    <dt className="min-w-0">{t.fields.costAmount}</dt>
                    <dd className="whitespace-nowrap text-right tabular-nums">
                      {formatNumber(l.costAmount, 2)} {t.units.baht}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 font-semibold text-zinc-900 dark:text-zinc-50">
                    <dt className="min-w-0">{t.fields.effectiveCostPerKg}</dt>
                    <dd className="whitespace-nowrap text-right tabular-nums">
                      {formatNumber(l.effectiveCostPerKg, 2)}{" "}
                      {t.units.bahtPerKg}
                    </dd>
                  </div>
                </dl>
                <div className="flex pt-1">
                  <Link href={`/stock/${l.id}`} className={detailLinkClass}>
                    {t.actions.detail}
                  </Link>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      {/*
        Desktop table — `lg` and above only. `min-w-[800px]` keeps columns
        readable; `overflow-x-auto` is fallback for narrow `lg` viewports.
      */}
      <div className="hidden overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm lg:block dark:border-zinc-800 dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="whitespace-nowrap px-4 py-3">
                  {t.fields.lotNo}
                </th>
                {showBranchColumn ? (
                  <th className="whitespace-nowrap px-4 py-3">
                    {t.fields.branch}
                  </th>
                ) : null}
                <th className="whitespace-nowrap px-4 py-3">
                  {t.fields.sourceTicket}
                </th>
                <th className="whitespace-nowrap px-4 py-3">
                  {t.fields.customer}
                </th>
                <th className="whitespace-nowrap px-4 py-3">
                  {t.fields.rubberType}
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right">
                  {t.fields.initialWeight}
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right">
                  {t.fields.remainingWeight}
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right">
                  {t.fields.initialCostPerKg}
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right">
                  {t.fields.costAmount}
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right">
                  {t.fields.effectiveCostPerKg}
                </th>
                <th className="whitespace-nowrap px-4 py-3">
                  {t.fields.status}
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right">
                  {t.fields.actions}
                </th>
              </tr>
            </thead>
            <tbody>
              {lots.map((l) => (
                <tr
                  key={l.id}
                  className="border-t border-zinc-200 dark:border-zinc-800"
                >
                  <td className="whitespace-nowrap px-4 py-3 font-mono font-medium text-emerald-700 dark:text-emerald-400">
                    {l.lotNo}
                  </td>
                  {showBranchColumn ? (
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {l.branch ? l.branch.code : "—"}
                    </td>
                  ) : null}
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    {l.sourceTicket?.ticketNo ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-900 dark:text-zinc-50">
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {l.sourceTicket?.customer?.fullName ?? "—"}
                      </span>
                      {l.sourceTicket?.customer ? (
                        <span className="whitespace-nowrap text-xs text-zinc-500 dark:text-zinc-400">
                          {l.sourceTicket.customer.code}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {rubberTypeLabel(l.rubberType) ?? l.rubberType}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-zinc-50">
                    {formatNumber(l.initialWeight, 2)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums font-semibold text-zinc-900 dark:text-zinc-50">
                    {formatNumber(l.remainingWeight, 2)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-600 dark:text-zinc-400">
                    {formatNumber(l.initialCostPerKg, 2)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-zinc-50">
                    {formatNumber(l.costAmount, 2)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums font-semibold text-zinc-900 dark:text-zinc-50">
                    {formatNumber(l.effectiveCostPerKg, 2)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <LotStatusBadge status={l.status} size="sm" />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex justify-end">
                      <Link
                        href={`/stock/${l.id}`}
                        className={detailLinkCompactClass}
                      >
                        {t.actions.detail}
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
