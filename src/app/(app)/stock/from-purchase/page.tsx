import Link from "next/link";

import { listBranches } from "@/modules/branch/service";
import { stockT } from "@/modules/stock/i18n";
import {
  STOCK_PAGE_SIZE_DEFAULT,
  listEligiblePurchasesQuerySchema,
} from "@/modules/stock/schemas";
import { listEligiblePurchases } from "@/modules/stock/service";
import { hasPermission, requirePermission } from "@/shared/auth/dal";

import { EligiblePurchasesList } from "../_components/eligible-purchases-list";
import { StockPagination } from "../_components/pagination";
import { StockSearch } from "../_components/stock-search";

const t = stockT();

const ghostLinkClass =
  "inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

function pickString(
  sp: SearchParamsRecord,
  key: string,
): string | undefined {
  const v = sp[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

function buildBaseQuery(sp: SearchParamsRecord): URLSearchParams {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k === "page") continue;
    if (Array.isArray(v)) {
      if (v[0]) params.set(k, v[0]);
    } else if (v) {
      params.set(k, v);
    }
  }
  return params;
}

const ERROR_MAP: Record<string, string> = {
  notFound: "ไม่พบใบรับซื้อ หรือใบรับซื้อไม่อยู่ในสาขาที่เข้าถึงได้",
  notApproved: "ใบรับซื้อต้องอยู่ในสถานะ APPROVED ก่อนรับเข้า Stock",
  inactive: "ใบรับซื้อนี้ถูกปิดใช้งาน",
  duplicate: "ใบรับซื้อนี้มี Stock Lot อยู่แล้ว",
  autoGen: "ระบบสร้างเลข Lot ไม่สำเร็จ กรุณาลองอีกครั้ง",
};

export default async function StockFromPurchasePage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsRecord>;
}) {
  // Permission: stock.create — same gate the action enforces.
  const me = await requirePermission("stock.create");
  const sp = await searchParams;

  const parsed = listEligiblePurchasesQuerySchema.safeParse({
    q: pickString(sp, "q"),
    branchId: pickString(sp, "branchId"),
    page: pickString(sp, "page"),
    pageSize: pickString(sp, "pageSize"),
  });

  const query = parsed.success
    ? parsed.data
    : {
        q: undefined,
        branchId: undefined,
        page: 1,
        pageSize: STOCK_PAGE_SIZE_DEFAULT,
      };

  const result = await listEligiblePurchases(me, query);

  const branches = await listBranches(me);
  const showBranchControls = me.isSuperAdmin || branches.length > 1;

  const errorKey = pickString(sp, "error");
  const errorMessage = errorKey ? ERROR_MAP[errorKey] : null;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <Link
            href="/stock"
            className="text-sm text-emerald-700 hover:underline dark:text-emerald-400"
          >
            {t.actions.backToList}
          </Link>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {t.page.fromPurchaseTitle}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t.page.fromPurchaseSubtitle}
          </p>
        </div>
      </header>

      {errorMessage ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {errorMessage}
        </p>
      ) : null}

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {t.hints.fromPurchaseExplain}
      </p>

      <StockSearch
        initialQ={query.q ?? ""}
        basePath="/stock/from-purchase"
        placeholder={t.placeholders.fromPurchaseSearch}
      />

      {showBranchControls ? (
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/stock/from-purchase" className={ghostLinkClass}>
            {t.filters.allBranches}
          </Link>
          {branches.map((b) => {
            const params = new URLSearchParams();
            const q = query.q;
            if (q) params.set("q", q);
            params.set("branchId", b.id);
            const isActive = query.branchId === b.id;
            return (
              <Link
                key={b.id}
                href={`/stock/from-purchase?${params.toString()}`}
                className={`${ghostLinkClass} ${
                  isActive
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-300"
                    : ""
                }`}
              >
                {b.code}
              </Link>
            );
          })}
        </div>
      ) : null}

      <EligiblePurchasesList
        tickets={result.tickets}
        searchTerm={query.q}
        showBranchColumn={showBranchControls}
        canCreate={hasPermission(me, "stock.create")}
      />

      <StockPagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        baseQuery={buildBaseQuery(sp)}
        basePath="/stock/from-purchase"
      />
    </div>
  );
}
