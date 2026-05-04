import { NextResponse, type NextRequest } from "next/server";

import { stockT } from "@/modules/stock/i18n";
import { skipStockIntakeSchema } from "@/modules/stock/schemas";
import {
  PurchaseTicketBranchMismatchForStockError,
  PurchaseTicketInactiveError,
  PurchaseTicketNotApprovedError,
  PurchaseTicketNotFoundForStockError,
  StockBranchNotInScopeError,
  StockIntakeAlreadyReceivedError,
  StockIntakeAlreadySkippedError,
  skipStockIntake,
} from "@/modules/stock/service";
import { apiRequirePermission } from "@/shared/auth/api";

const t = stockT();

function readClientIp(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}

/**
 * POST /api/stock/lots/from-purchase/skip
 *
 * Body: `{ purchaseTicketId: string; reason: string }` (reason min 5 chars).
 * Returns: the updated `EligiblePurchaseDTO` (now in SKIPPED state).
 *
 * The 404-vs-403 split is intentional: branch-mismatch errors return 404
 * so we don't leak that "ticket id X exists in branch Y you can't see".
 */
export async function POST(request: NextRequest) {
  const guard = await apiRequirePermission("stock.skipIntake");
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

  const parsed = skipStockIntakeSchema.safeParse(body);
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
    const ticket = await skipStockIntake(guard.user, parsed.data, {
      ipAddress: readClientIp(request),
      userAgent: request.headers.get("user-agent"),
      source: "api",
    });
    return NextResponse.json({ ticket }, { status: 200 });
  } catch (error) {
    if (
      error instanceof PurchaseTicketNotFoundForStockError ||
      error instanceof PurchaseTicketBranchMismatchForStockError ||
      error instanceof StockBranchNotInScopeError
    ) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (
      error instanceof PurchaseTicketNotApprovedError ||
      error instanceof PurchaseTicketInactiveError
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (
      error instanceof StockIntakeAlreadyReceivedError ||
      error instanceof StockIntakeAlreadySkippedError
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
