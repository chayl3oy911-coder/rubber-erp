import { NextResponse, type NextRequest } from "next/server";

import { apiRequirePermission } from "@/shared/auth/api";
import { updateBranchSchema } from "@/modules/branch/schemas";
import {
  BranchCodeConflictError,
  BranchNotFoundError,
  updateBranch,
} from "@/modules/branch/service";

function readClientIp(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const guard = await apiRequirePermission("branch.update");
  if (!guard.ok) return guard.response;

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "รูปแบบข้อมูลไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  const parsed = updateBranchSchema.safeParse(body);
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
    const branch = await updateBranch(guard.user, id, parsed.data, {
      ipAddress: readClientIp(request),
      userAgent: request.headers.get("user-agent"),
      source: "api",
    });
    return NextResponse.json({ branch });
  } catch (error) {
    if (error instanceof BranchNotFoundError) {
      return NextResponse.json(
        { error: "ไม่พบสาขาที่ระบุ" },
        { status: 404 }
      );
    }
    if (error instanceof BranchCodeConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
