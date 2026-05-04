import { NextResponse, type NextRequest } from "next/server";

import { stockT } from "@/modules/stock/i18n";
import { bulkCreateLotsFromPurchaseSchema } from "@/modules/stock/schemas";
import { bulkCreateLotsFromPurchase } from "@/modules/stock/service";
import { apiRequirePermission } from "@/shared/auth/api";

const t = stockT();

function readClientIp(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}

/**
 * POST /api/stock/lots/from-purchase/bulk
 *
 * Body: `{ ticketIds: string[] }` (1..50, schema-validated).
 * Returns: `{ created: BulkCreateResultItem[]; failed: BulkCreateFailureItem[] }`
 *
 * Always returns HTTP 200 — even if every item failed — because the
 * partial-success semantics are encoded in the body, not the status code.
 * The client decides between toast variants based on the body lengths.
 *
 * Per-item errors live in `failed[].reason` (already locale-aware via the
 * service's i18n dictionary). Truly unexpected errors (DB connection lost,
 * etc.) bubble up to a 500 from the service layer.
 *
 * Single-create flows (the per-row "สร้าง Stock Lot" button) reuse this
 * endpoint with `ticketIds: [id]` so we have one code path to harden.
 */
export async function POST(request: NextRequest) {
  const guard = await apiRequirePermission("stock.create");
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

  const parsed = bulkCreateLotsFromPurchaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: t.errors.validation,
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const result = await bulkCreateLotsFromPurchase(guard.user, parsed.data, {
    ipAddress: readClientIp(request),
    userAgent: request.headers.get("user-agent"),
    source: "api",
  });
  return NextResponse.json(result, { status: 200 });
}
