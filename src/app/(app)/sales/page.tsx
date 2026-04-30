import Link from "next/link";

import { listBranches } from "@/modules/branch/service";
import { salesT } from "@/modules/sales/i18n";
import {
  SALES_PAGE_SIZE_DEFAULT,
  listSalesQuerySchema,
} from "@/modules/sales/schemas";
import { listSalesOrders } from "@/modules/sales/service";
import type { SaleType, SalesOrderStatus } from "@/modules/sales/types";
import { hasPermission, requirePermission } from "@/shared/auth/dal";

import { SalesFilters } from "./_components/sales-filters";
import { SalesList } from "./_components/sales-list";
import { SalesPagination } from "./_components/sales-pagination";
import { SalesSearch } from "./_components/sales-search";

const t = salesT();

const primaryButtonClass =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2";

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

function toggleInactiveHref(sp: SearchParamsRecord): string {
  const params = new URLSearchParams();
  const includeInactive = pickString(sp, "includeInactive") === "true";
  for (const [k, v] of Object.entries(sp)) {
    if (k === "includeInactive" || k === "page") continue;
    if (Array.isArray(v)) {
      if (v[0]) params.set(k, v[0]);
    } else if (v) {
      params.set(k, v);
    }
  }
  if (!includeInactive) params.set("includeInactive", "true");
  const qs = params.toString();
  return qs ? `/sales?${qs}` : "/sales";
}

export default async function SalesListPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsRecord>;
}) {
  const me = await requirePermission("sales.read");
  const sp = await searchParams;

  const parsed = listSalesQuerySchema.safeParse({
    q: pickString(sp, "q"),
    branchId: pickString(sp, "branchId"),
    stockLotId: pickString(sp, "stockLotId"),
    status: pickString(sp, "status"),
    saleType: pickString(sp, "saleType"),
    dateFrom: pickString(sp, "dateFrom"),
    dateTo: pickString(sp, "dateTo"),
    includeInactive: pickString(sp, "includeInactive"),
    page: pickString(sp, "page"),
    pageSize: pickString(sp, "pageSize"),
  });

  const query = parsed.success
    ? parsed.data
    : {
        q: undefined,
        branchId: undefined,
        stockLotId: undefined,
        status: undefined,
        saleType: undefined,
        dateFrom: undefined,
        dateTo: undefined,
        includeInactive: false,
        page: 1,
        pageSize: SALES_PAGE_SIZE_DEFAULT,
      };

  const result = await listSalesOrders(me, {
    ...query,
    status: query.status as ReadonlyArray<SalesOrderStatus> | undefined,
    saleType: query.saleType as ReadonlyArray<SaleType> | undefined,
  });

  const canCreate = hasPermission(me, "sales.create");
  const branches = await listBranches(me);
  const showBranchControls = me.isSuperAdmin || branches.length > 1;

  const includeInactive = query.includeInactive;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {t.page.listTitle}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {me.isSuperAdmin
              ? t.page.listSubtitleSuperAdmin
              : t.page.listSubtitleScoped(me.branchIds.length)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={toggleInactiveHref(sp)} className={ghostLinkClass}>
            {includeInactive ? t.actions.hideInactive : t.actions.showInactive}
          </Link>
          {canCreate ? (
            <Link href="/sales/new" className={primaryButtonClass}>
              {t.actions.create}
            </Link>
          ) : null}
        </div>
      </header>

      <SalesSearch initialQ={query.q ?? ""} />

      <SalesFilters
        branches={branches.map((b) => ({
          id: b.id,
          code: b.code,
          name: b.name,
        }))}
        showBranchFilter={showBranchControls}
        selectedBranchId={query.branchId}
        selectedStatus={query.status?.[0]}
        selectedSaleType={query.saleType?.[0]}
        selectedDateFrom={query.dateFrom}
        selectedDateTo={query.dateTo}
      />

      <SalesList
        sales={result.sales}
        searchTerm={query.q}
        showBranchColumn={showBranchControls}
      />

      <SalesPagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        baseQuery={buildBaseQuery(sp)}
        basePath="/sales"
      />
    </div>
  );
}
