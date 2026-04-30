import { NextResponse, type NextRequest } from "next/server";

import { stockT } from "@/modules/stock/i18n";
import { adjustStockSchema } from "@/modules/stock/schemas";
import {
  CannotAdjustDepletedError,
  InsufficientStockError,
  StockBranchNotInScopeError,
  StockLotNotFoundError,
  adjustStock,
} from "@/modules/stock/service";
import { apiRequirePermission } from "@/shared/auth/api";

const t = stockT();

function readClientIp(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}

export async function POST(request: NextRequest) {
  const guard = await apiRequirePermission("stock.adjust");
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

  const parsed = adjustStockSchema.safeParse(body);
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
    const lot = await adjustStock(guard.user, parsed.data, {
      ipAddress: readClientIp(request),
      userAgent: request.headers.get("user-agent"),
      source: "api",
    });
    return NextResponse.json({ lot }, { status: 201 });
  } catch (error) {
    if (
      error instanceof StockLotNotFoundError ||
      error instanceof StockBranchNotInScopeError
    ) {
      // Out-of-scope lots are reported as 404 to avoid leaking existence.
      return NextResponse.json({ error: t.errors.notFound }, { status: 404 });
    }
    if (
      error instanceof InsufficientStockError ||
      error instanceof CannotAdjustDepletedError
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
