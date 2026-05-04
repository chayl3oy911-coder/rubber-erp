import { NextResponse, type NextRequest } from "next/server";

import { cancelPurchaseReturnSchema } from "@/modules/purchase-return/schemas";
import {
  PurchaseReturnAlreadyCancelledError,
  PurchaseReturnAlreadyConfirmedError,
  PurchaseReturnBranchMismatchError,
  PurchaseReturnNotDraftError,
  PurchaseReturnNotFoundError,
  PurchaseReturnPermissionDeniedError,
  cancelPurchaseReturnDraft,
} from "@/modules/purchase-return/service";
import { apiRequirePermission } from "@/shared/auth/api";

function readClientIp(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}

// POST /api/purchase-returns/[id]/cancel — cancel a DRAFT (no stock effect)
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await apiRequirePermission("purchase.return.cancel");
  if (!guard.ok) return guard.response;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = cancelPurchaseReturnSchema.safeParse(body);
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
    const purchaseReturn = await cancelPurchaseReturnDraft(
      guard.user,
      id,
      parsed.data,
      {
        ipAddress: readClientIp(request),
        userAgent: request.headers.get("user-agent"),
        source: "api",
      },
    );
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
      error instanceof PurchaseReturnNotDraftError
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
