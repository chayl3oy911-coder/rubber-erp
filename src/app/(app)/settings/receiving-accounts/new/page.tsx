import Link from "next/link";

import { listBranches } from "@/modules/branch/service";
import { receivingAccountT } from "@/modules/receivingAccount/i18n";
import { hasPermission, requirePermission } from "@/shared/auth/dal";

import { ReceivingEntityForm } from "../_components/receiving-entity-form";

const t = receivingAccountT();

const ghostLinkClass =
  "inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

export default async function NewReceivingAccountPage() {
  const me = await requirePermission("settings.receivingAccount.create");
  const branches = await listBranches(me);

  // Only admins (or hq_admin equivalents — anyone with the `update` perm)
  // can create company-wide entries. Sales staff with a future
  // `settings.receivingAccount.create` grant would be limited to their
  // own branch scope.
  const canCreateCompanyWide =
    me.isSuperAdmin || hasPermission(me, "settings.receivingAccount.update");

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {t.page.newTitle}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t.page.newSubtitle}
          </p>
        </div>
        <Link href="/settings/receiving-accounts" className={ghostLinkClass}>
          {t.actions.back}
        </Link>
      </header>

      <ReceivingEntityForm
        entity={null}
        branches={branches.map((b) => ({
          id: b.id,
          code: b.code,
          name: b.name,
        }))}
        canCreateCompanyWide={canCreateCompanyWide}
      />
    </div>
  );
}
