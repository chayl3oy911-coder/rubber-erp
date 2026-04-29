import "server-only";

import { currentUser, hasPermission } from "./dal";
import { InactiveAccountError, MissingAppUserError } from "./errors";
import type { AuthenticatedUser } from "./types";

export type ApiAuthResult =
  | { ok: true; user: AuthenticatedUser }
  | { ok: false; response: Response };

function buildErrorResponse(status: 401 | 403, message: string): Response {
  return Response.json({ error: message }, { status });
}

export async function apiRequireAuth(): Promise<ApiAuthResult> {
  try {
    const me = await currentUser();
    if (!me) {
      return {
        ok: false,
        response: buildErrorResponse(401, "ต้องเข้าสู่ระบบก่อนใช้งาน"),
      };
    }
    return { ok: true, user: me };
  } catch (error) {
    if (
      error instanceof MissingAppUserError ||
      error instanceof InactiveAccountError
    ) {
      return {
        ok: false,
        response: buildErrorResponse(403, error.message),
      };
    }
    throw error;
  }
}

export async function apiRequirePermission(
  code: string
): Promise<ApiAuthResult> {
  const auth = await apiRequireAuth();
  if (!auth.ok) {
    return auth;
  }
  if (!hasPermission(auth.user, code)) {
    return {
      ok: false,
      response: buildErrorResponse(403, "สิทธิ์ไม่เพียงพอสำหรับการดำเนินการนี้"),
    };
  }
  return auth;
}
