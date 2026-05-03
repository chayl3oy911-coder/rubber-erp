import { NextResponse, type NextRequest } from "next/server";

import { receivingAccountT } from "@/modules/receivingAccount/i18n";
import { setDefaultReceivingEntitySchema } from "@/modules/receivingAccount/schemas";
import {
  ReceivingBankAccountValidationError,
  ReceivingEntityNotFoundError,
  setReceivingEntityDefault,
} from "@/modules/receivingAccount/service";
import { apiRequirePermission } from "@/shared/auth/api";

const t = receivingAccountT();

function readClientIp(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}

export async function POST(
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

  const parsed = setDefaultReceivingEntitySchema.safeParse(body);
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
    const entity = await setReceivingEntityDefault(
      guard.user,
      id,
      parsed.data.isDefault,
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
    if (error instanceof ReceivingBankAccountValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
