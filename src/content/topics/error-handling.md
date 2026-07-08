---
title: Error Handling — error.tsx and not-found.tsx
description: How Next.js App Router error boundaries and 404 pages work, and how to scope them to specific route segments.
order: 7
---

# Error Handling — error.tsx and not-found.tsx

The App Router provides two special files for handling failure states: `error.tsx` for unexpected runtime errors and `not-found.tsx` for intentional 404s. Both are co-located with the routes they protect and scope to their segment of the tree.

## not-found.tsx — intentional 404s

`notFound()` is a function imported from `next/navigation`. Calling it terminates the current render and triggers the nearest `not-found.tsx` boundary. It also sets the HTTP response status to **404** — not just a visual change.

```tsx
// app/products/[id]/page.tsx
import { notFound } from 'next/navigation';

export default async function ProductDetailPage({ params }) {
  const { id } = await params;
  const product = products.find((p) => p.id === id);

  if (!product) notFound(); // throws — execution stops here

  return <main>...</main>;
}
```

```tsx
// app/products/[id]/not-found.tsx — Server Component, no directive needed
import Link from 'next/link';

export default function ProductNotFound() {
  return (
    <main>
      <h1>Product not found</h1>
      <p>This product may have been removed.</p>
      <Link href="/products">← Back to all products</Link>
    </main>
  );
}
```

**`notFound()` behaves like `throw`** — it is not a conditional, it terminates. Code after it is unreachable (TypeScript knows this too — no need for a return after `notFound()`).

## The not-found boundary hierarchy

Next.js walks **up** the route tree from the `notFound()` call and renders the nearest `not-found.tsx` it finds. This means you can have:

```
app/
  not-found.tsx              ← global fallback ("Page not found")
  products/
    [id]/
      not-found.tsx          ← scoped ("Product not found") — this one wins
```

The scoped file wins because it is closer. Delete `app/products/[id]/not-found.tsx` and the global one takes over automatically. This lets you give specific, helpful messages at each level without duplicating the global fallback everywhere.

The global `app/not-found.tsx` also handles URLs that match **no route at all** (e.g. `/gibberish`).

## error.tsx — unexpected runtime errors

`error.tsx` catches errors thrown during rendering of any page or component in its segment. It must be a **Client Component** — non-negotiable.

```tsx
'use client'; // REQUIRED — React Error Boundaries must be Client Components

import { useEffect } from 'react';

export default function ProductsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Send to your error tracker (Sentry, Datadog, etc.)
    console.error('[ProductsError]', error.message, error.digest);
  }, [error]);

  return (
    <main>
      <h1>Something went wrong</h1>
      <p>{error.message}</p>
      {error.digest && <p>Reference: {error.digest}</p>}
      <button onClick={reset}>Try again</button>
    </main>
  );
}
```

**Why must it be a Client Component?** React Error Boundaries — the mechanism that catches render-time throws — are class components under the hood. Next.js wraps `error.tsx` in one automatically, but only for Client Components. There is no Server Component equivalent.

## The two props

**`error`** — the thrown `Error` object. In production, Next.js may sanitise `error.message` to avoid leaking server internals. `error.digest` is always safe: it's a short hash that identifies the error instance in server logs. You can display it to the user ("share this reference with support") without exposing stack traces.

**`reset`** — calls React's `ErrorBoundary.reset()` internally, which re-renders the failed segment without a page reload. The component tree is re-mounted and the data fetch is retried. If the error was transient (network blip, service restart), `reset()` often recovers without user navigation.

## Scoping — what error.tsx catches

`error.tsx` catches errors thrown **below** it in the tree — in the page and its child components. It does **not** catch errors in the layout at the same level. To catch root layout errors, you need `global-error.tsx`.

```
app/
  layout.tsx          ← errors here NOT caught by app/error.tsx
  error.tsx           ← catches errors in all children of app/layout.tsx
  products/
    layout.tsx        ← errors here NOT caught by app/products/error.tsx
    error.tsx         ← catches errors in /products and /products/[id] pages
    page.tsx          ← errors here caught by products/error.tsx ✓
    [id]/
      page.tsx        ← errors here also caught by products/error.tsx ✓
```

## Testing the error boundary

Add `SIMULATE_PRODUCTS_ERROR=true` to `.env.local` and restart the dev server. The `/api/products` route handler throws, the products page `fetch` fails, and the error boundary at `app/products/error.tsx` catches it. Click "Try again" to see `reset()` in action.

## not-found vs error — choosing between them

| Situation | Use |
|---|---|
| Resource doesn't exist (unknown ID, deleted item) | `notFound()` + `not-found.tsx` |
| Unexpected runtime error (DB down, parse failure) | `throw` + `error.tsx` |
| URL matches no route | Handled automatically by `app/not-found.tsx` |

The key distinction: `notFound()` is **intentional** (you checked and the item isn't there — this is expected). `error.tsx` catches **unexpected** throws (something went wrong that shouldn't have).
