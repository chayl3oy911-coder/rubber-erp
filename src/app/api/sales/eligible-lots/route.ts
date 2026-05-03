import { NextResponse, type NextRequest } from "next/server";

import { salesT } from "@/modules/sales/i18n";
import { listEligibleLotsForSaleQuerySchema } from "@/modules/sales/schemas";
import { listEligibleLotsForSale } from "@/modules/sales/service";
import { apiRequirePermission } from "@/shared/auth/api";

const t = salesT();

/**
 * Paginated + searchable feed for the /sales/new lot picker.
 *
 * Query params: ?q=&branchId=&page=&pageSize=
 *  - q: matches lotNo, rubberType, sourceTicket.ticketNo, customer.fullName
 *  - branchId: scope override (Super Admin) — others always within their scope
 *  - page: 1-based (default 1)
 *  - pageSize: default 50, max 200
 *
 * Response: `{ lots: EligibleLotForSaleDTO[], total, page, pageSize }`.
 * UI uses a "load more" pattern that appends pages locally.
 */
export async function GET(request: NextRequest) {
  const guard = await apiRequirePermission("sales.create");
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const parsed = listEligibleLotsForSaleQuerySchema.safeParse({
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

  const result = await listEligibleLotsForSale(guard.user, parsed.data);
  return NextResponse.json(result);
}
