---
title: Metadata API — Titles, SEO, and Open Graph
description: How Next.js generates <head> tags from metadata exports and generateMetadata functions across the route tree.
order: 9
---

# Metadata API

Next.js generates all `<head>` content — `<title>`, meta descriptions, Open Graph tags, robots directives — from `metadata` exports in layout and page files. No `<Head>` component, no `document.title` calls, no manual tag management.

## Static metadata export

Export a typed `Metadata` object from any `layout.tsx` or `page.tsx`:

```ts
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Learn',
  description: 'Concept reference for React, Next.js, and Redux.',
};
```

Next.js reads this at build time and renders the appropriate `<head>` tags. Nothing in this export runs in the browser — it's purely server-side.

## title.template — the most important pattern

Setting the brand suffix in every file is repetitive and error-prone. `title.template` in the root layout solves this once:

```ts
// app/layout.tsx
export const metadata: Metadata = {
  title: {
    template: '%s — Brew Gear',  // %s is replaced by the child page's title
    default: 'Brew Gear',        // shown when a page exports no title at all
  },
  description: 'Premium coffee gear for the serious home brewer.',
};
```

Now every page just exports a short title:

```ts
// app/products/page.tsx
export const metadata: Metadata = { title: 'Products' };
// Renders as: <title>Products — Brew Gear</title>

// app/learn/page.tsx
export const metadata: Metadata = { title: 'Learn' };
// Renders as: <title>Learn — Brew Gear</title>
```

**Angular analogy:** Angular's `Title` service called in every component's `ngOnInit` — but declarative and automatically composed across the route tree rather than set imperatively per component.

## generateMetadata — dynamic titles

When the title depends on route params or fetched data, use the async `generateMetadata` function instead of the static export. It receives the same `params` and `searchParams` Promise props as the page.

```ts
// app/products/[id]/page.tsx
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = products.find((p) => p.id === id);
  if (!product) return {}; // page's notFound() handles the 404

  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [{ url: product.imageUrl, width: 400, height: 300 }],
    },
  };
}
```

**Next.js deduplicates the `params` await** — even though both `generateMetadata` and the page component await the same `params` Promise, Next.js resolves it once and shares the result.

## Search queries in titles

Because the search filter lives in the URL, `generateMetadata` can reflect it:

```ts
// app/products/page.tsx
export async function generateMetadata({ searchParams }) {
  const { q } = await searchParams;
  return {
    title: q ? `Search: "${q}"` : 'Products',
    description: q ? `Products matching "${q}".` : 'Browse all products.',
  };
}
```

The browser tab now reads `Search: "grinder" — Brew Gear` when `?q=grinder` is in the URL. Share that URL and the recipient sees the context before the page loads.

## Metadata inheritance — how it composes

Next.js **deep-merges** every `metadata` export in the active route tree, with the closest file winning on conflicts:

```
Root layout metadata:
  title.template: '%s — Brew Gear'
  description: 'Premium coffee gear...'
  openGraph.siteName: 'Brew Gear'

Page metadata:
  title: 'Aero Press Go'
  description: 'Portable espresso-style coffee maker.'
  openGraph.images: [{ url: '...' }]

Merged result:
  title: 'Aero Press Go — Brew Gear'       ← template applied
  description: 'Portable espresso-style...' ← page wins
  openGraph.siteName: 'Brew Gear'            ← inherited from layout
  openGraph.images: [{ url: '...' }]         ← from page
```

Fields the page doesn't set are inherited from the layout. Fields the page does set override the layout. The merge is deep — `openGraph` from both sources is combined, not replaced.

## Open Graph — social sharing cards

The `openGraph` key generates `<meta property="og:...">` tags. When a URL is shared on Slack, Twitter, LinkedIn, or iMessage, the platform fetches the page and reads these tags to build the preview card.

```ts
openGraph: {
  title: 'Aero Press Go',
  description: 'Portable espresso-style coffee maker for travel.',
  images: [{ url: 'https://picsum.photos/seed/p1/400/300', width: 400, height: 300 }],
  type: 'website',
  siteName: 'Brew Gear',
}
```

## robots — keeping pages out of search engines

```ts
// app/admin/layout.tsx — applies to every /admin/* route
export const metadata: Metadata = {
  robots: { index: false },
};
```

This emits `<meta name="robots" content="noindex">` on every admin page. Search engines that respect the tag will not index them. Because it's in the layout — not each page — you set it once and it applies to the entire subtree.

## Where metadata runs

`metadata` exports and `generateMetadata` functions **only run on the server**. They never ship JavaScript to the browser. The generated tags appear in the initial HTML `<head>` — readable by crawlers and link-preview scrapers without executing any client-side code.
