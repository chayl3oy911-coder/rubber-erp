import { NextResponse, type NextRequest } from "next/server";

import { purchaseT } from "@/modules/purchase/i18n";
import {
  createPurchaseSchema,
  listPurchasesQuerySchema,
} from "@/modules/purchase/schemas";
import {
  BranchNotInScopeError,
  CustomerBranchMismatchError,
  CustomerInactiveError,
  CustomerNotFoundForPurchaseError,
  PurchaseAutoGenError,
  createPurchase,
  listPurchases,
} from "@/modules/purchase/service";
import type { PurchaseStatus } from "@/modules/purchase/status";
import { apiRequirePermission } from "@/shared/auth/api";

const t = purchaseT();

function readClientIp(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}

export async function GET(request: NextRequest) {
  const guard = await apiRequirePermission("purchase.read");
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const parsed = listPurchasesQuerySchema.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    branchId: url.searchParams.get("branchId") ?? undefined,
    customerId: url.searchParams.get("customerId") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    dateFrom: url.searchParams.get("dateFrom") ?? undefined,
    dateTo: url.searchParams.get("dateTo") ?? undefined,
    includeInactive: url.searchParams.get("includeInactive") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: t.errors.validation,
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const result = await listPurchases(guard.user, {
    ...parsed.data,
    status: parsed.data.status as ReadonlyArray<PurchaseStatus> | undefined,
  });
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const guard = await apiRequirePermission("purchase.create");
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

  const parsed = createPurchaseSchema.safeParse(body);
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
    const purchase = await createPurchase(guard.user, parsed.data, {
      ipAddress: readClientIp(request),
      userAgent: request.headers.get("user-agent"),
      source: "api",
    });
    return NextResponse.json({ purchase }, { status: 201 });
  } catch (error) {
    if (error instanceof BranchNotInScopeError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof CustomerNotFoundForPurchaseError) {
      // Customer id given but doesn't exist anywhere — distinct from
      // "exists but in another branch", which is a 400 (logical conflict).
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (
      error instanceof CustomerBranchMismatchError ||
      error instanceof CustomerInactiveError
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof PurchaseAutoGenError) {
      // Retries exhausted because every attempt collided — semantically a
      // conflict, not a service outage.
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
