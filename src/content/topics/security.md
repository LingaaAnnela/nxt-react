---
title: Security — XSS, CSP, and Token Storage
description: How React protects against XSS by default, how to avoid breaking that protection, CSP headers, and safe token storage patterns.
order: 17
---

# Security — XSS, CSP, and Token Storage

Security is a guaranteed JPMC interview topic. Financial applications have stricter requirements than typical SaaS. These are the patterns examiners actually ask about.

## How React prevents XSS by default

Cross-Site Scripting (XSS) is the injection of malicious script into a page via user-controlled content. React's JSX escapes all string values before rendering them:

```tsx
const userComment = '<script>document.cookie="stolen"</script>';

// React escapes this — renders as literal text, not as a script tag
return <p>{userComment}</p>;
// DOM output: <p>&lt;script&gt;document.cookie="stolen"&lt;/script&gt;</p>
```

This is React's single most important security property. You get it for free as long as you use JSX interpolation for any user-controlled content.

## When you break this protection — dangerouslySetInnerHTML

The only way to inject raw HTML into React is explicit:

```tsx
// ✓ Safe — source is filesystem markdown we control, not user input
<article dangerouslySetInnerHTML={{ __html: topicData.html }} />

// ✗ Dangerous — content came from a user form field or API that accepts user input
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

The "dangerous" in the prop name is intentional and load-bearing — it's a signal to every reviewer to ask "where does this HTML come from?"

**Rule:** `dangerouslySetInnerHTML` is only safe when the HTML originates from:
1. Source code or build-time generated content (markdown files, CMS with a trusted editor)
2. A server-side sanitizer that removes script/event-handler attributes (e.g., `DOMPurify`)

If `html` comes from user input, run it through `DOMPurify.sanitize(html)` before passing it to `dangerouslySetInnerHTML`.

## href injection — the second XSS vector

User-controlled URLs in `href` or `src` attributes allow `javascript:` injection:

```tsx
const profileUrl = 'javascript:alert(document.cookie)';

// ✗ Dangerous — clicking this runs the script
<a href={profileUrl}>Profile</a>

// ✓ Validate URLs before rendering them
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.href);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

<a href={isSafeUrl(profileUrl) ? profileUrl : '#'}>Profile</a>
```

Next.js's `<Link>` component applies the same URL validation as the browser's navigation — `javascript:` hrefs are blocked. But raw `<a>` tags with user-controlled `href` are still vulnerable.

## Content Security Policy (CSP)

CSP is an HTTP response header that tells the browser which origins are allowed to load scripts, styles, images, and other resources. Even if an XSS attack injects a `<script>` tag, CSP prevents it from executing (if the injected script doesn't match the policy).

```
# Strict CSP for a Next.js app using a nonce-based approach:
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{random}';
  style-src 'self' 'nonce-{random}';
  img-src 'self' data: https://images.unsplash.com;
  connect-src 'self' https://api.myapp.com;
  frame-ancestors 'none';
```

**`'nonce-{random}'`** — the server generates a cryptographically random value per request and injects it as an attribute on every legitimate `<script>` and `<style>` tag. The CSP allows only elements with that exact nonce. An injected script can't know the nonce ahead of time, so it's blocked.

In Next.js, implement a nonce-based CSP in middleware:

```ts
// src/middleware.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export function middleware() {
  const nonce = crypto.randomBytes(16).toString('base64');
  const csp = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}';
    style-src 'self' 'nonce-${nonce}' 'unsafe-inline';
  `.replace(/\s{2,}/g, ' ').trim();

  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('x-nonce', nonce); // for layout.tsx to read
  return response;
}
```

## Token storage — where NOT to put JWTs

| Location | XSS safe | CSRF safe | Notes |
|---|---|---|---|
| `localStorage` | No | Yes | Readable by any JS on the page — a full XSS steals it |
| `sessionStorage` | No | Yes | Same as localStorage — cleared on tab close but still XSS-vulnerable |
| In-memory (React state) | Yes | Yes | Lost on refresh; not suitable for persistent auth |
| `httpOnly` cookie | **Yes** | No | JS cannot read it — XSS cannot steal it |
| `httpOnly` + `SameSite=Lax` cookie | **Yes** | **Yes** | Best default for session tokens in a same-origin app |

**The recommendation:** store auth tokens in `httpOnly; SameSite=Lax; Secure` cookies, not in localStorage. The `httpOnly` flag makes the cookie inaccessible to JavaScript — an XSS attack that reads `document.cookie` gets nothing. `SameSite=Lax` blocks cross-origin form-POST CSRF. `Secure` ensures the cookie is only sent over HTTPS.

Next.js `cookies()` from `next/headers` reads these cookies in Server Components and Server Actions without exposing them to client-side JavaScript:

```ts
'use server';
import { cookies } from 'next/headers';

async function verifySession() {
  const token = (await cookies()).get('session')?.value;
  if (!token) redirect('/login');
  // verify token...
}
```

## CSRF — Cross-Site Request Forgery

CSRF tricks an authenticated user's browser into making an unwanted request to your API. If your API uses cookies for auth (recommended), it's CSRF-vulnerable without mitigation.

**Mitigations:**
1. `SameSite=Lax` or `SameSite=Strict` on the auth cookie — prevents the cookie from being sent with cross-origin requests initiated by a third-party site.
2. **Double-submit cookie pattern** — include a random token in both a cookie and a request header; the server verifies they match. Cross-origin requests can't set custom headers.
3. **Next.js App Router Server Actions** include a built-in CSRF check — they verify the `Origin` header matches the server's origin before executing.

`SameSite=Lax` (the browser's default for cookies without an explicit `SameSite` attribute since 2020) covers the most common CSRF vectors. Combine it with `httpOnly` for defence in depth.

## Security headers checklist for Next.js

Set these in `next.config.ts` or middleware:

```ts
// next.config.ts
const headers = [
  { key: 'X-Frame-Options', value: 'DENY' },           // no iframe embedding
  { key: 'X-Content-Type-Options', value: 'nosniff' }, // no MIME sniffing
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];
```

`X-Frame-Options: DENY` prevents clickjacking — your page can't be embedded in an iframe on another origin. The `frame-ancestors 'none'` CSP directive is the modern equivalent.
