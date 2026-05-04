import Link from "next/link";

import { listBranches } from "@/modules/branch/service";
import { stockT } from "@/modules/stock/i18n";
import {
  STOCK_PAGE_SIZE_DEFAULT,
  listEligiblePurchasesQuerySchema,
} from "@/modules/stock/schemas";
import {
  countEligiblePurchasesByView,
  listEligiblePurchases,
} from "@/modules/stock/service";
import { isStockIntakeView } from "@/modules/stock/types";
import { hasPermission, requirePermission } from "@/shared/auth/dal";

import { StockPagination } from "../_components/pagination";
import { StockSearch } from "../_components/stock-search";

import { EligiblePurchasesClient } from "./_components/eligible-purchases-client";

const t = stockT();

const ghostLinkClass =
  "inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

function pickString(
  sp: SearchParamsRecord,
  key: string,
): string | undefined {
  const v = sp[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

function buildBaseQuery(sp: SearchParamsRecord): URLSearchParams {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k === "page") continue;
    if (Array.isArray(v)) {
      if (v[0]) params.set(k, v[0]);
    } else if (v) {
      params.set(k, v);
    }
  }
  return params;
}

export default async function StockFromPurchasePage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsRecord>;
}) {
  // The page-level gate is `stock.read` so SKIPPED-tab viewers without
  // create rights can still see the list. Per-action permissions are
  // computed below and forwarded into the client component, which
  // disables/hides the relevant buttons.
  const me = await requirePermission("stock.read");
  const sp = await searchParams;

  const rawView = pickString(sp, "view");
  const view = rawView && isStockIntakeView(rawView) ? rawView : "pending";

  const parsed = listEligiblePurchasesQuerySchema.safeParse({
    q: pickString(sp, "q"),
    branchId: pickString(sp, "branchId"),
    view,
    page: pickString(sp, "page"),
    pageSize: pickString(sp, "pageSize"),
  });

  const query = parsed.success
    ? parsed.data
    : {
        q: undefined,
        branchId: undefined,
        view,
        page: 1,
        pageSize: STOCK_PAGE_SIZE_DEFAULT,
      };

  const [result, counts] = await Promise.all([
    listEligiblePurchases(me, query),
    countEligiblePurchasesByView(me),
  ]);

  const branches = await listBranches(me);
  const showBranchControls = me.isSuperAdmin || branches.length > 1;

  // Forward to the client only the params the toolbar needs to keep on
  // tab switches — `view` and `page` are the ones the toolbar resets.
  const baseQueryForClient: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) {
    if (k === "view" || k === "page") continue;
    if (Array.isArray(v)) {
      if (v[0]) baseQueryForClient[k] = v[0];
    } else if (v) {
      baseQueryForClient[k] = v;
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <Link
            href="/stock"
            className="text-sm text-emerald-700 hover:underline dark:text-emerald-400"
          >
            {t.actions.backToList}
          </Link>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {t.page.fromPurchaseTitle}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t.page.fromPurchaseSubtitle}
          </p>
        </div>
      </header>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {t.hints.fromPurchaseExplain}
      </p>

      <StockSearch
        initialQ={query.q ?? ""}
        basePath="/stock/from-purchase"
        placeholder={t.placeholders.fromPurchaseSearch}
      />

      {showBranchControls ? (
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/stock/from-purchase" className={ghostLinkClass}>
            {t.filters.allBranches}
          </Link>
          {branches.map((b) => {
            const params = new URLSearchParams();
            const q = query.q;
            if (q) params.set("q", q);
            if (view !== "pending") params.set("view", view);
            params.set("branchId", b.id);
            const isActive = query.branchId === b.id;
            return (
              <Link
                key={b.id}
                href={`/stock/from-purchase?${params.toString()}`}
                className={`${ghostLinkClass} ${
                  isActive
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-300"
                    : ""
                }`}
              >
                {b.code}
              </Link>
            );
          })}
        </div>
      ) : null}

      {/*
        `key={view}` forces this client component to REMOUNT when the
        user switches between the PENDING and SKIPPED tabs. Without it,
        React would reconcile the same instance and `useState(initialTickets)`
        would keep the old tab's rows in local state — so the SKIPPED tab
        would render the (stale) pending list. The remount means
        `useState` re-initialises from the freshly server-rendered props
        (which are themselves kept fresh by the `router.refresh()` calls
        the client component fires after every successful mutation).
      */}
      <EligiblePurchasesClient
        key={view}
        initialTickets={result.tickets}
        view={view}
        pendingCount={counts.pending}
        skippedCount={counts.skipped}
        showBranchColumn={showBranchControls}
        canCreate={hasPermission(me, "stock.create")}
        canSkip={hasPermission(me, "stock.skipIntake")}
        canUndoSkip={hasPermission(me, "stock.undoSkipIntake")}
        canCancelAfterSkip={hasPermission(me, "purchase.cancelAfterSkip")}
        baseHref="/stock/from-purchase"
        baseQuery={baseQueryForClient}
        searchTerm={query.q}
      />

      <StockPagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        baseQuery={buildBaseQuery(sp)}
        basePath="/stock/from-purchase"
      />
    </div>
  );
}
