---
title: Micro Frontends — Architecture & Patterns
description: What micro frontends are, the four main composition strategies, trade-offs, and when the pattern is (and isn't) worth it.
order: 20
---

# Micro Frontends — Architecture & Patterns

Micro frontends apply the microservices idea to the UI layer: instead of one big frontend monolith, the application is composed of independently developed, tested, and deployed frontend pieces — each owned by a separate team.

If you've worked with Angular in a large enterprise, you've likely felt the pain this pattern tries to solve: one repo shared by five teams, a 40-minute CI build, and a release train that means no team can ship without coordinating with everyone else.

## The core idea

Each "micro frontend" is a self-contained slice of the UI — often aligned to a business domain:

```
┌─────────────────────────────────────────────────┐
│                  Shell / Host App               │
│  ┌───────────┐  ┌────────────┐  ┌────────────┐  │
│  │  Catalog  │  │    Cart    │  │  Checkout  │  │
│  │  Team A   │  │   Team B   │  │   Team C   │  │
│  └───────────┘  └────────────┘  └────────────┘  │
└─────────────────────────────────────────────────┘
```

Each slice can use a different framework version, deploy independently, and be tested in isolation. The **shell** (also called the **host**) composes them into a single page.

## Four composition strategies

### 1. Build-time composition (npm packages)

Teams publish their slice as an npm package. The shell imports and bundles it at build time.

```
shell/package.json
  "dependencies": {
    "@acme/catalog-ui": "^2.4.0",   // Team A's package
    "@acme/cart-ui":    "^1.9.0"    // Team B's package
  }
```

**Pro:** simple, type-safe, tree-shakeable.  
**Con:** the shell must rebuild and redeploy when any team ships — defeats the "independent deploy" goal. This is really just a **monorepo**, not a true micro frontend.

---

### 2. Route-level composition (separate deployments)

Each team deploys a standalone Next.js / React app. A reverse proxy (Nginx, Vercel rewrites, Cloudflare) routes by path prefix to the right origin:

```
/catalog/*   → catalog.internal (Team A's deployment)
/cart/*      → cart.internal    (Team B's deployment)
/checkout/*  → checkout.internal (Team C's deployment)
```

The user sees one domain; each team deploys independently. This is the **lowest-friction** approach and works with any framework.

**Con:** navigation between slices is a full-page reload (crossing deployment boundaries). Shared state (e.g. cart count in the header) is hard — usually solved with a cookie, URL param, or a tiny shared API.

---

### 3. Runtime composition — Module Federation

Webpack 5's Module Federation lets one app load components from another app's bundle **at runtime**, without a full-page reload. This is covered in the [Module Federation guide](/learn/module-federation).

---

### 4. Web Components / iframes

**iframes** give hard isolation (separate JS context, CSS scope) but make communication painful and accessibility near-impossible.

**Web Components** (`customElements.define('acme-cart', ...)`) are framework-agnostic and work across Angular/React/Vue. Useful when teams genuinely use different frameworks. The downside: they are verbose, lack SSR support, and lose React's performance model.

## Shared concerns

Every micro frontend architecture must solve the same set of cross-cutting problems:

| Concern | Common solution |
|---|---|
| Shared auth session | httpOnly cookie on the root domain |
| Design consistency | Published component library / design tokens |
| Shared state (cart count) | URL, cookie, custom event, or lightweight store |
| Routing | Shell owns the router; slices get `basename` |
| Shared dependencies (React) | Module Federation `shared:` config, or CDN singleton |
| Error isolation | Error boundaries per slice so one crash doesn't kill the page |

## Angular analogy

In Angular, `@angular-architects/module-federation` (now `@angular-architects/native-federation`) is the standard tool. It wraps webpack Module Federation with Angular-specific scaffolding, giving you `loadRemoteModule()` calls in the Angular router config. The concepts are identical; only the configuration surface differs.

## When micro frontends are worth it

**Worth it when:**
- Multiple autonomous teams share a frontend and deploy on different cadences
- Different parts of the app have genuinely different tech stacks or stability requirements
- Build times and CI coupling are already causing shipping friction

**Not worth it when:**
- A single team owns the whole frontend — you get all the complexity with none of the team autonomy benefit
- The app is small or medium-sized — a well-structured monorepo is simpler
- You're in a startup or early product — the operational overhead delays shipping

> Rule of thumb: if you can fit your entire frontend team in one meeting room, you don't need micro frontends.

## Further reading

- [micro-frontends.org](https://micro-frontends.org) — Cam Jackson's original writeup
- [Martin Fowler: Micro Frontends](https://martinfowler.com/articles/micro-frontends.html)
- [Module Federation guide](/learn/module-federation) — the runtime composition mechanism in detail
