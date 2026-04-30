import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { salesT } from "@/modules/sales/i18n";
import { getSalesOrder } from "@/modules/sales/service";
import { requirePermission } from "@/shared/auth/dal";

import { SalesEditForm } from "../../_components/sales-edit-form";
import { SalesStatusBadge } from "../../_components/sales-status-badge";

const t = salesT();

const ghostLinkClass =
  "inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

export default async function EditSalesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await requirePermission("sales.create");
  const { id } = await params;
  const sale = await getSalesOrder(me, id);
  if (!sale) notFound();

  // Cancelled sales are immutable; pivot back to detail (no edits possible).
  if (sale.status === "CANCELLED") {
    redirect(`/sales/${sale.id}`);
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              {sale.salesNo}
            </span>
            <SalesStatusBadge status={sale.status} size="sm" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {t.page.editTitle}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t.page.editSubtitle(t.status[sale.status] ?? sale.status)}
          </p>
        </div>
        <Link href={`/sales/${sale.id}`} className={ghostLinkClass}>
          {t.actions.back}
        </Link>
      </header>

      <SalesEditForm sale={sale} />
    </div>
  );
}
