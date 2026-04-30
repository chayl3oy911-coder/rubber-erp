import Link from "next/link";

import type { BranchDTO } from "@/modules/branch/dto";
import { Card, CardContent } from "@/shared/ui";

import { ToggleActiveForm } from "./toggle-active-form";

function badgeClass(active: boolean): string {
  return active
    ? "inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
    : "inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400";
}

const editLinkClass =
  "inline-flex h-9 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

const editLinkCompactClass =
  "inline-flex h-8 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

type Props = {
  branches: BranchDTO[];
  canEdit: boolean;
  canToggle: boolean;
};

export function BranchList({ branches, canEdit, canToggle }: Props) {
  if (branches.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
          ยังไม่มีสาขาในระบบ
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-3 sm:hidden">
        {branches.map((b) => (
          <li key={b.id}>
            <Card>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                      {b.code}
                    </span>
                    <span className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                      {b.name}
                    </span>
                  </div>
                  <span className={badgeClass(b.isActive)}>
                    {b.isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                  </span>
                </div>
                {b.phone || b.address ? (
                  <dl className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {b.phone ? (
                      <div>
                        <dt className="inline text-zinc-500 dark:text-zinc-500">
                          โทร:{" "}
                        </dt>
                        <dd className="inline">{b.phone}</dd>
                      </div>
                    ) : null}
                    {b.address ? (
                      <div>
                        <dt className="inline text-zinc-500 dark:text-zinc-500">
                          ที่อยู่:{" "}
                        </dt>
                        <dd className="inline">{b.address}</dd>
                      </div>
                    ) : null}
                  </dl>
                ) : null}
                {(canEdit || canToggle) && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {canEdit ? (
                      <Link
                        href={`/branches/${b.id}/edit`}
                        className={editLinkClass}
                      >
                        แก้ไข
                      </Link>
                    ) : null}
                    {canToggle ? (
                      <ToggleActiveForm branchId={b.id} isActive={b.isActive} />
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm sm:block dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3">รหัส</th>
              <th className="px-4 py-3">ชื่อ</th>
              <th className="hidden px-4 py-3 md:table-cell">เบอร์</th>
              <th className="hidden px-4 py-3 lg:table-cell">ที่อยู่</th>
              <th className="px-4 py-3">สถานะ</th>
              <th className="px-4 py-3 text-right">การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            {branches.map((b) => (
              <tr
                key={b.id}
                className="border-t border-zinc-200 dark:border-zinc-800"
              >
                <td className="px-4 py-3 font-medium text-emerald-700 dark:text-emerald-400">
                  {b.code}
                </td>
                <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                  {b.name}
                </td>
                <td className="hidden px-4 py-3 text-zinc-600 md:table-cell dark:text-zinc-400">
                  {b.phone ?? "—"}
                </td>
                <td className="hidden max-w-xs truncate px-4 py-3 text-zinc-600 lg:table-cell dark:text-zinc-400">
                  {b.address ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={badgeClass(b.isActive)}>
                    {b.isActive ? "เปิด" : "ปิด"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    {canEdit ? (
                      <Link
                        href={`/branches/${b.id}/edit`}
                        className={editLinkCompactClass}
                      >
                        แก้ไข
                      </Link>
                    ) : null}
                    {canToggle ? (
                      <ToggleActiveForm
                        branchId={b.id}
                        isActive={b.isActive}
                        compact
                      />
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
