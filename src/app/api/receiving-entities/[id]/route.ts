import { NextResponse, type NextRequest } from "next/server";

import { receivingAccountT } from "@/modules/receivingAccount/i18n";
import { updateReceivingEntitySchema } from "@/modules/receivingAccount/schemas";
import {
  ReceivingBankAccountConflictError,
  ReceivingBankAccountValidationError,
  ReceivingDefaultReassignRequiredError,
  ReceivingEntityNotFoundError,
  ReceivingPrimaryReassignRequiredError,
  getReceivingEntity,
  updateReceivingEntity,
} from "@/modules/receivingAccount/service";
import { apiRequirePermission } from "@/shared/auth/api";

const t = receivingAccountT();

function readClientIp(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await apiRequirePermission("settings.receivingAccount.read");
  if (!guard.ok) return guard.response;

  const { id } = await context.params;
  const entity = await getReceivingEntity(guard.user, id);
  if (!entity) {
    return NextResponse.json(
      { error: t.errors.notFound },
      { status: 404 },
    );
  }
  return NextResponse.json({ entity });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await apiRequirePermission(
    "settings.receivingAccount.update",
  );
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

  // Defensive: branch transfer is out of scope. Strip branchId if a client
  // sends it.
  if (body && typeof body === "object" && "branchId" in body) {
    delete (body as Record<string, unknown>).branchId;
  }

  const parsed = updateReceivingEntitySchema.safeParse(body);
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
    const entity = await updateReceivingEntity(
      guard.user,
      id,
      parsed.data,
      {
        ipAddress: readClientIp(request),
        userAgent: request.headers.get("user-agent"),
        source: "api",
      },
    );
    return NextResponse.json({ entity });
  } catch (error) {
    if (error instanceof ReceivingEntityNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof ReceivingBankAccountConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (
      error instanceof ReceivingBankAccountValidationError ||
      error instanceof ReceivingPrimaryReassignRequiredError ||
      error instanceof ReceivingDefaultReassignRequiredError
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
