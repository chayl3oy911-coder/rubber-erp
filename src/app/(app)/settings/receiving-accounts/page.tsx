import Link from "next/link";

import { receivingAccountT } from "@/modules/receivingAccount/i18n";
import {
  RECEIVING_ENTITY_PAGE_SIZE_DEFAULT,
  listReceivingEntitiesQuerySchema,
} from "@/modules/receivingAccount/schemas";
import { listReceivingEntities } from "@/modules/receivingAccount/service";
import { hasPermission, requirePermission } from "@/shared/auth/dal";
import { bankLabel } from "@/shared/banks";
import { Card, CardContent } from "@/shared/ui";

import { ReceivingActionsRow } from "./_components/receiving-actions-row";
import { ReceivingSearch } from "./_components/receiving-search";

const t = receivingAccountT();

const primaryButtonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2";

const ghostLinkClass =
  "inline-flex h-10 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

const paginationButtonClass =
  "inline-flex h-9 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

const editLinkClass =
  "inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-500";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

function pickString(
  sp: SearchParamsRecord,
  key: string,
): string | undefined {
  const v = sp[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

function buildHref(
  current: SearchParamsRecord,
  patch: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(current)) {
    if (k in patch) continue;
    if (Array.isArray(v)) {
      if (v[0]) params.set(k, v[0]);
    } else if (v) {
      params.set(k, v);
    }
  }
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined && v !== "") params.set(k, v);
  }
  const qs = params.toString();
  return qs
    ? `/settings/receiving-accounts?${qs}`
    : "/settings/receiving-accounts";
}

export default async function ReceivingAccountsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsRecord>;
}) {
  const me = await requirePermission("settings.receivingAccount.read");
  const sp = await searchParams;

  const errorBanner = (() => {
    const raw = sp.error;
    if (Array.isArray(raw)) return raw[0];
    return raw;
  })();

  const parsed = listReceivingEntitiesQuerySchema.safeParse({
    q: pickString(sp, "q"),
    includeInactive: pickString(sp, "includeInactive"),
    page: pickString(sp, "page"),
    pageSize: pickString(sp, "pageSize"),
    branchScope: pickString(sp, "branchScope"),
  });

  const query = parsed.success
    ? parsed.data
    : {
        q: undefined,
        branchId: undefined,
        branchScope: "all" as const,
        includeInactive: false,
        page: 1,
        pageSize: RECEIVING_ENTITY_PAGE_SIZE_DEFAULT,
      };

  const result = await listReceivingEntities(me, query);

  const canCreate = hasPermission(me, "settings.receivingAccount.create");
  const canEdit = hasPermission(me, "settings.receivingAccount.update");
  const canDeactivate = hasPermission(
    me,
    "settings.receivingAccount.deactivate",
  );

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
              ? t.misc.listSubtitleSuperAdmin
              : t.misc.listSubtitleScoped(me.branchIds.length)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/settings" className={ghostLinkClass}>
            {t.actions.back}
          </Link>
          <Link
            href={buildHref(sp, {
              includeInactive: includeInactive ? undefined : "true",
              page: undefined,
            })}
            className={ghostLinkClass}
          >
            {includeInactive ? t.actions.hideInactive : t.actions.showInactive}
          </Link>
          {canCreate ? (
            <Link
              href="/settings/receiving-accounts/new"
              className={primaryButtonClass}
            >
              {t.actions.create}
            </Link>
          ) : null}
        </div>
      </header>

      {errorBanner ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {errorBanner}
        </p>
      ) : null}

      <ReceivingSearch initialQ={query.q ?? ""} />

      {result.entities.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          {query.q ? t.empty.listForSearch(query.q) : t.empty.list}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {result.entities.map((e) => {
            const primary = e.primaryBankAccount;
            return (
              <li key={e.id}>
                <Card>
                  <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex flex-1 flex-col gap-2">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                          {e.name}
                        </h3>
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {t.type[e.type]}
                        </span>
                        {e.branchId === null ? (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                            {t.badges.companyWide}
                          </span>
                        ) : e.branch ? (
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                            {e.branch.code}
                          </span>
                        ) : null}
                        {e.isDefault ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                            {t.badges.default}
                          </span>
                        ) : null}
                        {!e.isActive ? (
                          <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
                            {t.badges.inactive}
                          </span>
                        ) : null}
                      </div>
                      <dl className="grid grid-cols-1 gap-x-3 gap-y-0.5 text-xs text-zinc-700 dark:text-zinc-300 sm:grid-cols-2">
                        {e.taxId ? (
                          <div className="flex gap-1">
                            <dt className="text-zinc-500 dark:text-zinc-400">
                              {t.fields.taxId}:
                            </dt>
                            <dd className="font-mono">{e.taxId}</dd>
                          </div>
                        ) : null}
                        <div className="flex gap-1">
                          <dt className="text-zinc-500 dark:text-zinc-400">
                            {t.fields.accountCount}:
                          </dt>
                          <dd>{t.misc.accountCountWithMax(e.activeBankAccountCount)}</dd>
                        </div>
                        {primary ? (
                          <div className="flex gap-1 sm:col-span-2">
                            <dt className="text-zinc-500 dark:text-zinc-400">
                              {t.badges.primary}:
                            </dt>
                            <dd>
                              {bankLabel(primary.bankName) ?? primary.bankName} ·
                              {" "}{primary.bankAccountNo} ·{" "}
                              {primary.bankAccountName}
                            </dd>
                          </div>
                        ) : null}
                      </dl>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <ReceivingActionsRow
                        entity={e}
                        canEdit={canEdit}
                        canDeactivate={canDeactivate}
                      />
                      {canEdit ? (
                        <Link
                          href={`/settings/receiving-accounts/${e.id}/edit`}
                          className={editLinkClass}
                        >
                          {t.actions.edit}
                        </Link>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

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
                href={buildHref(sp, { page: String(result.page - 1) })}
                className={paginationButtonClass}
              >
                {t.actions.prev}
              </Link>
            ) : (
              <button type="button" disabled className={paginationButtonClass}>
                {t.actions.prev}
              </button>
            )}
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {result.page} / {totalPages}
            </span>
            {result.page < totalPages ? (
              <Link
                href={buildHref(sp, { page: String(result.page + 1) })}
                className={paginationButtonClass}
              >
                {t.actions.next}
              </Link>
            ) : (
              <button type="button" disabled className={paginationButtonClass}>
                {t.actions.next}
              </button>
            )}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
