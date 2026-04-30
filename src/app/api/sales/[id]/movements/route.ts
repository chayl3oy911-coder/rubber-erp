import { NextResponse, type NextRequest } from "next/server";

import { salesT } from "@/modules/sales/i18n";
import { listSalesMovementsQuerySchema } from "@/modules/sales/schemas";
import { listMovementsForSale } from "@/modules/sales/service";
import { apiRequirePermission } from "@/shared/auth/api";

const t = salesT();

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await apiRequirePermission("sales.read");
  if (!guard.ok) return guard.response;

  const { id } = await context.params;
  const url = new URL(request.url);

  const parsed = listSalesMovementsQuerySchema.safeParse({
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

  const result = await listMovementsForSale(guard.user, id, parsed.data);
  if (!result) {
    return NextResponse.json({ error: t.errors.notFound }, { status: 404 });
  }
  return NextResponse.json(result);
}
