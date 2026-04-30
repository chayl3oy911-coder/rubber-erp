import { NextResponse, type NextRequest } from "next/server";

import { stockT } from "@/modules/stock/i18n";
import { listEligiblePurchasesQuerySchema } from "@/modules/stock/schemas";
import { listEligiblePurchases } from "@/modules/stock/service";
import { apiRequirePermission } from "@/shared/auth/api";

const t = stockT();

export async function GET(request: NextRequest) {
  const guard = await apiRequirePermission("stock.create");
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const parsed = listEligiblePurchasesQuerySchema.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    branchId: url.searchParams.get("branchId") ?? undefined,
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

  const result = await listEligiblePurchases(guard.user, parsed.data);
  return NextResponse.json(result);
}
