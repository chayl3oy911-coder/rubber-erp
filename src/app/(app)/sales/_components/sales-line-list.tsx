import Link from "next/link";

import { rubberTypeLabel } from "@/modules/purchase/rubber-types";
import type { SalesOrderLineDTO } from "@/modules/sales/dto";
import { salesT } from "@/modules/sales/i18n";

const t = salesT();

function formatNumber(s: string, fractionDigits = 2): string {
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

type Props = {
  lines: ReadonlyArray<SalesOrderLineDTO>;
};

/**
 * Read-only line list for the SalesOrder detail page. Responsive: a wide
 * table on `lg+` screens, stacked cards below.
 */
export function SalesLineList({ lines }: Props) {
  if (lines.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
        {t.empty.noEligibleLots}
      </p>
    );
  }

  return (
    <div>
      {/* Desktop / tablet table */}
      <div className="hidden overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800 lg:block">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-3 py-2">{t.fields.lotNo}</th>
              <th className="px-3 py-2">{t.fields.rubberType}</th>
              <th className="px-3 py-2">{t.fields.sourceTicket}</th>
              <th className="px-3 py-2 text-right">
                {t.fields.lineGrossWeight}
              </th>
              <th className="px-3 py-2 text-right">
                {t.fields.effectiveCostPerKg}
              </th>
              <th className="px-3 py-2 text-right">
                {t.fields.lineCostAmount}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
            {lines.map((l) => (
              <tr key={l.id}>
                <td className="px-3 py-2">
                  {l.lot ? (
                    <Link
                      href={`/stock/lots/${l.lot.id}`}
                      className="font-mono text-emerald-700 hover:underline dark:text-emerald-300"
                    >
                      {l.lot.lotNo}
                    </Link>
                  ) : (
                    <span className="text-zinc-500 dark:text-zinc-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {rubberTypeLabel(l.rubberType) ?? l.rubberType}
                </td>
                <td className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400">
                  {l.lot?.sourceTicket?.ticketNo ?? "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatNumber(l.grossWeight, 2)} {t.units.kg}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatNumber(l.costPerKgSnapshot, 2)} {t.units.bahtPerKg}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatNumber(l.costAmount, 2)} {t.units.baht}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="flex flex-col gap-2 lg:hidden">
        {lines.map((l) => (
          <li
            key={l.id}
            className="flex flex-col gap-1 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              {l.lot ? (
                <Link
                  href={`/stock/lots/${l.lot.id}`}
                  className="font-mono text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
                >
                  {l.lot.lotNo}
                </Link>
              ) : (
                <span className="text-zinc-500 dark:text-zinc-400">—</span>
              )}
              <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {rubberTypeLabel(l.rubberType) ?? l.rubberType}
              </span>
              {l.lot?.sourceTicket ? (
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  · {l.lot.sourceTicket.ticketNo}
                </span>
              ) : null}
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
              <dt className="text-zinc-500 dark:text-zinc-400">
                {t.fields.lineGrossWeight}
              </dt>
              <dd className="text-right tabular-nums text-zinc-900 dark:text-zinc-50">
                {formatNumber(l.grossWeight, 2)} {t.units.kg}
              </dd>
              <dt className="text-zinc-500 dark:text-zinc-400">
                {t.fields.effectiveCostPerKg}
              </dt>
              <dd className="text-right tabular-nums text-zinc-900 dark:text-zinc-50">
                {formatNumber(l.costPerKgSnapshot, 2)} {t.units.bahtPerKg}
              </dd>
              <dt className="text-zinc-500 dark:text-zinc-400">
                {t.fields.lineCostAmount}
              </dt>
              <dd className="text-right tabular-nums text-zinc-900 dark:text-zinc-50">
                {formatNumber(l.costAmount, 2)} {t.units.baht}
              </dd>
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}
