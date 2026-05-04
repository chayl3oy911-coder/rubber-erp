import Link from "next/link";

import { purchaseReturnT } from "@/modules/purchase-return/i18n";
import { getStockLot } from "@/modules/stock/service";
import { requirePermission } from "@/shared/auth/dal";
import { prisma } from "@/shared/lib/prisma";
import { Card, CardContent } from "@/shared/ui";

import { PurchaseReturnDraftForm } from "../_components/return-form";

const t = purchaseReturnT();

type SearchParamsRecord = Record<string, string | string[] | undefined>;

function pickString(
  sp: SearchParamsRecord,
  key: string,
): string | undefined {
  const v = sp[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

/**
 * /purchase-returns/new
 *
 * Two ways to land here:
 *   - ?lotId=…       → start the return from a specific stock lot
 *   - ?ticketId=…    → start from a purchase ticket (we resolve to the
 *                      single linked StockLot via @@unique(sourcePurchaseTicketId))
 *
 * If neither is supplied we render an empty-state asking the operator
 * to navigate from a Stock Lot or a Purchase Ticket detail page —
 * those are the only two business-correct entry points.
 */
export default async function NewPurchaseReturnPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsRecord>;
}) {
  const me = await requirePermission("purchase.return.create");
  const sp = await searchParams;

  const lotId = pickString(sp, "lotId");
  const ticketId = pickString(sp, "ticketId");

  let resolvedLotId: string | null = null;

  if (lotId) {
    resolvedLotId = lotId;
  } else if (ticketId) {
    // Resolve the linked StockLot — there is exactly 0 or 1 of these per
    // ticket (`@@unique([sourcePurchaseTicketId])`).
    const lot = await prisma.stockLot.findUnique({
      where: { sourcePurchaseTicketId: ticketId },
      select: { id: true, branchId: true },
    });
    if (lot && (me.isSuperAdmin || me.branchIds.includes(lot.branchId))) {
      resolvedLotId = lot.id;
    }
  }

  const lot = resolvedLotId ? await getStockLot(me, resolvedLotId) : null;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <Link
          href="/purchase-returns"
          className="text-sm text-emerald-700 hover:underline dark:text-emerald-400"
        >
          {t.buttons.backToList}
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {t.page.newTitle}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t.page.newSubtitle}
        </p>
      </header>

      {!lot ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {t.empty.noLot}
            <p className="mt-2 text-xs">
              เลือก StockLot ที่ต้องการคืนจากหน้ารายละเอียด Stock Lot
              หรือใบรับซื้อก่อน
            </p>
          </CardContent>
        </Card>
      ) : lot.status === "CANCELLED" ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-rose-700 dark:text-rose-300">
            {t.errors.lotCancelled}
          </CardContent>
        </Card>
      ) : Number(lot.remainingWeight) <= 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
            น้ำหนักคงเหลือของ Lot เป็น 0 ไม่สามารถสร้างเอกสารคืนได้
          </CardContent>
        </Card>
      ) : (
        <PurchaseReturnDraftForm
          lot={{
            id: lot.id,
            branchCode: lot.branch?.code ?? null,
            lotNo: lot.lotNo,
            rubberType: lot.rubberType,
            remainingWeight: lot.remainingWeight,
            effectiveCostPerKg: lot.effectiveCostPerKg,
            ticketNo: lot.sourceTicket?.ticketNo ?? null,
            customerName: lot.sourceTicket?.customer?.fullName ?? null,
            customerCode: lot.sourceTicket?.customer?.code ?? null,
          }}
        />
      )}
    </div>
  );
}
