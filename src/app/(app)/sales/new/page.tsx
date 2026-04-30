import Link from "next/link";

import { listBranches } from "@/modules/branch/service";
import { salesT } from "@/modules/sales/i18n";
import { listEligibleLotsForSale } from "@/modules/sales/service";
import { requirePermission } from "@/shared/auth/dal";

import { SalesForm } from "../_components/sales-form";

const t = salesT();

const ghostLinkClass =
  "inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

export default async function NewSalesPage() {
  const me = await requirePermission("sales.create");

  const [branches, lots] = await Promise.all([
    listBranches(me),
    // Capped at 100 — simple <select>, future debounced picker if needed.
    listEligibleLotsForSale(me, { limit: 100 }),
  ]);

  if (branches.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {t.page.newTitle}
          </h1>
        </header>
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          {t.empty.noBranches}
        </p>
      </div>
    );
  }

  const showBranchSelect = me.isSuperAdmin || branches.length > 1;
  const defaultBranchId = branches[0]?.id ?? "";

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
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {t.hints.autoSalesNo}
          </p>
        </div>
        <Link href="/sales" className={ghostLinkClass}>
          {t.actions.back}
        </Link>
      </header>

      <SalesForm
        branches={branches.map((b) => ({
          id: b.id,
          code: b.code,
          name: b.name,
        }))}
        defaultBranchId={defaultBranchId}
        showBranchSelect={showBranchSelect}
        lots={lots}
      />
    </div>
  );
}
