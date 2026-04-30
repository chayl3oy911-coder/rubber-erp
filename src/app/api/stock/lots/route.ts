import { NextResponse, type NextRequest } from "next/server";

import { stockT } from "@/modules/stock/i18n";
import { listStockLotsQuerySchema } from "@/modules/stock/schemas";
import { listStockLots } from "@/modules/stock/service";
import type { StockLotStatus } from "@/modules/stock/types";
import { apiRequirePermission } from "@/shared/auth/api";

const t = stockT();

export async function GET(request: NextRequest) {
  const guard = await apiRequirePermission("stock.read");
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const parsed = listStockLotsQuerySchema.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    branchId: url.searchParams.get("branchId") ?? undefined,
    rubberType: url.searchParams.get("rubberType") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    includeInactive: url.searchParams.get("includeInactive") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: t.errors.validation,
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const result = await listStockLots(guard.user, {
    ...parsed.data,
    status: parsed.data.status as ReadonlyArray<StockLotStatus> | undefined,
  });
  return NextResponse.json(result);
}
