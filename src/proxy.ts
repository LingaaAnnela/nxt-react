import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";

// proxy.ts — Next 16's rename of middleware.ts (same machinery). Runs before
// every matched request, so it must stay cheap: the docs call this an
// OPTIMISTIC check — presence of the session cookie only, no verification.
// A forged cookie gets past this redirect and sees the admin FORMS, but
// every mutating Server Action calls verifySession() and rejects it — the
// proxy is a doorman for UX, the DAL is the lock. ≈ an Angular route guard,
// with the same caveat: canActivate never made an API secure either.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The login page is the one public /admin route (it must be reachable to
  // fix the very condition being checked).
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  if (!request.cookies.has(SESSION_COOKIE)) {
    const loginUrl = new URL("/admin/login", request.nextUrl);
    // Carry the intended destination so login can bounce back — the same
    // returnUrl dance every Angular auth guard does.
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Only /admin/* pays the cost of this function; every other route skips
  // it entirely. Matcher syntax, not a regex — :path* means any depth.
  matcher: "/admin/:path*",
};
