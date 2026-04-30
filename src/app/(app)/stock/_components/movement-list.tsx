import type { StockMovementDTO } from "@/modules/stock/dto";
import { stockT } from "@/modules/stock/i18n";
import { stockReasonLabel } from "@/modules/stock/types";
import { Card, CardContent } from "@/shared/ui";

import { MovementTypeBadge } from "./movement-type-badge";

const t = stockT();

type Props = {
  movements: StockMovementDTO[];
};

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

export function MovementList({ movements }: Props) {
  if (movements.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {t.empty.noMovements}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Mobile/Medium — stacked cards */}
      <ul className="flex flex-col gap-2 lg:hidden">
        {movements.map((m) => (
          <li key={m.id}>
            <Card>
              <CardContent className="flex flex-col gap-2 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <MovementTypeBadge type={m.movementType} size="sm" />
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {formatDateTime(m.createdAt)}
                      {m.createdBy ? ` · ${m.createdBy.displayName}` : ""}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 text-right">
                    <span className="whitespace-nowrap text-base font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                      {formatNumber(m.quantity, 2)} {t.units.kg}
                    </span>
                    <span className="whitespace-nowrap text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                      {formatNumber(m.beforeWeight, 2)} →{" "}
                      {formatNumber(m.afterWeight, 2)}
                    </span>
                  </div>
                </div>
                {m.reasonType ? (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {t.fields.reasonType}: {stockReasonLabel(m.reasonType)}
                  </p>
                ) : null}
                {m.note ? (
                  <p className="break-words text-sm text-zinc-700 dark:text-zinc-300">
                    {m.note}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      {/* Desktop ≥ lg — table */}
      <div className="hidden overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm lg:block dark:border-zinc-800 dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="whitespace-nowrap px-4 py-3">
                  {t.fields.createdAt}
                </th>
                <th className="whitespace-nowrap px-4 py-3">
                  {t.fields.movementType}
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right">
                  {t.fields.movementQuantity}
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right">
                  {t.fields.movementBefore}
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right">
                  {t.fields.movementAfter}
                </th>
                <th className="whitespace-nowrap px-4 py-3">
                  {t.fields.reasonType}
                </th>
                <th className="px-4 py-3">{t.fields.note}</th>
                <th className="whitespace-nowrap px-4 py-3">
                  {t.fields.createdBy}
                </th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr
                  key={m.id}
                  className="border-t border-zinc-200 dark:border-zinc-800"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {formatDateTime(m.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <MovementTypeBadge type={m.movementType} size="sm" />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums font-semibold text-zinc-900 dark:text-zinc-50">
                    {formatNumber(m.quantity, 2)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                    {formatNumber(m.beforeWeight, 2)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                    {formatNumber(m.afterWeight, 2)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {m.reasonType ? stockReasonLabel(m.reasonType) : "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    <span className="break-words">{m.note ?? "—"}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {m.createdBy?.displayName ?? "—"}
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
