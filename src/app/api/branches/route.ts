import { NextResponse, type NextRequest } from "next/server";

import { apiRequirePermission } from "@/shared/auth/api";
import { createBranchSchema } from "@/modules/branch/schemas";
import {
  BranchCodeConflictError,
  createBranch,
  listBranches,
} from "@/modules/branch/service";

function readClientIp(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}

export async function GET(request: NextRequest) {
  const guard = await apiRequirePermission("branch.read");
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const includeInactive = url.searchParams.get("includeInactive") === "true";

  const branches = await listBranches(guard.user, { includeInactive });
  return NextResponse.json({ branches });
}

export async function POST(request: NextRequest) {
  const guard = await apiRequirePermission("branch.create");
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "รูปแบบข้อมูลไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  const parsed = createBranchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "ข้อมูลไม่ถูกต้อง",
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  try {
    const branch = await createBranch(guard.user, parsed.data, {
      ipAddress: readClientIp(request),
      userAgent: request.headers.get("user-agent"),
      source: "api",
    });
    return NextResponse.json({ branch }, { status: 201 });
  } catch (error) {
    if (error instanceof BranchCodeConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
