import Link from "next/link";

import { listBranches } from "@/modules/branch/service";
import { createPurchaseAction } from "@/modules/purchase/actions";
import { purchaseT } from "@/modules/purchase/i18n";
import { requirePermission } from "@/shared/auth/dal";
import { Card, CardContent } from "@/shared/ui";

import { PurchaseForm } from "../_components/purchase-form";

const t = purchaseT();

const ghostLinkClass =
  "inline-flex h-9 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

export default async function NewPurchasePage() {
  const me = await requirePermission("purchase.create");

  // Branches available to the actor (super admin = all active; users = scoped).
  // We intentionally do NOT preload customers — the picker queries `/api/customers`
  // on demand to handle large datasets without blowing up the initial payload.
  const branches = await listBranches(me);

  if (branches.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {t.page.newTitle}
          </h1>
        </header>
        <Card>
          <CardContent className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {t.empty.noBranches}
          </CardContent>
        </Card>
        <Link href="/purchases" className={ghostLinkClass}>
          {t.actions.back}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <Link
          href="/purchases"
          className="text-sm text-emerald-700 hover:underline dark:text-emerald-400"
        >
          {t.actions.back}
        </Link>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {t.page.newTitle}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t.page.newSubtitle}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {t.hints.autoTicketNo}
          </p>
        </div>
      </header>

      <Card>
        <CardContent>
          <PurchaseForm
            mode="create"
            action={createPurchaseAction}
            availableBranches={branches.map((b) => ({
              id: b.id,
              code: b.code,
              name: b.name,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
