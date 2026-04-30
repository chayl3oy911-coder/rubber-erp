import { NextResponse } from "next/server";

import { stockT } from "@/modules/stock/i18n";
import { getStockLot } from "@/modules/stock/service";
import { apiRequirePermission } from "@/shared/auth/api";

const t = stockT();

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await apiRequirePermission("stock.read");
  if (!guard.ok) return guard.response;

  const { id } = await context.params;
  const lot = await getStockLot(guard.user, id);
  if (!lot) {
    return NextResponse.json({ error: t.errors.notFound }, { status: 404 });
  }
  return NextResponse.json({ lot });
}
