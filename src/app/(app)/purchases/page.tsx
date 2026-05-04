import Link from "next/link";

import { listBranches } from "@/modules/branch/service";
import { purchaseT } from "@/modules/purchase/i18n";
import {
  PURCHASE_PAGE_SIZE_DEFAULT,
  listPurchasesQuerySchema,
} from "@/modules/purchase/schemas";
import { listPurchases } from "@/modules/purchase/service";
import type { PurchaseStatus } from "@/modules/purchase/status";
import { hasPermission, requirePermission } from "@/shared/auth/dal";

import { ListFilters } from "./_components/list-filters";
import { Pagination } from "./_components/pagination";
import { PurchaseListClient } from "./_components/purchase-list-client";
import { PurchaseSearch } from "./_components/purchase-search";

const t = purchaseT();

const primaryButtonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2";

const ghostLinkClass =
  "inline-flex h-10 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

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
  return qs ? `/purchases?${qs}` : "/purchases";
}

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsRecord>;
}) {
  const me = await requirePermission("purchase.read");
  const sp = await searchParams;

  const parsed = listPurchasesQuerySchema.safeParse({
    q: pickString(sp, "q"),
    branchId: pickString(sp, "branchId"),
    customerId: pickString(sp, "customerId"),
    status: pickString(sp, "status"),
    dateFrom: pickString(sp, "dateFrom"),
    dateTo: pickString(sp, "dateTo"),
    includeInactive: pickString(sp, "includeInactive"),
    page: pickString(sp, "page"),
    pageSize: pickString(sp, "pageSize"),
  });

  // Fall back to defaults on bad query strings rather than throwing.
  const query = parsed.success
    ? parsed.data
    : {
        q: undefined,
        branchId: undefined,
        customerId: undefined,
        status: undefined,
        dateFrom: undefined,
        dateTo: undefined,
        includeInactive: false,
        page: 1,
        pageSize: PURCHASE_PAGE_SIZE_DEFAULT,
      };

  const result = await listPurchases(me, {
    ...query,
    status: query.status as ReadonlyArray<PurchaseStatus> | undefined,
  });

  const canCreate = hasPermission(me, "purchase.create");
  // Row-level transition permissions are computed once on the server
  // and passed down — the client component never re-checks the role
  // table; the API enforces the same permissions on every request,
  // so the buttons are a UX hint, not a security boundary.
  const rowPerms = {
    canUpdate: hasPermission(me, "purchase.update"),
    canApprove: hasPermission(me, "purchase.approve"),
    canCancel: hasPermission(me, "purchase.cancel"),
  };
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
            <Link href="/purchases/new" className={primaryButtonClass}>
              {t.actions.create}
            </Link>
          ) : null}
        </div>
      </header>

      <PurchaseSearch initialQ={query.q ?? ""} />

      <ListFilters
        branches={branches.map((b) => ({
          id: b.id,
          code: b.code,
          name: b.name,
        }))}
        showBranchFilter={showBranchControls}
        selectedBranchId={query.branchId}
        selectedStatus={query.status?.[0]}
        dateFrom={query.dateFrom}
        dateTo={query.dateTo}
      />

      <PurchaseListClient
        initialPurchases={result.purchases}
        searchTerm={query.q}
        showBranchColumn={showBranchControls}
        perms={rowPerms}
      />

      <Pagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        baseQuery={buildBaseQuery(sp)}
      />
    </div>
  );
}
