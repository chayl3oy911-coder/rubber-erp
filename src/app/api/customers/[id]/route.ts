import { NextResponse, type NextRequest } from "next/server";

import { customerT } from "@/modules/customer/i18n";
import { updateCustomerSchema } from "@/modules/customer/schemas";
import {
  CustomerBankAccountConflictError,
  CustomerBankAccountValidationError,
  CustomerCodeConflictError,
  CustomerNotFoundError,
  updateCustomer,
} from "@/modules/customer/service";
import { apiRequirePermission } from "@/shared/auth/api";

const t = customerT();

function readClientIp(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await apiRequirePermission("customer.update");
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
  // out of scope.
  if (body && typeof body === "object" && "branchId" in body) {
    delete (body as Record<string, unknown>).branchId;
  }

  const parsed = updateCustomerSchema.safeParse(body);
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
    const customer = await updateCustomer(guard.user, id, parsed.data, {
      ipAddress: readClientIp(request),
      userAgent: request.headers.get("user-agent"),
      source: "api",
    });
    return NextResponse.json({ customer });
  } catch (error) {
    if (error instanceof CustomerNotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 },
      );
    }
    if (error instanceof CustomerCodeConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof CustomerBankAccountConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof CustomerBankAccountValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
