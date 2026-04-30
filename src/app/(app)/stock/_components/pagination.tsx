import Link from "next/link";

import { stockT } from "@/modules/stock/i18n";

const t = stockT();

type Props = {
  page: number;
  pageSize: number;
  total: number;
  baseQuery: URLSearchParams;
  basePath: string;
};

/**
 * Stock-module pagination — same shape as the purchase pagination but with
 * a configurable `basePath` so it works for both `/stock` and
 * `/stock/from-purchase`.
 */
export function StockPagination({
  page,
  pageSize,
  total,
  baseQuery,
  basePath,
}: Props) {
  if (total <= pageSize) {
    if (total === 0) return null;
    return (
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {t.misc.paginationInfo(1, total, total)}
      </p>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = (safePage - 1) * pageSize + 1;
  const to = Math.min(total, safePage * pageSize);

  function hrefFor(target: number): string {
    const next = new URLSearchParams(baseQuery.toString());
    if (target <= 1) next.delete("page");
    else next.set("page", String(target));
    const qs = next.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const prevDisabled = safePage <= 1;
  const nextDisabled = safePage >= totalPages;

  const baseBtn =
    "inline-flex h-9 shrink-0 items-center rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";
  const disabledBtn =
    "inline-flex h-9 shrink-0 items-center rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm font-medium text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-600";

  return (
    <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {t.misc.paginationInfo(from, to, total)}
      </p>
      <div className="flex gap-2">
        {prevDisabled ? (
          <span className={disabledBtn} aria-disabled="true">
            {t.actions.prev}
          </span>
        ) : (
          <Link href={hrefFor(safePage - 1)} className={baseBtn}>
            {t.actions.prev}
          </Link>
        )}
        {nextDisabled ? (
          <span className={disabledBtn} aria-disabled="true">
            {t.actions.next}
          </span>
        ) : (
          <Link href={hrefFor(safePage + 1)} className={baseBtn}>
            {t.actions.next}
          </Link>
        )}
      </div>
    </div>
  );
}
