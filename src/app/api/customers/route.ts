import { NextResponse, type NextRequest } from "next/server";

import { customerT } from "@/modules/customer/i18n";
import {
  createCustomerSchema,
  listCustomersQuerySchema,
} from "@/modules/customer/schemas";
import {
  BranchNotInScopeError,
  CustomerBankAccountConflictError,
  CustomerBankAccountValidationError,
  CustomerCodeAutoGenError,
  CustomerCodeConflictError,
  createCustomer,
  listCustomers,
} from "@/modules/customer/service";
import { apiRequirePermission } from "@/shared/auth/api";

const t = customerT();

function readClientIp(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}

export async function GET(request: NextRequest) {
  const guard = await apiRequirePermission("customer.read");
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const parsed = listCustomersQuerySchema.safeParse({
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

  const result = await listCustomers(guard.user, parsed.data);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const guard = await apiRequirePermission("customer.create");
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

  const parsed = createCustomerSchema.safeParse(body);
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
    const customer = await createCustomer(guard.user, parsed.data, {
      ipAddress: readClientIp(request),
      userAgent: request.headers.get("user-agent"),
      source: "api",
    });
    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    if (error instanceof BranchNotInScopeError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
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
    if (error instanceof CustomerCodeAutoGenError) {
      // Auto-gen retries exhausted because every attempt collided with a
      // concurrent insert — semantically a conflict, not a service outage.
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
