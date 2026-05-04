import { NextResponse, type NextRequest } from "next/server";

import { stockT } from "@/modules/stock/i18n";
import { undoSkipStockIntakeSchema } from "@/modules/stock/schemas";
import {
  PurchaseTicketBranchMismatchForStockError,
  PurchaseTicketNotFoundForStockError,
  StockBranchNotInScopeError,
  StockIntakeNotSkippedError,
  undoSkipStockIntake,
} from "@/modules/stock/service";
import { apiRequirePermission } from "@/shared/auth/api";

const t = stockT();

function readClientIp(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}

/**
 * POST /api/stock/lots/from-purchase/undo-skip
 *
 * Body: `{ purchaseTicketId: string }`.
 * Returns: the updated `EligiblePurchaseDTO` (now back to PENDING).
 *
 * Idempotency: the 409 path catches "already PENDING" so a double-click
 * doesn't produce two audit entries. The transaction's row-lock + status
 * recheck guarantees no concurrent flip can produce two PENDING events.
 */
export async function POST(request: NextRequest) {
  const guard = await apiRequirePermission("stock.undoSkipIntake");
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

  const parsed = undoSkipStockIntakeSchema.safeParse(body);
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
    const ticket = await undoSkipStockIntake(guard.user, parsed.data, {
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
    if (error instanceof StockIntakeNotSkippedError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
