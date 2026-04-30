import Link from "next/link";
import { redirect } from "next/navigation";

import { updateCustomerAction } from "@/modules/customer/actions";
import { customerT } from "@/modules/customer/i18n";
import { getCustomer } from "@/modules/customer/service";
import { requirePermission } from "@/shared/auth/dal";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui";

import { CustomerForm } from "../../_components/customer-form";

const t = customerT();

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await requirePermission("customer.update");
  const { id } = await params;

  const customer = await getCustomer(me, id);
  if (!customer) {
    redirect("/customers");
  }

  const action = updateCustomerAction.bind(null, customer.id);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {t.page.editTitle}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {customer.code} — {customer.fullName}
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
          <CustomerForm
            action={action}
            mode="edit"
            initialValue={{
              code: customer.code,
              fullName: customer.fullName,
              phone: customer.phone,
              nationalId: customer.nationalId,
              notes: customer.notes,
              bankAccounts: customer.bankAccounts.map((a) => ({
                id: a.id,
                bankName: a.bankName,
                bankAccountNo: a.bankAccountNo,
                accountName: a.accountName,
                isPrimary: a.isPrimary,
              })),
            }}
            lockedBranch={customer.branch}
          />
        </CardContent>
      </Card>
    </div>
  );
}
