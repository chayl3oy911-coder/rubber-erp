import { NextResponse, type NextRequest } from "next/server";

import { transitionStatusSchema } from "@/modules/purchase/schemas";
import {
  CancelReasonRequiredError,
  PurchaseHasStockLotError,
  PurchaseNotFoundError,
  StatusTransitionError,
  transitionPurchaseStatus,
} from "@/modules/purchase/service";
import { PURCHASE_STATUSES, type PurchaseStatus } from "@/modules/purchase/status";
import { apiRequirePermission } from "@/shared/auth/api";

function readClientIp(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}

/**
 * Build a tiny `400 Bad Request` payload. The list UI only has room to
 * surface one short line in a toast, so we standardise on a single
 * `error` string and never include a Zod issue tree. The response
 * shape stays JSON-only because every caller already does `res.json()`.
 */
function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

/** Type guard — narrows an unknown JSON value to a plain object. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    value !== null && typeof value === "object" && !Array.isArray(value)
  );
}

const ALLOWED_STATUSES = new Set<string>(PURCHASE_STATUSES);

/**
 * POST /api/purchase-tickets/[id]/transition
 *
 * Body: `{ status: PurchaseStatus, cancelReason?: string }`
 *
 * Single endpoint for every forward / cancel transition driven by the
 * /purchases list UI. The same status machine is also reachable via
 * the server action used by the detail page, so we route both through
 * `transitionPurchaseStatus` after validation.
 *
 * Validation strategy — three layers, fail-fast:
 *
 *   1. **JSON shape guard** (this file): JSON parse, plain-object,
 *      `status` present and a known enum value. We do this BEFORE
 *      Zod so we can produce short, actionable messages
 *      ("status is required" / "invalid status") instead of the
 *      structured Zod tree.
 *   2. **Schema parse** (Zod via `transitionStatusSchema`): catches
 *      `cancelReason` length/preprocessing rules. We deliberately
 *      mirror the server-action call shape (always pass both keys)
 *      so the shared schema doesn't need to change.
 *   3. **Status machine + permissions** (`transitionPurchaseStatus`):
 *      the source of truth for what transitions are allowed from
 *      `from` → `to`, branch scope, and stock-lot guards.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  // ─── Layer 1: shape guards ────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("invalid json");
  }

  if (!isPlainObject(body)) {
    return badRequest("body must be an object");
  }

  const rawStatus = body.status;
  if (rawStatus === undefined || rawStatus === null) {
    return badRequest("status is required");
  }
  if (typeof rawStatus !== "string") {
    return badRequest("status must be a string");
  }
  if (!ALLOWED_STATUSES.has(rawStatus)) {
    // Rejected here — before Zod — so the response stays a single
    // human line. Reaching the schema would yield the same outcome
    // but with the longer i18n'd `statusInvalid` message which we
    // reserve for in-form (server action) feedback.
    return badRequest("invalid status");
  }

  // `cancelReason` may be missing entirely on JSON requests. We pass
  // it through verbatim and let Zod's `optionalText` preprocess
  // normalise empty/whitespace strings to `undefined`. The KEY must
  // be present on the parser input even when undefined — see the
  // server-action call shape — otherwise Zod 4 rejects the
  // preprocess wrapper as non-optional.
  const rawCancelReason =
    "cancelReason" in body ? body.cancelReason : undefined;

  // ─── Layer 2: schema parse ────────────────────────────────────────────
  const parsed = transitionStatusSchema.safeParse({
    status: rawStatus,
    cancelReason: rawCancelReason,
  });
  if (!parsed.success) {
    // Collapse to one short line. We've already validated `status`
    // ourselves, so any failure here is on `cancelReason` length.
    const issue = parsed.error.issues[0];
    const path = issue?.path.join(".") || "body";
    const message = issue?.message ?? "invalid";
    return badRequest(
      path === "body" ? message : `${path}: ${message}`,
    );
  }

  const target: PurchaseStatus = parsed.data.status;
  const requiredPermission =
    target === "APPROVED"
      ? "purchase.approve"
      : target === "CANCELLED"
        ? "purchase.cancel"
        : "purchase.update";

  const guard = await apiRequirePermission(requiredPermission);
  if (!guard.ok) return guard.response;

  const { id } = await ctx.params;

  // ─── Layer 3: status machine ──────────────────────────────────────────
  try {
    const ticket = await transitionPurchaseStatus(
      guard.user,
      id,
      target,
      parsed.data.cancelReason,
      {
        ipAddress: readClientIp(request),
        userAgent: request.headers.get("user-agent"),
        source: "api",
      },
    );
    return NextResponse.json({ ticket }, { status: 200 });
  } catch (error) {
    if (error instanceof PurchaseNotFoundError) {
      return NextResponse.json(
        { error: "purchase not found" },
        { status: 404 },
      );
    }
    if (error instanceof CancelReasonRequiredError) {
      return badRequest("cancel reason required");
    }
    if (
      error instanceof StatusTransitionError ||
      error instanceof PurchaseHasStockLotError
    ) {
      // 409 Conflict — the request was well-formed but conflicts with
      // the current document state (illegal transition, lot already
      // exists, etc). The service-thrown `error.message` is already
      // i18n'd and user-facing, so we forward it verbatim.
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
