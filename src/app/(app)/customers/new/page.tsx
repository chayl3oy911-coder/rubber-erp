import Link from "next/link";

import { listBranches } from "@/modules/branch/service";
import { createCustomerAction } from "@/modules/customer/actions";
import { customerT } from "@/modules/customer/i18n";
import { requirePermission } from "@/shared/auth/dal";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui";

import { CustomerForm } from "../_components/customer-form";

const t = customerT();

export default async function NewCustomerPage() {
  const me = await requirePermission("customer.create");

  const allBranches = await listBranches(me);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {t.page.newTitle}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t.page.newSubtitle}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t.page.detailHeading}</CardTitle>
          <CardDescription>
            <Link
              href="/customers"
              className="text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-400"
            >
              {t.actions.back}
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allBranches.length === 0 ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
              {t.empty.noBranches}
            </p>
          ) : (
            <CustomerForm
              action={createCustomerAction}
              mode="create"
              availableBranches={allBranches.map((b) => ({
                id: b.id,
                code: b.code,
                name: b.name,
              }))}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
