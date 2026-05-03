import Link from "next/link";

import type { SalesOrderDTO } from "@/modules/sales/dto";
import { salesT } from "@/modules/sales/i18n";
import { Card, CardContent } from "@/shared/ui";

import { SaleTypeBadge } from "./sale-type-badge";
import { SalesStatusBadge } from "./sales-status-badge";

const t = salesT();

const detailLinkClass =
  "inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

const detailLinkCompactClass =
  "inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

type Props = {
  sales: SalesOrderDTO[];
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

function formatDateOnly(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Compact lots column.
 *  - 0 lines → "—"
 *  - 1 line  → "LOT000001"
 *  - N lines → "LOT000001 + อีก {N-1} รายการ"
 */
function lotsSummary(s: SalesOrderDTO): string {
  if (s.lines.length === 0) return "—";
  const first = s.lines[0]?.lot?.lotNo ?? "—";
  const more = s.lines.length - 1;
  return t.misc.lotsSummary(first, more);
}

export function SalesList({
  sales,
  searchTerm,
  showBranchColumn = true,
}: Props) {
  if (sales.length === 0) {
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
      {/* Mobile + medium → stacked cards (table only at lg+) */}
      <ul className="flex flex-col gap-3 lg:hidden">
        {sales.map((s) => (
          <li key={s.id}>
            <Card>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="whitespace-nowrap font-mono text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                      {s.salesNo}
                    </span>
                    <span className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                      {s.buyerName}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {lotsSummary(s)}
                      {showBranchColumn && s.branch
                        ? ` · ${s.branch.code}`
                        : ""}
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <SalesStatusBadge status={s.status} size="sm" />
                    <SaleTypeBadge type={s.saleType} size="sm" />
                  </div>
                </div>
                <dl className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
                  <div className="flex justify-between gap-3">
                    <dt className="min-w-0">{t.fields.grossWeightTotal}</dt>
                    <dd className="whitespace-nowrap text-right tabular-nums">
                      {formatNumber(s.grossWeightTotal, 2)} {t.units.kg}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="min-w-0">{t.fields.drcPercent}</dt>
                    <dd className="whitespace-nowrap text-right tabular-nums">
                      {formatNumber(s.drcPercent, 2)} {t.units.percent}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 font-semibold text-zinc-900 dark:text-zinc-50">
                    <dt className="min-w-0">{t.fields.grossAmount}</dt>
                    <dd className="whitespace-nowrap text-right tabular-nums">
                      {formatNumber(s.grossAmount, 2)} {t.units.baht}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 text-xs">
                    <dt className="min-w-0">{t.fields.createdAt}</dt>
                    <dd className="whitespace-nowrap text-right">
                      {formatDateOnly(s.createdAt)}
                    </dd>
                  </div>
                </dl>
                <div className="flex pt-1">
                  <Link href={`/sales/${s.id}`} className={detailLinkClass}>
                    {t.actions.detail}
                  </Link>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      {/* Desktop ≥ lg — table */}
      <div className="hidden overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm lg:block dark:border-zinc-800 dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="whitespace-nowrap px-4 py-3">
                  {t.fields.salesNo}
                </th>
                {showBranchColumn ? (
                  <th className="whitespace-nowrap px-4 py-3">
                    {t.fields.branch}
                  </th>
                ) : null}
                <th className="whitespace-nowrap px-4 py-3">
                  {t.fields.lots}
                </th>
                <th className="whitespace-nowrap px-4 py-3">
                  {t.fields.buyerName}
                </th>
                <th className="whitespace-nowrap px-4 py-3">
                  {t.fields.saleType}
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right">
                  {t.fields.grossWeightTotal}
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right">
                  {t.fields.drcPercent}
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right">
                  {t.fields.grossAmount}
                </th>
                <th className="whitespace-nowrap px-4 py-3">
                  {t.fields.status}
                </th>
                <th className="whitespace-nowrap px-4 py-3">
                  {t.fields.createdAt}
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right">
                  {t.fields.actions}
                </th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr
                  key={s.id}
                  className="border-t border-zinc-200 dark:border-zinc-800"
                >
                  <td className="whitespace-nowrap px-4 py-3 font-mono font-medium text-emerald-700 dark:text-emerald-400">
                    {s.salesNo}
                  </td>
                  {showBranchColumn ? (
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {s.branch ? s.branch.code : "—"}
                    </td>
                  ) : null}
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    {lotsSummary(s)}
                  </td>
                  <td className="px-4 py-3 text-zinc-900 dark:text-zinc-50">
                    {s.buyerName}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <SaleTypeBadge type={s.saleType} size="sm" />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-zinc-50">
                    {formatNumber(s.grossWeightTotal, 2)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                    {formatNumber(s.drcPercent, 2)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums font-semibold text-zinc-900 dark:text-zinc-50">
                    {formatNumber(s.grossAmount, 2)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <SalesStatusBadge status={s.status} size="sm" />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {formatDateOnly(s.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex justify-end">
                      <Link
                        href={`/sales/${s.id}`}
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
