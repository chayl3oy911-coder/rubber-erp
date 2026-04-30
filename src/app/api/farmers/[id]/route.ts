import { NextResponse, type NextRequest } from "next/server";

import { farmerT } from "@/modules/farmer/i18n";
import { updateFarmerSchema } from "@/modules/farmer/schemas";
import {
  FarmerCodeConflictError,
  FarmerNotFoundError,
  updateFarmer,
} from "@/modules/farmer/service";
import { apiRequirePermission } from "@/shared/auth/api";

const t = farmerT();

function readClientIp(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await apiRequirePermission("farmer.update");
  if (!guard.ok) return guard.response;

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

  // Defensive: even if a client sends `branchId`, drop it. Branch transfer is
  // out of scope for this round (see plan §1).
  if (body && typeof body === "object" && "branchId" in body) {
    delete (body as Record<string, unknown>).branchId;
  }

  const parsed = updateFarmerSchema.safeParse(body);
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
    const farmer = await updateFarmer(guard.user, id, parsed.data, {
      ipAddress: readClientIp(request),
      userAgent: request.headers.get("user-agent"),
      source: "api",
    });
    return NextResponse.json({ farmer });
  } catch (error) {
    if (error instanceof FarmerNotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 },
      );
    }
    if (error instanceof FarmerCodeConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
