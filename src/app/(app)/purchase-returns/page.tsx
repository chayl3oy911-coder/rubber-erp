import Link from "next/link";

import { listBranches } from "@/modules/branch/service";
import { purchaseReturnT } from "@/modules/purchase-return/i18n";
import { listPurchaseReturnsQuerySchema } from "@/modules/purchase-return/schemas";
import { listPurchaseReturns } from "@/modules/purchase-return/service";
import { isPurchaseReturnStatus } from "@/modules/purchase-return/types";
import { hasPermission, requirePermission } from "@/shared/auth/dal";
import { Card, CardContent } from "@/shared/ui";

import { PurchaseReturnListRow } from "./_components/return-list-row";

const t = purchaseReturnT();

const ghostLinkClass =
  "inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

const primaryButtonClass =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

function pickString(
  sp: SearchParamsRecord,
  key: string,
): string | undefined {
  const v = sp[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

const STATUS_TABS: Array<{ key: string; statusParam?: string; labelKey: "DRAFT" | "CONFIRMED" | "CANCELLED" | "ALL" }> = [
  { key: "ALL", statusParam: undefined, labelKey: "ALL" },
  { key: "DRAFT", statusParam: "DRAFT", labelKey: "DRAFT" },
  { key: "CONFIRMED", statusParam: "CONFIRMED", labelKey: "CONFIRMED" },
  { key: "CANCELLED", statusParam: "CANCELLED", labelKey: "CANCELLED" },
];

export default async function PurchaseReturnsListPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsRecord>;
}) {
  const me = await requirePermission("purchase.return.read");
  const sp = await searchParams;

  const rawStatus = pickString(sp, "status");
  const status =
    rawStatus && isPurchaseReturnStatus(rawStatus) ? rawStatus : undefined;

  const parsed = listPurchaseReturnsQuerySchema.safeParse({
    status,
    branchId: pickString(sp, "branchId"),
    ticketId: pickString(sp, "ticketId"),
    lotId: pickString(sp, "lotId"),
    cursor: pickString(sp, "cursor"),
    limit: pickString(sp, "limit"),
  });

  const query = parsed.success
    ? parsed.data
    : { status, branchId: undefined };

  const result = await listPurchaseReturns(me, query);

  const branches = await listBranches(me);
  const showBranchColumn = me.isSuperAdmin || branches.length > 1;
  const canCreate = hasPermission(me, "purchase.return.create");

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {t.page.listTitle}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t.page.listSubtitle}
          </p>
        </div>
        {canCreate ? (
          <Link href="/purchase-returns/new" className={primaryButtonClass}>
            + {t.buttons.create}
          </Link>
        ) : null}
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_TABS.map((tab) => {
          const params = new URLSearchParams();
          if (tab.statusParam) params.set("status", tab.statusParam);
          const branchId = pickString(sp, "branchId");
          if (branchId) params.set("branchId", branchId);
          const isActive = (status ?? "ALL") === tab.key;
          const label =
            tab.labelKey === "ALL" ? "ทั้งหมด" : t.status[tab.labelKey];
          const qs = params.toString();
          const href = qs
            ? `/purchase-returns?${qs}`
            : "/purchase-returns";
          return (
            <Link
              key={tab.key}
              href={href}
              className={`${ghostLinkClass} ${
                isActive
                  ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-300"
                  : ""
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {result.items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {t.empty.list}
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {result.items.map((row) => (
            <PurchaseReturnListRow
              key={row.id}
              row={row}
              showBranchColumn={showBranchColumn}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
