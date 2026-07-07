// The app's Data Access Layer for auth, per the bundled authentication
// guide: session checks live here, CLOSE TO THE DATA, and every mutating
// Server Action calls verifySession() itself. The proxy's redirect is UX;
// this file is the security boundary.
//
// The 'server-only' import is a poison pill: any accidental import from a
// Client Component fails the build instead of silently bundling session
// logic (and the password) into the browser. ≈ a lint boundary rule, but
// enforced by the bundler.
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./constants";

// Learning-app auth: one shared admin password, overridable via env. The
// session cookie carries a token DERIVED from it (SHA-256), so the password
// itself never travels back and forth after login.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "brew-admin";

// What real apps do instead of all this: store a random session id in a DB,
// or sign a payload (JWT via `jose`). A derived-hash bearer token is the
// minimum that keeps the demo honest — the cookie value is unguessable
// without the password, but there's one session for everyone and no expiry
// beyond the cookie's own maxAge.
async function sessionToken(): Promise<string> {
  const bytes = new TextEncoder().encode(`brew-gear-session:${ADMIN_PASSWORD}`);
  // Web Crypto, not node:crypto — works in every server runtime Next uses.
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

export function checkPassword(password: string): boolean {
  // Note for production: plain === is not timing-safe; real comparisons use
  // crypto.timingSafeEqual (and real apps hash stored passwords anyway).
  return password === ADMIN_PASSWORD;
}

export async function createSession(): Promise<void> {
  const cookieStore = await cookies();
  // The option set straight from the auth guide: httpOnly keeps document
  // .cookie away from it (XSS can't read it), sameSite=lax keeps cross-site
  // POSTs from carrying it (CSRF), secure is off only for http://localhost.
  cookieStore.set(SESSION_COOKIE, await sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

// cache() memoizes per server render pass (the guide's recommendation), so
// a layout AND an action checking the session in one request hash only once.
// ≈ shareReplay(1) scoped to a single request.
export const verifySession = cache(async (): Promise<boolean> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token === (await sessionToken());
});
