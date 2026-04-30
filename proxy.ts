import { NextResponse, type NextRequest } from "next/server";

import { updateProxySession } from "@/shared/lib/supabase/proxy";

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { user, response } = await updateProxySession(request);
  const pathname = request.nextUrl.pathname;

  const PROTECTED_PREFIXES = [
    "/dashboard",
    "/branches",
    "/farmers",
    "/purchases",
  ];
  const needsAuth = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  const isLoginPage = pathname === "/login";

  if (!user && needsAuth) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
