import Link from "next/link";

import type { CustomerDTO } from "@/modules/customer/dto";
import { customerT } from "@/modules/customer/i18n";
import { Card, CardContent } from "@/shared/ui";

import { BankAccountsCell } from "./bank-accounts-cell";
import { ToggleActiveForm } from "./toggle-active-form";

const t = customerT();

function badgeClass(active: boolean): string {
  return active
    ? "inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
    : "inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400";
}

const editLinkClass =
  "inline-flex h-9 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

const editLinkCompactClass =
  "inline-flex h-8 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

type Props = {
  customers: CustomerDTO[];
  canEdit: boolean;
  canToggle: boolean;
  searchTerm?: string;
  showBranchColumn?: boolean;
};

export function CustomerList({
  customers,
  canEdit,
  canToggle,
  searchTerm,
  showBranchColumn = true,
}: Props) {
  if (customers.length === 0) {
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
        {customers.map((c) => (
          <li key={c.id}>
            <Card>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                      {c.code}
                    </span>
                    <span className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                      {c.fullName}
                    </span>
                    {showBranchColumn && c.branch ? (
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {t.fields.branch}: {c.branch.code} – {c.branch.name}
                      </span>
                    ) : null}
                  </div>
                  <span className={badgeClass(c.isActive)}>
                    {c.isActive ? t.badge.active : t.badge.inactive}
                  </span>
                </div>
                <dl className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {c.phone ? (
                    <div>
                      <dt className="inline text-zinc-500 dark:text-zinc-500">
                        {t.fields.phone}:{" "}
                      </dt>
                      <dd className="inline">{c.phone}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-zinc-500 dark:text-zinc-500">
                      {t.fields.bankAccounts}
                    </dt>
                    <dd className="mt-0.5">
                      <BankAccountsCell accounts={c.bankAccounts} />
                    </dd>
                  </div>
                </dl>
                {(canEdit || canToggle) && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {canEdit ? (
                      <Link
                        href={`/customers/${c.id}/edit`}
                        className={editLinkClass}
                      >
                        {t.actions.edit}
                      </Link>
                    ) : null}
                    {canToggle ? (
                      <ToggleActiveForm
                        customerId={c.id}
                        isActive={c.isActive}
                      />
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm sm:block dark:border-zinc-800 dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3">{t.fields.code}</th>
                <th className="px-4 py-3">{t.fields.fullName}</th>
                {showBranchColumn ? (
                  <th className="hidden px-4 py-3 lg:table-cell">
                    {t.fields.branch}
                  </th>
                ) : null}
                <th className="hidden px-4 py-3 md:table-cell">
                  {t.fields.phone}
                </th>
                <th className="px-4 py-3">{t.fields.bankAccounts}</th>
                <th className="px-4 py-3">{t.fields.status}</th>
                <th className="px-4 py-3 text-right">{t.fields.actions}</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr
                  key={c.id}
                  className="border-t border-zinc-200 align-top dark:border-zinc-800"
                >
                  <td className="px-4 py-3 font-medium text-emerald-700 dark:text-emerald-400">
                    {c.code}
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                    {c.fullName}
                  </td>
                  {showBranchColumn ? (
                    <td className="hidden px-4 py-3 text-zinc-600 lg:table-cell dark:text-zinc-400">
                      {c.branch ? `${c.branch.code} – ${c.branch.name}` : "—"}
                    </td>
                  ) : null}
                  <td className="hidden px-4 py-3 text-zinc-600 md:table-cell dark:text-zinc-400">
                    {c.phone ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    <BankAccountsCell accounts={c.bankAccounts} compact />
                  </td>
                  <td className="px-4 py-3">
                    <span className={badgeClass(c.isActive)}>
                      {c.isActive ? t.badge.active : t.badge.inactive}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {canEdit ? (
                        <Link
                          href={`/customers/${c.id}/edit`}
                          className={editLinkCompactClass}
                        >
                          {t.actions.edit}
                        </Link>
                      ) : null}
                      {canToggle ? (
                        <ToggleActiveForm
                          customerId={c.id}
                          isActive={c.isActive}
                          compact
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
