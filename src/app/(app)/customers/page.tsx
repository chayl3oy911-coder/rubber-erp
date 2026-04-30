import Link from "next/link";

import { listBranches } from "@/modules/branch/service";
import { customerT } from "@/modules/customer/i18n";
import {
  CUSTOMER_PAGE_SIZE_DEFAULT,
  listCustomersQuerySchema,
} from "@/modules/customer/schemas";
import { listCustomers } from "@/modules/customer/service";
import { hasPermission, requirePermission } from "@/shared/auth/dal";

import { CustomerList } from "./_components/customer-list";
import { CustomerSearch } from "./_components/customer-search";

const t = customerT();

const primaryButtonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2";

const ghostLinkClass =
  "inline-flex h-10 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

const paginationButtonClass =
  "inline-flex h-9 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

function pickString(
  sp: SearchParamsRecord,
  key: string,
): string | undefined {
  const v = sp[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

function buildPageHref(
  current: SearchParamsRecord,
  page: number,
): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(current)) {
    if (k === "page") continue;
    if (Array.isArray(v)) {
      if (v[0]) params.set(k, v[0]);
    } else if (v) {
      params.set(k, v);
    }
  }
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/customers?${qs}` : "/customers";
}

function toggleInactiveHref(current: SearchParamsRecord): string {
  const params = new URLSearchParams();
  const includeInactive = pickString(current, "includeInactive") === "true";
  for (const [k, v] of Object.entries(current)) {
    if (k === "includeInactive" || k === "page") continue;
    if (Array.isArray(v)) {
      if (v[0]) params.set(k, v[0]);
    } else if (v) {
      params.set(k, v);
    }
  }
  if (!includeInactive) params.set("includeInactive", "true");
  const qs = params.toString();
  return qs ? `/customers?${qs}` : "/customers";
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsRecord>;
}) {
  const me = await requirePermission("customer.read");
  const sp = await searchParams;

  const parsed = listCustomersQuerySchema.safeParse({
    q: pickString(sp, "q"),
    branchId: pickString(sp, "branchId"),
    includeInactive: pickString(sp, "includeInactive"),
    page: pickString(sp, "page"),
    pageSize: pickString(sp, "pageSize"),
  });

  const query = parsed.success
    ? parsed.data
    : {
        q: undefined,
        branchId: undefined,
        includeInactive: false,
        page: 1,
        pageSize: CUSTOMER_PAGE_SIZE_DEFAULT,
      };

  const result = await listCustomers(me, query);

  const canCreate = hasPermission(me, "customer.create");
  const canEdit = hasPermission(me, "customer.update");
  const canToggle = hasPermission(me, "customer.update");

  const branches = await listBranches(me);
  const showBranchFilter = me.isSuperAdmin || branches.length > 1;
  const showBranchColumn = me.isSuperAdmin || branches.length > 1;

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const fromIndex =
    result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const toIndex = Math.min(result.total, result.page * result.pageSize);

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
          <Link
            href={toggleInactiveHref(sp)}
            className={ghostLinkClass}
          >
            {includeInactive ? t.actions.hideInactive : t.actions.showInactive}
          </Link>
          {canCreate ? (
            <Link href="/customers/new" className={primaryButtonClass}>
              {t.actions.create}
            </Link>
          ) : null}
        </div>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CustomerSearch initialQ={query.q ?? ""} />
        {showBranchFilter ? (
          <BranchFilter
            branches={branches.map((b) => ({
              id: b.id,
              code: b.code,
              name: b.name,
            }))}
            currentBranchId={query.branchId}
            currentParams={sp}
          />
        ) : null}
      </div>

      <CustomerList
        customers={result.customers}
        canEdit={canEdit}
        canToggle={canToggle}
        searchTerm={query.q}
        showBranchColumn={showBranchColumn}
      />

      {result.total > 0 ? (
        <nav
          aria-label="pagination"
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t.misc.paginationInfo(fromIndex, toIndex, result.total)}
          </p>
          <div className="flex items-center gap-2">
            {result.page > 1 ? (
              <Link
                href={buildPageHref(sp, result.page - 1)}
                className={paginationButtonClass}
              >
                {t.actions.prev}
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className={paginationButtonClass}
              >
                {t.actions.prev}
              </button>
            )}
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {result.page} / {totalPages}
            </span>
            {result.page < totalPages ? (
              <Link
                href={buildPageHref(sp, result.page + 1)}
                className={paginationButtonClass}
              >
                {t.actions.next}
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className={paginationButtonClass}
              >
                {t.actions.next}
              </button>
            )}
          </div>
        </nav>
      ) : null}
    </div>
  );
}

function BranchFilter({
  branches,
  currentBranchId,
  currentParams,
}: {
  branches: ReadonlyArray<{ id: string; code: string; name: string }>;
  currentBranchId: string | undefined;
  currentParams: SearchParamsRecord;
}) {
  const baseHref = (branchId: string | null) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(currentParams)) {
      if (k === "branchId" || k === "page") continue;
      if (Array.isArray(v)) {
        if (v[0]) params.set(k, v[0]);
      } else if (v) {
        params.set(k, v);
      }
    }
    if (branchId) params.set("branchId", branchId);
    const qs = params.toString();
    return qs ? `/customers?${qs}` : "/customers";
  };

  const linkBase =
    "inline-flex h-9 items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors";
  const active =
    "border-emerald-600 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-300";
  const inactive =
    "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      <Link
        href={baseHref(null)}
        className={`${linkBase} ${!currentBranchId ? active : inactive}`}
      >
        {t.misc.branchAllOption}
      </Link>
      {branches.map((b) => (
        <Link
          key={b.id}
          href={baseHref(b.id)}
          className={`${linkBase} ${currentBranchId === b.id ? active : inactive}`}
        >
          {b.code}
        </Link>
      ))}
    </div>
  );
}
