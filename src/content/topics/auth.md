---
title: Auth — Two-Layer Design
description: How Brew Gear combines middleware and a Data Access Layer for defence-in-depth authentication.
order: 5
---

# Auth — Two-Layer Design

Authentication in a Next.js App Router application works best as two distinct layers: a fast **optimistic check** at the edge, and a **real boundary** at the data layer. Using only one of these leaves a gap.

## Why two layers?

A single middleware check is fast but coarse — it can only see cookie presence, not cookie validity. A single server-side check is authoritative but only runs where you remember to add it. Combining them gives defence in depth:

- **Layer 1 (middleware):** redirect 99% of unauthenticated requests before they touch any rendering code.
- **Layer 2 (DAL):** verify every mutating action regardless of how the request arrived, including crafted cookies that bypassed the middleware check.

## Layer 1 — proxy.ts (middleware)

`src/proxy.ts` (Next.js 16's rename of `middleware.ts`) runs on every request matching the `/admin` path, before any page renders.

```ts
// src/proxy.ts
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const session = request.cookies.get('session')?.value;

  // Optimistic check: cookie PRESENCE only, not value.
  // Speed matters here — this runs on every /admin request.
  // A forged cookie with any value passes this check.
  if (!session) {
    const from = request.nextUrl.pathname;
    return NextResponse.redirect(
      new URL(`/admin/login?from=${encodeURIComponent(from)}`, request.url),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
```

**What the middleware does NOT do:** verify the token value. That would require a crypto operation or a DB lookup on every single request — expensive at scale. The middleware is a speed gate, not a security boundary.

## Layer 2 — DAL (verifySession)

`src/lib/auth/session.ts` is the real boundary. Every Server Action that mutates data calls `verifySession()` before doing anything.

```ts
// src/lib/auth/session.ts
import 'server-only'; // build error if this file is imported on the client
import { cache } from 'react';
import { cookies } from 'next/headers';

// React cache() deduplicates calls within one React render tree.
// Three Server Components on the same request each calling verifySession()
// results in ONE cookie read and ONE hash comparison.
// ≈ an Angular route guard memoised for the duration of the request.
export const verifySession = cache(async (): Promise<boolean> => {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) return false;

  const expected = await deriveToken(process.env.ADMIN_PASSWORD!);
  return token === expected;
});
```

```ts
// Inside a Server Action — the DAL check runs before any mutation:
export async function updateProduct(data: FormData) {
  const authed = await verifySession();
  if (!authed) throw new Error('Unauthorised');

  // ... proceed with mutation
}
```

Even if an attacker crafts a valid-looking cookie that bypasses the middleware, the DAL's `verifySession` rejects the forged token because it checks the value against the server-derived hash.

## The session cookie

```ts
// On successful login:
cookieStore.set('session', token, {
  httpOnly: true,   // JS cannot read it — XSS cannot steal it
  sameSite: 'lax',  // not sent on cross-site POST — CSRF mitigation
  secure: process.env.NODE_ENV === 'production',
  path: '/',
});
```

- **`httpOnly`:** the cookie is invisible to `document.cookie` and therefore to any XSS script.
- **`SameSite: Lax`:** the cookie IS sent on top-level navigations (clicking a link from another site) but NOT on cross-site POST or fetch requests. This prevents CSRF without breaking normal navigation.
- **`secure`:** HTTPS only in production (prevents interception over plain HTTP).

## The `server-only` poison pill

```ts
import 'server-only'; // top of session.ts
```

`server-only` is an npm package with a single purpose: if any Client Component (or a module imported by one) imports `session.ts`, the Next.js build fails with a clear error. It enforces the module boundary at compile time — the DAL can never accidentally ship to the browser bundle. ≈ marking a service as unavailable in the browser build in Angular.

## The login form — security details

```ts
// The action echoes NO field values back on failure — never echo passwords.
// `from` is open-redirect-guarded: only relative paths are accepted.
export async function login(prevState: State, formData: FormData): Promise<State> {
  const password = formData.get('password') as string;
  const from = formData.get('from') as string;

  const token = await deriveToken(process.env.ADMIN_PASSWORD!);
  const isValid = await timingSafeEqual(password, process.env.ADMIN_PASSWORD!);
  if (!isValid) return { status: 'error', message: 'Invalid password' };

  // Open redirect guard: only allow relative paths
  const redirectTo = from?.startsWith('/') ? from : '/admin/products/new';

  await createSession(token);
  redirect(redirectTo);
}
```

**Timing-safe comparison:** a plain `password === expected` leaks timing information (longer match = more characters correct). A constant-time comparison like `crypto.timingSafeEqual` always takes the same time regardless of where strings diverge.

## Summary of the request lifecycle

```
Browser → /admin/products/new
  ↓
proxy.ts (middleware)
  → cookie absent?  redirect to /admin/login
  → cookie present? continue (optimistic pass)
  ↓
AdminLayout (Server Component)
  → verifySession() — React cache, one call per request
  ↓
Server Action (mutation)
  → verifySession() again — same cache hit, no extra work
  → value matches?  proceed
  → value wrong?    throw Unauthorised
```
