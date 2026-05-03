import { NextResponse, type NextRequest } from "next/server";

import { salesT } from "@/modules/sales/i18n";
import {
  createSalesSchema,
  listSalesQuerySchema,
} from "@/modules/sales/schemas";
import {
  SalesAutoGenError,
  SalesBranchNotInScopeError,
  SalesDuplicateLotError,
  SalesInsufficientStockError,
  SalesLinesEmptyError,
  SalesStockLotBranchMismatchError,
  SalesStockLotInactiveError,
  SalesStockLotNotActiveError,
  SalesStockLotNotFoundError,
  createSalesOrder,
  listSalesOrders,
} from "@/modules/sales/service";
import type { SaleType, SalesOrderStatus } from "@/modules/sales/types";
import { apiRequirePermission } from "@/shared/auth/api";

const t = salesT();

function readClientIp(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}

export async function GET(request: NextRequest) {
  const guard = await apiRequirePermission("sales.read");
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const parsed = listSalesQuerySchema.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    branchId: url.searchParams.get("branchId") ?? undefined,
    stockLotId: url.searchParams.get("stockLotId") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    saleType: url.searchParams.get("saleType") ?? undefined,
    dateFrom: url.searchParams.get("dateFrom") ?? undefined,
    dateTo: url.searchParams.get("dateTo") ?? undefined,
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

  const result = await listSalesOrders(guard.user, {
    ...parsed.data,
    status: parsed.data.status as ReadonlyArray<SalesOrderStatus> | undefined,
    saleType: parsed.data.saleType as ReadonlyArray<SaleType> | undefined,
  });
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const guard = await apiRequirePermission("sales.create");
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: t.errors.invalidJson },
      { status: 400 },
    );
  }

  const parsed = createSalesSchema.safeParse(body);
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
    const sale = await createSalesOrder(guard.user, parsed.data, {
      ipAddress: readClientIp(request),
      userAgent: request.headers.get("user-agent"),
      source: "api",
    });
    return NextResponse.json({ sale }, { status: 201 });
  } catch (error) {
    if (error instanceof SalesBranchNotInScopeError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (
      error instanceof SalesStockLotNotFoundError ||
      error instanceof SalesStockLotBranchMismatchError
    ) {
      // Hide existence of lots outside scope.
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
    if (error instanceof SalesAutoGenError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
