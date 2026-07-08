---
title: URL-Driven State — searchParams and useTransition
description: How to use the URL as the source of truth for search and filter state, and how useTransition keeps the UI responsive during navigation.
order: 8
---

# URL-Driven State

The URL is often the best place to store filter, search, and pagination state. It's shareable (copy the URL, get the same view), survives a page reload, and works with the browser's back and forward buttons — all for free.

## The wrong instinct — useState for filters

```tsx
'use client';
function ProductsPage() {
  const [query, setQuery] = useState('');
  const filtered = products.filter(p => p.name.includes(query));

  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <ProductGrid products={filtered} />
    </>
  );
}
```

This works, but:
- Refresh the page → filter is lost
- Share the URL → recipient sees no filter
- Back button → doesn't restore the previous filter
- Search engines see no filtered content

## Reading URL params in a Server Component — searchParams

Next.js injects a `searchParams` prop into every page-level Server Component. It's a Promise (like `params`) and must be awaited.

```tsx
// app/products/page.tsx — Server Component
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = '' } = await searchParams;

  // Filtering happens on the server — the HTML that arrives already has
  // only the matching products. Correct for SEO and for JS-disabled users.
  const products = filterProducts(allProducts, q);

  return (
    <main>
      <Suspense fallback={<div className="search-placeholder" />}>
        <ProductSearchInput />
      </Suspense>
      <ProductGrid products={products} />
    </main>
  );
}
```

**Angular analogy:** `ActivatedRoute.snapshot.queryParams` but server-side and async.

## Reading URL params in a Client Component — useSearchParams

`useSearchParams()` is a hook that reads the live URL and re-renders the component when the URL changes. This handles browser back/forward navigation automatically.

```tsx
'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTransition, useState, useEffect } from 'react';

export default function ProductSearchInput() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const urlQuery = searchParams.get('q') ?? '';
  const [value, setValue] = useState(urlQuery);

  // Sync the input when the URL changes externally (back/forward).
  // This useEffect is valid — it responds to an external system (the URL).
  useEffect(() => {
    setValue(urlQuery);
  }, [urlQuery]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setValue(next); // instant local update — input never lags

    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set('q', next);
    else params.delete('q');

    startTransition(() => {
      router.replace(`/products?${params.toString()}`);
    });
  }

  return (
    <div>
      <input value={value} onChange={handleChange} aria-label="Search" />
      {isPending && <span>Loading…</span>}
    </div>
  );
}
```

## useTransition — keeping the UI alive during navigation

Without `startTransition`, calling `router.replace` triggers an immediate navigation. The current content disappears, `loading.tsx` shows, and the new results arrive. This causes a visible flash — even with a fast API, it's jarring.

`startTransition` marks the navigation as **non-urgent**. React keeps the current page fully visible and interactive while the server re-renders with the new query. `isPending` is `true` during this window — use it to show a subtle indicator (spinner, dimmed input) without hiding the existing results.

```
Without startTransition:
  keystroke → page blanks → loading skeleton → new results

With startTransition:
  keystroke → input updates instantly → old results stay → isPending=true → new results fade in
```

**Angular analogy:** there is no direct equivalent — Angular's router is synchronous by default. The closest mental model is an observable route resolution that keeps the previous route rendered until the new one is ready.

## Why useSearchParams needs a Suspense wrapper

`useSearchParams()` reads from the URL, which is only known at request time (not build time). During SSR, this causes the component to **suspend**. Wrapping it in `<Suspense>` isolates the suspension:

```tsx
// In the Server Component — wrap only the input, not the whole page
<Suspense fallback={<div className="search-placeholder" />}>
  <ProductSearchInput />
</Suspense>
```

Without `<Suspense>`, Next.js must bail out of static rendering for the entire page. The `fallback` should match the input's dimensions to avoid layout shift when the real component hydrates.

## The controlled input and back/forward sync

The input must be **controlled** (driven by React state) to update when the URL changes via the browser's back/forward buttons. If the input were uncontrolled (`defaultValue`), it would stay stale after navigation.

The `useEffect` that syncs `value` from `urlQuery` is one of the few genuinely valid uses of `useEffect` — it's responding to an external system (the URL bar), not to derived state from props. React's documentation calls this pattern "synchronising with external systems."

## generateMetadata — dynamic titles from URL params

Because the query lives in the URL, `generateMetadata` can reflect it in the page title:

```ts
export async function generateMetadata({ searchParams }) {
  const { q } = await searchParams;
  return {
    title: q ? `Search: "${q}"` : 'Products',
  };
}
```

Sharing `/products?q=grinder` gives the recipient a tab titled `Search: "grinder" — Brew Gear` before the page even loads.
