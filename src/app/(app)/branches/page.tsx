import Link from "next/link";

import { listBranches } from "@/modules/branch/service";
import { hasPermission, requirePermission } from "@/shared/auth/dal";

import { BranchList } from "./_components/branch-list";

const primaryButtonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2";

const ghostLinkClass =
  "inline-flex h-10 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

export default async function BranchesPage({
  searchParams,
}: {
  searchParams: Promise<{ includeInactive?: string }>;
}) {
  const me = await requirePermission("branch.read");
  const sp = await searchParams;
  const includeInactive = sp.includeInactive === "true";

  const branches = await listBranches(me, { includeInactive });
  const canCreate = hasPermission(me, "branch.create");
  const canEdit = hasPermission(me, "branch.update");
  const canToggle = hasPermission(me, "branch.update");

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            สาขา
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {me.isSuperAdmin
              ? "Super Admin เห็นทุกสาขาในระบบ"
              : `แสดงเฉพาะสาขาที่บัญชีของคุณเข้าถึงได้ (${me.branchIds.length} สาขา)`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={
              includeInactive ? "/branches" : "/branches?includeInactive=true"
            }
            className={ghostLinkClass}
          >
            {includeInactive ? "ซ่อนที่ปิดใช้งาน" : "แสดงที่ปิดใช้งานด้วย"}
          </Link>
          {canCreate ? (
            <Link href="/branches/new" className={primaryButtonClass}>
              + เพิ่มสาขา
            </Link>
          ) : null}
        </div>
      </header>

      <BranchList
        branches={branches}
        canEdit={canEdit}
        canToggle={canToggle}
      />
    </div>
  );
}
