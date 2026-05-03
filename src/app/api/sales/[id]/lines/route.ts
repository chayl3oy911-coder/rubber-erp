import { NextResponse, type NextRequest } from "next/server";

import { salesT } from "@/modules/sales/i18n";
import { replaceSalesLinesSchema } from "@/modules/sales/schemas";
import {
  SalesDuplicateLotError,
  SalesInsufficientStockError,
  SalesLinesEmptyError,
  SalesLinesLockedError,
  SalesNotFoundError,
  SalesStockLotBranchMismatchError,
  SalesStockLotInactiveError,
  SalesStockLotNotActiveError,
  SalesStockLotNotFoundError,
  replaceSalesOrderLines,
} from "@/modules/sales/service";
import { apiRequirePermission } from "@/shared/auth/api";

const t = salesT();

function readClientIp(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}

/**
 * Replace-all lines for a DRAFT SalesOrder.
 *
 * PUT semantics: the body is the desired full set of lines; existing lines
 * are deleted and recreated. Service rejects with 400 if status != DRAFT
 * (`SalesLinesLockedError`) — confirmed/cancelled bills must be reissued.
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await apiRequirePermission("sales.create");
  if (!guard.ok) return guard.response;

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: t.errors.invalidJson },
      { status: 400 },
    );
  }

  const parsed = replaceSalesLinesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: t.errors.validation,
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const sale = await replaceSalesOrderLines(guard.user, id, parsed.data, {
      ipAddress: readClientIp(request),
      userAgent: request.headers.get("user-agent"),
      source: "api",
    });
    return NextResponse.json({ sale });
  } catch (error) {
    if (error instanceof SalesNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof SalesLinesLockedError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (
      error instanceof SalesStockLotNotFoundError ||
      error instanceof SalesStockLotBranchMismatchError
    ) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (
      error instanceof SalesStockLotInactiveError ||
      error instanceof SalesStockLotNotActiveError ||
      error instanceof SalesLinesEmptyError ||
      error instanceof SalesDuplicateLotError
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof SalesInsufficientStockError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
