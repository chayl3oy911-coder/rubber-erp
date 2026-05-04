import { NextResponse, type NextRequest } from "next/server";

import { cancelPurchaseAfterSkipSchema } from "@/modules/purchase-return/schemas";
import {
  CancelReasonRequiredError,
  PurchaseHasStockLotError,
  PurchaseNotFoundError,
  PurchaseNotSkippedForCancelError,
  StatusTransitionError,
  cancelPurchaseAfterSkip,
} from "@/modules/purchase/service";
import { apiRequirePermission } from "@/shared/auth/api";

function readClientIp(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}

// POST /api/purchase-tickets/[id]/cancel-after-skip
//
// Body: { reason: string }  (≥ 5 chars after trim)
// Response: { ticket: PurchaseTicketDTO }
//
// 404 — ticket not found OR not in actor's branch scope
// 403 — missing `purchase.cancelAfterSkip` permission
// 409 — wrong status (not APPROVED) OR not skipped OR stock lot exists
// 400 — empty/short reason or other validation error
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await apiRequirePermission("purchase.cancelAfterSkip");
  if (!guard.ok) return guard.response;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = cancelPurchaseAfterSkipSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation error",
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const ticket = await cancelPurchaseAfterSkip(
      guard.user,
      id,
      parsed.data.reason,
      {
        ipAddress: readClientIp(request),
        userAgent: request.headers.get("user-agent"),
        source: "api",
      },
    );
    return NextResponse.json({ ticket }, { status: 200 });
  } catch (error) {
    if (error instanceof PurchaseNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (
      error instanceof StatusTransitionError ||
      error instanceof PurchaseNotSkippedForCancelError ||
      error instanceof PurchaseHasStockLotError
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof CancelReasonRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
