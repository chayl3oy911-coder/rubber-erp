import { NextResponse, type NextRequest } from "next/server";

import { purchaseReturnT } from "@/modules/purchase-return/i18n";
import {
  createPurchaseReturnSchema,
  listPurchaseReturnsQuerySchema,
} from "@/modules/purchase-return/schemas";
import {
  PurchaseReturnBranchMismatchError,
  PurchaseReturnIntakeNotReceivedError,
  PurchaseReturnLotCancelledError,
  PurchaseReturnLotInactiveError,
  PurchaseReturnNotFoundError,
  PurchaseReturnPermissionDeniedError,
  PurchaseReturnPurchaseNotApprovedError,
  PurchaseReturnReasonNoteRequiredError,
  PurchaseReturnWeightTooLargeError,
  createPurchaseReturnDraft,
  listPurchaseReturns,
} from "@/modules/purchase-return/service";
import { apiRequirePermission } from "@/shared/auth/api";

const t = purchaseReturnT();

function readClientIp(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}

// GET /api/purchase-returns?status=&branchId=&ticketId=&lotId=&cursor=&limit=
export async function GET(request: NextRequest) {
  const guard = await apiRequirePermission("purchase.return.read");
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const params = {
    status: url.searchParams.get("status") ?? undefined,
    branchId: url.searchParams.get("branchId") ?? undefined,
    ticketId: url.searchParams.get("ticketId") ?? undefined,
    lotId: url.searchParams.get("lotId") ?? undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  };
  const parsed = listPurchaseReturnsQuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", fields: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const result = await listPurchaseReturns(guard.user, parsed.data);
  return NextResponse.json(result, { status: 200 });
}

// POST /api/purchase-returns — create DRAFT
export async function POST(request: NextRequest) {
  const guard = await apiRequirePermission("purchase.return.create");
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createPurchaseReturnSchema.safeParse(body);
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
    const draft = await createPurchaseReturnDraft(guard.user, parsed.data, {
      ipAddress: readClientIp(request),
      userAgent: request.headers.get("user-agent"),
      source: "api",
    });
    return NextResponse.json({ purchaseReturn: draft }, { status: 201 });
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
      error instanceof PurchaseReturnWeightTooLargeError ||
      error instanceof PurchaseReturnLotInactiveError ||
      error instanceof PurchaseReturnLotCancelledError ||
      error instanceof PurchaseReturnPurchaseNotApprovedError ||
      error instanceof PurchaseReturnIntakeNotReceivedError ||
      error instanceof PurchaseReturnReasonNoteRequiredError
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    // Rethrow to surface 500 with a sanitised body via Next's default handler.
    void t;
    throw error;
  }
}
