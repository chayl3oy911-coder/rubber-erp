import { NextResponse, type NextRequest } from "next/server";

import { stockT } from "@/modules/stock/i18n";
import { listMovementsQuerySchema } from "@/modules/stock/schemas";
import { listMovementsForLot } from "@/modules/stock/service";
import { apiRequirePermission } from "@/shared/auth/api";

const t = stockT();

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await apiRequirePermission("stock.read");
  if (!guard.ok) return guard.response;

  const { id } = await context.params;

  const url = new URL(request.url);
  const parsed = listMovementsQuerySchema.safeParse({
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

  const result = await listMovementsForLot(guard.user, id, parsed.data);
  if (!result) {
    return NextResponse.json({ error: t.errors.notFound }, { status: 404 });
  }
  return NextResponse.json({
    movements: result.movements,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
  });
}
