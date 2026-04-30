import Link from "next/link";

import { createBranchAction } from "@/modules/branch/actions";
import { requirePermission } from "@/shared/auth/dal";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui";

import { BranchForm } from "../_components/branch-form";

export default async function NewBranchPage() {
  await requirePermission("branch.create");

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          เพิ่มสาขาใหม่
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          กรอกรายละเอียดสาขา รหัสสาขาห้ามซ้ำกับที่มีอยู่
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
          <BranchForm action={createBranchAction} submitLabel="สร้างสาขา" />
        </CardContent>
      </Card>
    </div>
  );
}
