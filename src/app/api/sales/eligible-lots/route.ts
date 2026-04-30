import { NextResponse, type NextRequest } from "next/server";

import { salesT } from "@/modules/sales/i18n";
import { listEligibleLotsForSaleQuerySchema } from "@/modules/sales/schemas";
import { listEligibleLotsForSale } from "@/modules/sales/service";
import { apiRequirePermission } from "@/shared/auth/api";

const t = salesT();

export async function GET(request: NextRequest) {
  const guard = await apiRequirePermission("sales.create");
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const parsed = listEligibleLotsForSaleQuerySchema.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    branchId: url.searchParams.get("branchId") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
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

  const lots = await listEligibleLotsForSale(guard.user, parsed.data);
  return NextResponse.json({ lots });
}
