import type { EligiblePurchaseDTO } from "@/modules/stock/dto";
import { stockT } from "@/modules/stock/i18n";
import { Card, CardContent } from "@/shared/ui";

import { CreateFromPurchaseForm } from "./create-from-purchase-form";

const t = stockT();

type Props = {
  tickets: EligiblePurchaseDTO[];
  searchTerm?: string;
  showBranchColumn?: boolean;
  canCreate: boolean;
};

function formatNumber(s: string, fractionDigits = 2): string {
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function EligiblePurchasesList({
  tickets,
  searchTerm,
  showBranchColumn = true,
  canCreate,
}: Props) {
  if (tickets.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {searchTerm
            ? t.empty.fromPurchaseNoResults(searchTerm)
            : t.empty.fromPurchaseEmpty}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Mobile/Medium */}
      <ul className="flex flex-col gap-3 lg:hidden">
        {tickets.map((tk) => (
          <li key={tk.id}>
            <Card>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="whitespace-nowrap font-mono text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                      {tk.ticketNo}
                    </span>
                    <span className="break-words text-base font-semibold text-zinc-900 dark:text-zinc-50">
                      {tk.customer?.fullName ?? "—"}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {tk.customer?.code ?? "—"}
                      {showBranchColumn && tk.branch
                        ? ` · ${tk.branch.code}`
                        : ""}
                      {" · "}
                      {formatDate(tk.createdAt)}
                    </span>
                  </div>
                </div>
                <dl className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
                  <div className="flex justify-between gap-3">
                    <dt className="min-w-0">{t.fields.netWeight}</dt>
                    <dd className="whitespace-nowrap text-right tabular-nums">
                      {formatNumber(tk.netWeight, 2)} {t.units.kg}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="min-w-0">{t.fields.pricePerKg}</dt>
                    <dd className="whitespace-nowrap text-right tabular-nums">
                      {formatNumber(tk.pricePerKg, 4)} {t.units.bahtPerKg}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 font-semibold text-zinc-900 dark:text-zinc-50">
                    <dt className="min-w-0">{t.fields.totalAmount}</dt>
                    <dd className="whitespace-nowrap text-right tabular-nums">
                      {formatNumber(tk.totalAmount, 2)} {t.units.baht}
                    </dd>
                  </div>
                </dl>
                {canCreate ? (
                  <div className="flex pt-1">
                    <CreateFromPurchaseForm
                      purchaseTicketId={tk.id}
                      ticketNo={tk.ticketNo}
                    />
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      {/* Desktop ≥ lg */}
      <div className="hidden overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm lg:block dark:border-zinc-800 dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="whitespace-nowrap px-4 py-3">
                  {t.fields.sourceTicket}
                </th>
                {showBranchColumn ? (
                  <th className="whitespace-nowrap px-4 py-3">
                    {t.fields.branch}
                  </th>
                ) : null}
                <th className="whitespace-nowrap px-4 py-3">
                  {t.fields.customer}
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right">
                  {t.fields.netWeight}
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right">
                  {t.fields.pricePerKg}
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right">
                  {t.fields.totalAmount}
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
              {tickets.map((tk) => (
                <tr
                  key={tk.id}
                  className="border-t border-zinc-200 dark:border-zinc-800"
                >
                  <td className="whitespace-nowrap px-4 py-3 font-mono font-medium text-emerald-700 dark:text-emerald-400">
                    {tk.ticketNo}
                  </td>
                  {showBranchColumn ? (
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {tk.branch ? tk.branch.code : "—"}
                    </td>
                  ) : null}
                  <td className="px-4 py-3 text-zinc-900 dark:text-zinc-50">
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {tk.customer?.fullName ?? "—"}
                      </span>
                      {tk.customer ? (
                        <span className="whitespace-nowrap text-xs text-zinc-500 dark:text-zinc-400">
                          {tk.customer.code}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-zinc-50">
                    {formatNumber(tk.netWeight, 2)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                    {formatNumber(tk.pricePerKg, 4)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums font-semibold text-zinc-900 dark:text-zinc-50">
                    {formatNumber(tk.totalAmount, 2)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {formatDate(tk.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex justify-end">
                      {canCreate ? (
                        <CreateFromPurchaseForm
                          purchaseTicketId={tk.id}
                          ticketNo={tk.ticketNo}
                        />
                      ) : null}
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
