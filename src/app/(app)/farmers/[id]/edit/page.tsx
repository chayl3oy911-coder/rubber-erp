import Link from "next/link";
import { redirect } from "next/navigation";

import { updateFarmerAction } from "@/modules/farmer/actions";
import { farmerT } from "@/modules/farmer/i18n";
import { getFarmer } from "@/modules/farmer/service";
import { requirePermission } from "@/shared/auth/dal";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui";

import { FarmerForm } from "../../_components/farmer-form";

const t = farmerT();

export default async function EditFarmerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await requirePermission("farmer.update");
  const { id } = await params;

  const farmer = await getFarmer(me, id);
  if (!farmer) {
    redirect("/farmers");
  }

  const action = updateFarmerAction.bind(null, farmer.id);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {t.page.editTitle}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {farmer.code} — {farmer.fullName}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t.page.detailHeading}</CardTitle>
          <CardDescription>
            <Link
              href="/farmers"
              className="text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-400"
            >
              {t.actions.back}
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FarmerForm
            action={action}
            mode="edit"
            initialValue={{
              code: farmer.code,
              fullName: farmer.fullName,
              phone: farmer.phone,
              nationalId: farmer.nationalId,
              bankName: farmer.bankName,
              bankAccountNo: farmer.bankAccountNo,
              notes: farmer.notes,
            }}
            lockedBranch={farmer.branch}
          />
        </CardContent>
      </Card>
    </div>
  );
}
