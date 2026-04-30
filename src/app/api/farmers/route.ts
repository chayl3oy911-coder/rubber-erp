import { NextResponse, type NextRequest } from "next/server";

import { farmerT } from "@/modules/farmer/i18n";
import {
  createFarmerSchema,
  listFarmersQuerySchema,
} from "@/modules/farmer/schemas";
import {
  BranchNotInScopeError,
  FarmerCodeAutoGenError,
  FarmerCodeConflictError,
  createFarmer,
  listFarmers,
} from "@/modules/farmer/service";
import { apiRequirePermission } from "@/shared/auth/api";

const t = farmerT();

function readClientIp(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}

export async function GET(request: NextRequest) {
  const guard = await apiRequirePermission("farmer.read");
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const parsed = listFarmersQuerySchema.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    branchId: url.searchParams.get("branchId") ?? undefined,
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

  const result = await listFarmers(guard.user, parsed.data);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const guard = await apiRequirePermission("farmer.create");
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

  const parsed = createFarmerSchema.safeParse(body);
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
    const farmer = await createFarmer(guard.user, parsed.data, {
      ipAddress: readClientIp(request),
      userAgent: request.headers.get("user-agent"),
      source: "api",
    });
    return NextResponse.json({ farmer }, { status: 201 });
  } catch (error) {
    if (error instanceof BranchNotInScopeError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof FarmerCodeConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof FarmerCodeAutoGenError) {
      // Auto-gen retries exhausted because every attempt collided with a
      // concurrent insert — semantically a conflict, not a service outage.
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    // Anything else falls through and Next.js returns 500 by default.
    throw error;
  }
}
