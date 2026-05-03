import { NextResponse, type NextRequest } from "next/server";

import { salesT } from "@/modules/sales/i18n";
import { patchSalesSchema } from "@/modules/sales/schemas";
import {
  SalesCancelReasonRequiredError,
  SalesInsufficientStockError,
  SalesLinesEmptyError,
  SalesNotFoundError,
  SalesReceivingInactiveError,
  SalesReceivingLockedError,
  SalesReceivingNotInScopeError,
  SalesStatusFieldsLockedError,
  SalesStatusTransitionError,
  SalesStockLotInactiveError,
  SalesStockLotNotActiveError,
  SalesStockLotNotFoundError,
  getSalesOrder,
  transitionSalesStatus,
  updateSalesOrderFields,
} from "@/modules/sales/service";
import type { SalesOrderStatus } from "@/modules/sales/types";
import { hasPermission } from "@/shared/auth/dal";
import { apiRequireAuth, apiRequirePermission } from "@/shared/auth/api";

const t = salesT();

function readClientIp(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await apiRequirePermission("sales.read");
  if (!guard.ok) return guard.response;

  const { id } = await context.params;
  const sale = await getSalesOrder(guard.user, id);
  if (!sale) {
    return NextResponse.json({ error: t.errors.notFound }, { status: 404 });
  }
  return NextResponse.json({ sale });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  // Auth first; per-action permission gate happens after we know if this is
  // a status transition vs. a field update.
  const auth = await apiRequireAuth();
  if (!auth.ok) return auth.response;
  const me = auth.user;

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

  const parsed = patchSalesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: t.errors.validation,
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const meta = {
    ipAddress: readClientIp(request),
    userAgent: request.headers.get("user-agent"),
    source: "api" as const,
  };

  try {
    if (parsed.data.status !== undefined) {
      const to = parsed.data.status as SalesOrderStatus;
      const requiredPermission =
        to === "CONFIRMED" ? "sales.confirm" : "sales.cancel";
      if (!hasPermission(me, requiredPermission)) {
        return NextResponse.json(
          { error: t.errors.permissionDenied },
          { status: 403 },
        );
      }
      const sale = await transitionSalesStatus(
        me,
        id,
        to,
        parsed.data.cancelReason,
        meta,
      );
      return NextResponse.json({ sale });
    }

    // Field update branch — needs sales.create (same as draft authorship).
    if (!hasPermission(me, "sales.create")) {
      return NextResponse.json(
        { error: t.errors.permissionDenied },
        { status: 403 },
      );
    }
    const {
      status: _ignored,
      cancelReason: _ignored2,
      ...rest
    } = parsed.data;
    void _ignored;
    void _ignored2;
    const sale = await updateSalesOrderFields(me, id, rest, meta);
    return NextResponse.json({ sale });
  } catch (error) {
    if (error instanceof SalesNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof SalesStatusFieldsLockedError) {
      return NextResponse.json(
        {
          error: error.message,
          fields: { [error.field]: error.message },
        },
        { status: 400 },
      );
    }
    if (
      error instanceof SalesStatusTransitionError ||
      error instanceof SalesCancelReasonRequiredError ||
      error instanceof SalesStockLotInactiveError ||
      error instanceof SalesStockLotNotActiveError ||
      error instanceof SalesStockLotNotFoundError ||
      error instanceof SalesLinesEmptyError
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof SalesInsufficientStockError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof SalesReceivingLockedError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (
      error instanceof SalesReceivingNotInScopeError ||
      error instanceof SalesReceivingInactiveError
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
