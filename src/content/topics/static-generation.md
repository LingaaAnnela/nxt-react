---
title: Static Generation — generateStaticParams
description: How to pre-render dynamic routes at build time, what dynamicParams controls, and how to read the next build output.
order: 10
---

# Static Generation — generateStaticParams

By default, dynamic routes like `/products/[id]` are **server-rendered on demand** — every request triggers a render. `generateStaticParams` tells Next.js to pre-render specific param values at build time instead, producing static HTML files that are served instantly with no server work per request.

## How it works

Export an async function named `generateStaticParams` from a dynamic route segment. It returns an array of param objects — one per page to pre-render.

```ts
// app/products/[id]/page.tsx
export async function generateStaticParams(): Promise<{ id: string }[]> {
  // At build time: return all param values to pre-render.
  // This can fetch from a DB, CMS, or any data source.
  return products.map((p) => ({ id: p.id }));
}
```

Next.js calls this function **once during `next build`**, iterates the returned array, and generates a static HTML file for each product. The component code itself doesn't change — it's still a Server Component, still calls `products.find()`, still calls `notFound()`. Only WHEN it runs changes: build time instead of request time.

**Angular analogy:** Angular Universal's prerender routes array, but colocated with the route and typed to match the segment's shape automatically.

## The build output symbols

Running `next build` prints a route table. The three symbols tell you the rendering strategy at a glance:

```
○  /learn                    Static   — no params, no data, pre-rendered once
●  /products/[id]            SSG      — pre-rendered via generateStaticParams
   ├ /products/p1
   ├ /products/p2
   └ [+4 more paths]
ƒ  /products                 Dynamic  — server-rendered per request
ƒ  /admin/products/new       Dynamic  — server-rendered per request
```

- **○ Static:** pre-rendered at build time, completely static HTML. No data fetching.
- **● SSG:** pre-rendered at build time with `generateStaticParams`. One HTML file per returned param.
- **ƒ Dynamic:** server-rendered on every request. Required when the page reads cookies, headers, or uses `connection()`.

The topic guide pages in this app (`/learn/[topic]`) are `●` — they read markdown files at build time via `generateStaticParams`, producing one HTML file per topic.

## dynamicParams — what happens for unknown params

`dynamicParams` controls what Next.js does when a visitor hits a URL whose param was **not** returned by `generateStaticParams`:

```ts
// app/products/[id]/page.tsx
export const dynamicParams = true; // default
```

| Value | Behaviour |
|---|---|
| `true` (default) | Fall through to SSR — render the unknown param on demand |
| `false` | Return 404 immediately — no server render for unknown params |

**`dynamicParams = true`** keeps admin CRUD working: a product added at runtime gets a UUID that wasn't in the build's `generateStaticParams` list, but the detail page still renders on demand for that UUID.

**`dynamicParams = false`** is correct when all valid params are known at build time and you want strict enforcement — a URL like `/products/fake-id` returns 404 without any rendering work.

## Why the products listing page cannot be static

The `/products` listing page calls `connection()` and fetches from `/api/products`:

```ts
// app/products/page.tsx
async function getProducts() {
  await connection(); // ← explicitly opts out of pre-rendering
  const res = await fetch(`${base}/api/products`);
  return res.json();
}
```

`connection()` is a Next.js function that tells the build: "this page has request-time I/O — do not try to pre-render me." Without it, `next build` would attempt the fetch at build time, fail with `ECONNREFUSED` (no server is running during a build), and crash.

Even without `connection()`, a page that fetches from a URL whose content changes frequently wouldn't benefit from static generation — you'd be serving stale data.

## Static vs dynamic — the tradeoff

| | Static (●) | Dynamic (ƒ) |
|---|---|---|
| When rendered | Once at build time | Every request |
| Serve time | Instant (pre-built file) | Server processing time |
| Data freshness | Stale until rebuild | Always current |
| Suitable for | Content known at build time | User-specific, frequently changing |
| Examples | Product detail pages, blog posts, topic guides | Search results, admin pages, cart |

## Incremental Static Regeneration (ISR) — a next step

For content that changes but not on every request, ISR lets you set a revalidation window:

```ts
export const revalidate = 60; // re-render this page at most once per minute
```

After a static page is served, Next.js regenerates it in the background if a request comes in after `revalidate` seconds. The next visitor gets the fresh version. This bridges the gap between "always static" and "always dynamic" — the product listing could use ISR with `revalidate = 30` to stay reasonably fresh without a server render per request.
