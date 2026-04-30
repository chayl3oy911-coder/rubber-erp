import { NextResponse, type NextRequest } from "next/server";

import { stockT } from "@/modules/stock/i18n";
import { createLotFromPurchaseSchema } from "@/modules/stock/schemas";
import {
  PurchaseTicketBranchMismatchForStockError,
  PurchaseTicketInactiveError,
  PurchaseTicketNotApprovedError,
  PurchaseTicketNotFoundForStockError,
  StockLotAlreadyExistsError,
  StockLotAutoGenError,
  createLotFromPurchase,
} from "@/modules/stock/service";
import { apiRequirePermission } from "@/shared/auth/api";

const t = stockT();

function readClientIp(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}

export async function POST(request: NextRequest) {
  const guard = await apiRequirePermission("stock.create");
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

  const parsed = createLotFromPurchaseSchema.safeParse(body);
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
    const lot = await createLotFromPurchase(guard.user, parsed.data, {
      ipAddress: readClientIp(request),
      userAgent: request.headers.get("user-agent"),
      source: "api",
    });
    return NextResponse.json({ lot }, { status: 201 });
  } catch (error) {
    // Branch-mismatch on a ticket the caller can't see: 404 (don't leak).
    if (
      error instanceof PurchaseTicketNotFoundForStockError ||
      error instanceof PurchaseTicketBranchMismatchForStockError
    ) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (
      error instanceof PurchaseTicketNotApprovedError ||
      error instanceof PurchaseTicketInactiveError
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof StockLotAlreadyExistsError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof StockLotAutoGenError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
