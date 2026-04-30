import { NextResponse, type NextRequest } from "next/server";

import { purchaseT } from "@/modules/purchase/i18n";
import { patchPurchaseSchema } from "@/modules/purchase/schemas";
import {
  CancelReasonRequiredError,
  PurchaseHasStockLotError,
  PurchaseNotFoundError,
  StatusFieldsLockedError,
  StatusTransitionError,
  transitionPurchaseStatus,
  updatePurchaseFields,
} from "@/modules/purchase/service";
import { apiRequirePermission } from "@/shared/auth/api";

const t = purchaseT();

function readClientIp(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: t.errors.invalidJson },
      { status: 400 },
    );
  }

  const parsed = patchPurchaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: t.errors.validation,
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const auditMeta = {
    ipAddress: readClientIp(request),
    userAgent: request.headers.get("user-agent"),
    source: "api" as const,
  };

  // Status transition path — permission depends on target.
  if (data.status !== undefined) {
    const permission =
      data.status === "APPROVED"
        ? "purchase.approve"
        : data.status === "CANCELLED"
          ? "purchase.cancel"
          : "purchase.update";
    const guard = await apiRequirePermission(permission);
    if (!guard.ok) return guard.response;

    try {
      const purchase = await transitionPurchaseStatus(
        guard.user,
        id,
        data.status,
        data.cancelReason,
        auditMeta,
      );
      return NextResponse.json({ purchase });
    } catch (error) {
      if (error instanceof PurchaseNotFoundError) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error instanceof StatusTransitionError) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      if (error instanceof CancelReasonRequiredError) {
        return NextResponse.json(
          {
            error: error.message,
            fields: { cancelReason: [error.message] },
          },
          { status: 400 },
        );
      }
      if (error instanceof PurchaseHasStockLotError) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      throw error;
    }
  }

  // Field updates path — always purchase.update.
  const guard = await apiRequirePermission("purchase.update");
  if (!guard.ok) return guard.response;

  try {
    const purchase = await updatePurchaseFields(
      guard.user,
      id,
      {
        rubberType: data.rubberType,
        grossWeight: data.grossWeight,
        tareWeight: data.tareWeight,
        pricePerKg: data.pricePerKg,
        note: data.note,
      },
      auditMeta,
    );
    return NextResponse.json({ purchase });
  } catch (error) {
    if (error instanceof PurchaseNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof StatusFieldsLockedError) {
      return NextResponse.json(
        {
          error: error.message,
          fields: { [error.field]: [error.message] },
        },
        { status: 409 },
      );
    }
    throw error;
  }
}
