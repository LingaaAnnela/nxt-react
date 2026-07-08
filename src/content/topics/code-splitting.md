---
title: Code Splitting — React.lazy and next/dynamic
description: How route-level and component-level splitting work, when to use ssr:false, and how Suspense wires it together.
order: 19
---

# Code Splitting — React.lazy and next/dynamic

Code splitting is the practice of breaking the JavaScript bundle into smaller chunks that load on demand. Users download only the code they actually need for the page they are on.

## Route-level splitting — automatic in Next.js

Next.js splits the bundle by route automatically. The JS for `/admin/stats` is never downloaded when the user visits `/products`. You get this for free — no configuration required.

```
next build output:
  ○ /products          1.2 kB  (page bundle)
  ○ /admin/stats       0.8 kB  (separate chunk, loaded only if navigated to)
  ● /products/[id]     1.1 kB
```

If you import a 500 KB charting library in `/admin/stats/page.tsx`, that 500 KB is only downloaded when a user navigates to that route — never on the homepage.

## Component-level splitting — manual with React.lazy

Within a single page, you can defer a heavy component until it's needed using `React.lazy`:

```tsx
import { lazy, Suspense } from 'react';

// The import() is a dynamic import — the module is NOT included in the
// current bundle. Instead, a separate chunk is created at build time.
// The chunk is downloaded only when React first tries to render LazyDashboard.
const LazyDashboard = lazy(() => import('@/components/StatsDashboard'));

export default function Page() {
  return (
    // Suspense catches the "suspension" from lazy() and shows the fallback
    // until the chunk finishes downloading and the component is ready.
    <Suspense fallback={<StatsSkeletonLoader />}>
      <LazyDashboard />
    </Suspense>
  );
}
```

The `import()` call is a JavaScript standard — a dynamic import that returns a Promise. Bundlers (Webpack, Turbopack) see it and create a separate output file (chunk) at build time. The chunk is not parsed or executed until `import()` is called at runtime.

## next/dynamic — the Next.js wrapper

`next/dynamic` wraps `React.lazy` and adds two Next.js-specific options:

```tsx
import dynamic from 'next/dynamic';

const StatsDashboard = dynamic(
  () => import('@/components/StatsDashboard'),
  {
    // loading: shorthand for <Suspense fallback={...}>
    // No need to wrap in <Suspense> in JSX — next/dynamic does it internally.
    loading: () => <StatsSkeletonLoader />,

    // ssr: false — skip server rendering entirely.
    // The component is not rendered on the server at all.
    // It is mounted in the browser after the page hydrates.
    ssr: false,
  },
);
```

The `loading` option is purely cosmetic — it saves writing a separate `<Suspense>` wrapper in JSX. Everything else is identical to `React.lazy`.

## When ssr: false is required

Server Components (and SSR of Client Components) run in Node.js. Browser APIs do not exist there:

```
window         → ReferenceError
document       → ReferenceError
localStorage   → ReferenceError
navigator      → ReferenceError
```

If your component reads `localStorage` and you server-render it, the server produces HTML with no localStorage value (e.g., "First visit"). The client then hydrates and reads a real date — the two renders don't match. React throws a hydration warning and re-renders, which may cause a visible flash.

`ssr: false` solves this by skipping the server render. The component is only ever rendered in the browser. There is no server output to mismatch.

```tsx
// Component that MUST use ssr: false
function LastViewed() {
  const [lastViewed, setLastViewed] = useState<string | null>(null);
  useEffect(() => {
    const prev = localStorage.getItem('last-viewed');
    localStorage.setItem('last-viewed', new Date().toISOString());
    setLastViewed(prev);
  }, []);

  return <p>Last visited: {lastViewed ?? 'First visit'}</p>;
}
```

Common cases requiring `ssr: false`:
- `localStorage` / `sessionStorage` reads that affect initial render
- `window.matchMedia` (dark mode, viewport-dependent content)
- Maps libraries (Google Maps, Mapbox) that call `document.createElement`
- WebGL/Canvas that requires `document.createElement('canvas')`

## The loading boundary — skeleton or spinner

The `loading` / `<Suspense fallback>` renders server-side and is in the initial HTML. This is what the user sees before the JS chunk arrives. A well-designed skeleton (same layout as the real content) prevents layout shift when the content loads.

The wrong approach:

```tsx
// ✗ Global spinner replaces the whole page
<Suspense fallback={<div>Loading...</div>}>
  <HeavySection />
</Suspense>
```

The right approach:

```tsx
// ✓ Skeleton matches the shape of what will appear
<Suspense fallback={<DashboardSkeleton />}>
  <StatsDashboard />
</Suspense>
```

In Next.js, `loading.tsx` files in the App Router also create Suspense boundaries — at the route level rather than the component level.

## Simulating a slow chunk for demos

In production, the delay equals the real download time. To observe the loading skeleton without throttling DevTools:

```tsx
const StatsDashboard = dynamic(
  async () => {
    // Remove in production — for demo only
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return import('@/components/StatsDashboard');
  },
  { loading: () => <StatsSkeletonLoader />, ssr: false },
);
```

## When NOT to code-split

Every dynamic import adds a network round-trip. For small components (< 10 KB), the overhead of an extra request and JS parse can exceed the savings.

**Do code-split when:**
- The component imports a heavy library: Chart.js, D3, pdf.js, a rich text editor
- The component is only shown conditionally (admin panel, settings modal, feature flag gate)
- The component uses browser-only APIs that block SSR

**Do NOT code-split when:**
- The component is small (< 20 KB)
- It is shown on every page visit
- The bundle difference is negligible after gzip

Measure with `next build` output and the Network tab — don't split speculatively.
