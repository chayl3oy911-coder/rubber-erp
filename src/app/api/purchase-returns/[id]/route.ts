import { NextResponse } from "next/server";

import {
  PurchaseReturnBranchMismatchError,
  PurchaseReturnNotFoundError,
  PurchaseReturnPermissionDeniedError,
  getPurchaseReturnById,
} from "@/modules/purchase-return/service";
import { apiRequirePermission } from "@/shared/auth/api";

// GET /api/purchase-returns/[id]
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await apiRequirePermission("purchase.return.read");
  if (!guard.ok) return guard.response;

  const { id } = await ctx.params;

  try {
    const purchaseReturn = await getPurchaseReturnById(guard.user, id);
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
    throw error;
  }
}
