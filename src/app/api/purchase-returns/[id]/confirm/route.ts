import { NextResponse, type NextRequest } from "next/server";

import {
  PurchaseReturnAlreadyCancelledError,
  PurchaseReturnAlreadyConfirmedError,
  PurchaseReturnBranchMismatchError,
  PurchaseReturnLotCancelledError,
  PurchaseReturnLotInactiveError,
  PurchaseReturnMovementConflictError,
  PurchaseReturnNotDraftError,
  PurchaseReturnNotFoundError,
  PurchaseReturnPermissionDeniedError,
  PurchaseReturnWeightTooLargeError,
  confirmPurchaseReturn,
} from "@/modules/purchase-return/service";
import { apiRequirePermission } from "@/shared/auth/api";

function readClientIp(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}

// POST /api/purchase-returns/[id]/confirm
//
// Body is empty `{}` — the URL `id` and the actor's permissions are the
// only inputs needed. Service handles all locking + validation.
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await apiRequirePermission("purchase.return.confirm");
  if (!guard.ok) return guard.response;

  const { id } = await ctx.params;

  try {
    const purchaseReturn = await confirmPurchaseReturn(guard.user, id, {
      ipAddress: readClientIp(request),
      userAgent: request.headers.get("user-agent"),
      source: "api",
    });
    return NextResponse.json({ purchaseReturn }, { status: 200 });
  } catch (error) {
    if (
      error instanceof PurchaseReturnNotFoundError ||
      error instanceof PurchaseReturnBranchMismatchError
    ) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof PurchaseReturnPermissionDeniedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (
      error instanceof PurchaseReturnAlreadyConfirmedError ||
      error instanceof PurchaseReturnAlreadyCancelledError ||
      error instanceof PurchaseReturnNotDraftError ||
      error instanceof PurchaseReturnMovementConflictError
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (
      error instanceof PurchaseReturnWeightTooLargeError ||
      error instanceof PurchaseReturnLotInactiveError ||
      error instanceof PurchaseReturnLotCancelledError
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
