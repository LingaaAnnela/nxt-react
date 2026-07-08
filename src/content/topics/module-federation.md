---
title: Module Federation — Runtime Code Sharing
description: How webpack 5 Module Federation works, how to wire it in Next.js, and the trade-offs vs. build-time sharing.
order: 21
---

# Module Federation — Runtime Code Sharing

Module Federation is a webpack 5 feature that lets one application load code from **another separately deployed application at runtime** — without bundling that code ahead of time and without a full-page reload.

It is the mechanism that makes [Micro Frontends](/learn/micro-frontends) practical: Team A can ship a new version of the catalog slice and every app that consumes it picks up the change **without rebuilding or redeploying**.

## Mental model

Think of it like a dynamic `import()` that crosses deployment boundaries:

```
Normal code splitting (same build):
  import('./HeavyChart')         → loads a chunk from YOUR own server

Module Federation (cross-deployment):
  loadRemote('catalog/ProductCard')  → loads a chunk from catalog.acme.com
```

Both produce the same result in the browser: a JS chunk fetched on demand. The difference is where the chunk lives and when it was built.

## Key vocabulary

| Term | Meaning |
|---|---|
| **Remote** | An app that exposes components/modules for others to consume |
| **Host** | An app that loads components from one or more remotes |
| **Exposed module** | A specific file a remote makes available (`./ProductCard`) |
| **Shared dependency** | A library (e.g. `react`) that host and remote agree to share one copy of |

An app can be both a host and a remote at the same time.

## How it works — step by step

### 1. Remote declares what it exposes

In the remote's webpack config (or `next.config.ts`):

```js
// catalog app — next.config.ts
import { NextFederationPlugin } from '@module-federation/nextjs-mf';

export default {
  webpack(config) {
    config.plugins.push(
      new NextFederationPlugin({
        name: 'catalog',
        filename: 'static/chunks/remoteEntry.js',   // entry manifest
        exposes: {
          './ProductCard': './src/components/ProductCard',
        },
        shared: {
          react: { singleton: true, requiredVersion: false },
          'react-dom': { singleton: true, requiredVersion: false },
        },
      })
    );
    return config;
  },
};
```

At build time webpack emits `remoteEntry.js` — a small manifest that maps exposed names to the real chunk URLs.

### 2. Host declares which remotes to load

```js
// shell app — next.config.ts
new NextFederationPlugin({
  name: 'shell',
  remotes: {
    catalog: 'catalog@https://catalog.acme.com/_next/static/chunks/remoteEntry.js',
  },
  shared: { react: { singleton: true }, 'react-dom': { singleton: true } },
});
```

### 3. Host consumes the remote component

```tsx
// In the shell — lazy-load the remote component
import dynamic from 'next/dynamic';

const RemoteProductCard = dynamic(
  () => import('catalog/ProductCard'),   // webpack resolves this at runtime
  { ssr: false, loading: () => <Skeleton /> }
);

export default function ShellPage() {
  return <RemoteProductCard productId="42" />;
}
```

At runtime, when `ShellPage` renders, webpack fetches `remoteEntry.js` from `catalog.acme.com`, resolves the `ProductCard` chunk URL, fetches that chunk, and renders the component — all without the shell knowing anything about ProductCard's internals at build time.

## Shared dependencies — the critical config

Without `shared`, both the host and remote bundle their own copy of React. The browser ends up running **two Reacts**, and hooks break (hooks require a single React instance per page).

```js
shared: {
  react: {
    singleton: true,       // only one copy allowed — error if versions clash
    requiredVersion: false, // don't enforce a specific version
    eager: true,           // include in the initial chunk, not lazy
  },
}
```

`singleton: true` is mandatory for `react`, `react-dom`, and any context-based library. For a utility library like `lodash`, sharing is optional.

## Module Federation in Next.js

Next.js uses webpack internally, so Module Federation works — but there are rough edges:

**Package options:**

- [`@module-federation/nextjs-mf`](https://github.com/module-federation/universe/tree/main/packages/nextjs-mf) — community package, widely used, supports App Router and Pages Router
- [`@module-federation/enhanced`](https://github.com/module-federation/core) — newer, framework-agnostic, growing Next.js support

**Known friction points:**

1. **SSR + remote components**: A remote component fetched at runtime can't be server-rendered by the host (the host doesn't have the source). Use `ssr: false` in `next/dynamic` for federated components, or deploy the remote with its own SSR and pass the HTML.

2. **TypeScript**: Types from the remote aren't available in the host at build time. Common workaround: the remote publishes a `@types/...` package separately, or you use `declare module 'catalog/ProductCard'`.

3. **Turbopack**: As of Next.js 16, Turbopack (the default dev bundler) does not support Module Federation. You must run `next dev --turbo false` for federation to work in development.

4. **Version mismatches**: If the host uses React 19 and the remote uses React 18, `singleton: true` will throw. Both sides must agree on the React version.

## Angular analogy

In Angular, `@angular-architects/native-federation` is the equivalent. It exposes Angular components as "federation modules", and `loadRemoteModule()` is called in the Angular router:

```ts
// Angular shell router config
{
  path: 'catalog',
  loadChildren: () => loadRemoteModule({
    type: 'manifest',
    remoteName: 'catalog',
    exposedModule: './CatalogModule',
  }).then(m => m.CatalogModule)
}
```

The concepts map directly: remote → remote, host → shell, `exposes` → `exposes`, `shared` → `shared`. The Angular version has better SSR support because Angular Universal and Module Federation were designed together; the React/Next.js combination is more manually wired.

## Trade-offs at a glance

| | Module Federation | Build-time (npm) | Route-level proxy |
|---|---|---|---|
| Independent deploy | ✅ | ❌ | ✅ |
| SPA navigation | ✅ | ✅ | ❌ |
| TypeScript DX | ⚠️ manual | ✅ | ❌ no types |
| SSR support | ⚠️ limited | ✅ | ✅ (each app SSRs itself) |
| Operational complexity | High | Low | Medium |
| Suitable for Next.js App Router | ⚠️ beta-ish | ✅ | ✅ |

## Practical advice

Module Federation is the right tool when:
- You have **multiple teams** deploying independently and need SPA navigation across slices
- The shared components are **large enough** that duplicating them in every bundle would hurt perf
- Teams can align on a **shared React version**

It is not the right tool when:
- One team owns the frontend — a monorepo with shared packages is simpler
- You're on Next.js App Router and need full SSR for federated components — the support is still maturing
- You need strict TypeScript safety across team boundaries at build time

## Further reading

- [Module Federation docs](https://module-federation.io)
- [`@module-federation/nextjs-mf` repo](https://github.com/module-federation/universe/tree/main/packages/nextjs-mf)
- [Micro Frontends architecture overview](/learn/micro-frontends)
