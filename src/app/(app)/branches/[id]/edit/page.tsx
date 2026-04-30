import Link from "next/link";
import { redirect } from "next/navigation";

import { updateBranchAction } from "@/modules/branch/actions";
import { getBranch } from "@/modules/branch/service";
import { requirePermission } from "@/shared/auth/dal";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui";

import { BranchForm } from "../../_components/branch-form";

export default async function EditBranchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await requirePermission("branch.update");
  const { id } = await params;

  const branch = await getBranch(me, id);
  if (!branch) {
    redirect("/branches");
  }

  const action = updateBranchAction.bind(null, branch.id);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          แก้ไขสาขา
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {branch.code} — {branch.name}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>รายละเอียดสาขา</CardTitle>
          <CardDescription>
            <Link
              href="/branches"
              className="text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-400"
            >
              ← กลับไปยังรายการสาขา
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BranchForm
            action={action}
            initialValue={branch}
            submitLabel="บันทึกการเปลี่ยนแปลง"
          />
        </CardContent>
      </Card>
    </div>
  );
}
