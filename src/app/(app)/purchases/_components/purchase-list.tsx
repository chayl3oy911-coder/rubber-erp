import Link from "next/link";

import type { PurchaseTicketDTO } from "@/modules/purchase/dto";
import { purchaseT } from "@/modules/purchase/i18n";
import { rubberTypeLabel } from "@/modules/purchase/rubber-types";
import { Card, CardContent } from "@/shared/ui";

import { StatusBadge } from "./status-badge";

const t = purchaseT();

// `shrink-0` keeps the action button at intrinsic size even when its parent is
// a flex row (table cell or card header) — prevents the label from collapsing
// when neighbouring content grows.
const detailLinkClass =
  "inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

const detailLinkCompactClass =
  "inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

type Props = {
  purchases: PurchaseTicketDTO[];
  searchTerm?: string;
  showBranchColumn?: boolean;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatNumber(s: string, fractionDigits = 2): string {
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

export function PurchaseList({
  purchases,
  searchTerm,
  showBranchColumn = true,
}: Props) {
  if (purchases.length === 0) {
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
      <ul className="flex flex-col gap-3 sm:hidden">
        {purchases.map((p) => (
          <li key={p.id}>
            <Card>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="whitespace-nowrap font-mono text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                      {p.ticketNo}
                    </span>
                    <span className="break-words text-base font-semibold text-zinc-900 dark:text-zinc-50">
                      {p.customer?.fullName ?? "—"}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {p.customer?.code ?? "—"}
                      {showBranchColumn && p.branch
                        ? ` · ${p.branch.code}`
                        : ""}
                      {" · "}
                      {formatDate(p.createdAt)}
                    </span>
                  </div>
                  <div className="shrink-0">
                    <StatusBadge status={p.status} size="sm" />
                  </div>
                </div>
                <dl className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
                  <div className="flex justify-between gap-3">
                    <dt className="min-w-0">{t.fields.rubberType}</dt>
                    <dd className="whitespace-nowrap text-right">
                      {rubberTypeLabel(p.rubberType) ?? p.rubberType}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="min-w-0">{t.fields.netWeight}</dt>
                    <dd className="whitespace-nowrap text-right tabular-nums">
                      {formatNumber(p.netWeight, 2)} {t.units.kg}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 font-semibold text-zinc-900 dark:text-zinc-50">
                    <dt className="min-w-0">{t.fields.totalAmount}</dt>
                    <dd className="whitespace-nowrap text-right tabular-nums">
                      {formatNumber(p.totalAmount, 2)} {t.units.baht}
                    </dd>
                  </div>
                </dl>
                <div className="flex pt-1">
                  <Link href={`/purchases/${p.id}`} className={detailLinkClass}>
                    {t.actions.detail}
                  </Link>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      {/*
        Desktop table.
        - Hidden under `sm` (mobile uses the card list above).
        - `overflow-x-auto` is the safety net only — `min-w-[800px]` is sized
          so the columns visible at each breakpoint fit comfortably without
          collapsing under long values, and leaves headroom for upcoming
          columns (e.g. withholding tax, net payable). Horizontal scroll only
          appears on cramped layouts (sm viewports near 640–768px).
        - All structural columns use `whitespace-nowrap` so headers, codes,
          numbers and dates never wrap and break vertical alignment. The
          customer cell is the one place we let text wrap, since names can be
          long.
      */}
      <div className="hidden overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm sm:block dark:border-zinc-800 dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="whitespace-nowrap px-4 py-3">
                  {t.fields.ticketNo}
                </th>
                {showBranchColumn ? (
                  <th className="hidden whitespace-nowrap px-4 py-3 lg:table-cell">
                    {t.fields.branch}
                  </th>
                ) : null}
                <th className="whitespace-nowrap px-4 py-3">
                  {t.fields.customer}
                </th>
                <th className="hidden whitespace-nowrap px-4 py-3 md:table-cell">
                  {t.fields.rubberType}
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right">
                  {t.fields.netWeight}
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right">
                  {t.fields.totalAmount}
                </th>
                <th className="hidden whitespace-nowrap px-4 py-3 md:table-cell">
                  {t.fields.status}
                </th>
                <th className="hidden whitespace-nowrap px-4 py-3 lg:table-cell">
                  {t.fields.createdAt}
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right">
                  {t.fields.actions}
                </th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-zinc-200 dark:border-zinc-800"
                >
                  <td className="whitespace-nowrap px-4 py-3 font-mono font-medium text-emerald-700 dark:text-emerald-400">
                    {p.ticketNo}
                  </td>
                  {showBranchColumn ? (
                    <td className="hidden whitespace-nowrap px-4 py-3 text-zinc-600 lg:table-cell dark:text-zinc-400">
                      {p.branch ? p.branch.code : "—"}
                    </td>
                  ) : null}
                  <td className="px-4 py-3 text-zinc-900 dark:text-zinc-50">
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {p.customer?.fullName ?? "—"}
                      </span>
                      {p.customer ? (
                        <span className="whitespace-nowrap text-xs text-zinc-500 dark:text-zinc-400">
                          {p.customer.code}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-zinc-600 md:table-cell dark:text-zinc-400">
                    {rubberTypeLabel(p.rubberType) ?? p.rubberType}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-zinc-50">
                    {formatNumber(p.netWeight, 2)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums font-semibold text-zinc-900 dark:text-zinc-50">
                    {formatNumber(p.totalAmount, 2)}
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 md:table-cell">
                    <StatusBadge status={p.status} size="sm" />
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-zinc-600 lg:table-cell dark:text-zinc-400">
                    {formatDate(p.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex justify-end">
                      <Link
                        href={`/purchases/${p.id}`}
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
