import Link from "next/link";
import { notFound } from "next/navigation";

import { listBranches } from "@/modules/branch/service";
import { receivingAccountT } from "@/modules/receivingAccount/i18n";
import { getReceivingEntity } from "@/modules/receivingAccount/service";
import { requirePermission } from "@/shared/auth/dal";

import { ReceivingEntityForm } from "../../_components/receiving-entity-form";

const t = receivingAccountT();

const ghostLinkClass =
  "inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

export default async function EditReceivingAccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await requirePermission("settings.receivingAccount.update");
  const { id } = await params;
  const entity = await getReceivingEntity(me, id);
  if (!entity) notFound();

  const branches = await listBranches(me);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {t.page.editTitle}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t.page.editSubtitle(entity.name)}
          </p>
        </div>
        <Link href="/settings/receiving-accounts" className={ghostLinkClass}>
          {t.actions.back}
        </Link>
      </header>

      <ReceivingEntityForm
        entity={entity}
        branches={branches.map((b) => ({
          id: b.id,
          code: b.code,
          name: b.name,
        }))}
        canCreateCompanyWide={true}
      />
    </div>
  );
}
