import { NextResponse, type NextRequest } from "next/server";

import { receivingAccountT } from "@/modules/receivingAccount/i18n";
import {
  createReceivingEntitySchema,
  listReceivingEntitiesQuerySchema,
} from "@/modules/receivingAccount/schemas";
import {
  ReceivingBankAccountConflictError,
  ReceivingBankAccountValidationError,
  ReceivingEntityBranchNotInScopeError,
  createReceivingEntity,
  listReceivingEntities,
} from "@/modules/receivingAccount/service";
import { apiRequirePermission } from "@/shared/auth/api";

const t = receivingAccountT();

function readClientIp(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}

export async function GET(request: NextRequest) {
  const guard = await apiRequirePermission("settings.receivingAccount.read");
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const parsed = listReceivingEntitiesQuerySchema.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    branchId: url.searchParams.get("branchId") ?? undefined,
    branchScope: url.searchParams.get("branchScope") ?? undefined,
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

  const result = await listReceivingEntities(guard.user, parsed.data);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const guard = await apiRequirePermission(
    "settings.receivingAccount.create",
  );
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

  const parsed = createReceivingEntitySchema.safeParse(body);
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
    const entity = await createReceivingEntity(guard.user, parsed.data, {
      ipAddress: readClientIp(request),
      userAgent: request.headers.get("user-agent"),
      source: "api",
    });
    return NextResponse.json({ entity }, { status: 201 });
  } catch (error) {
    if (error instanceof ReceivingEntityBranchNotInScopeError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof ReceivingBankAccountConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof ReceivingBankAccountValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
