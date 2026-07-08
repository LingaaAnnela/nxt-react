---
title: Rendering Model — Server vs Client Components
description: How React Server Components and Client Components differ, when to use each, and how hydration works.
order: 1
---

# Rendering Model — Server vs Client Components

React 19 with Next.js App Router introduces two distinct types of component that serve fundamentally different roles. Understanding the boundary between them is the single most important mental model shift when coming from Angular.

## Server Components — the default

Every component in the `app/` directory is a **Server Component** by default. It runs only on the server (or at build time for static pages) and ships **zero JavaScript to the browser** — only the rendered HTML.

```tsx
// No directive needed — Server Component is the default.
// This component can be async, use Node.js APIs, import secrets.
export default async function ProductsPage() {
  const products = await db.query('SELECT * FROM products');
  return <ul>{products.map(p => <li key={p.id}>{p.name}</li>)}</ul>;
}
```

**What Server Components can do that Client Components cannot:**

- `await` data directly in the component body (no `useEffect` + `useState`)
- Import server-only modules (`fs`, `crypto`, DB drivers)
- Read environment variables that must never reach the client
- Access `cookies()`, `headers()` from `next/server`

**Angular analogy:** a template-only component with no constructor, no lifecycle hooks, and no `ngOnInit`. All the data is resolved before the template renders.

## Client Components — opt in with `'use client'`

Add `'use client'` at the top of a file to mark it and all its imports as Client Components. They run both on the server (for the initial HTML) and in the browser (for interactivity).

```tsx
'use client';

import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

You need `'use client'` when a component uses:

- React hooks: `useState`, `useEffect`, `useRef`, `useContext`, `useReducer`
- Redux hooks: `useAppSelector`, `useAppDispatch`
- Browser event handlers: `onClick`, `onChange`, `onSubmit`
- Browser-only APIs: `localStorage`, `window`, `document`

**The wrong instinct:** adding `'use client'` to a component because it receives data from a fetch. Data fetching is a Server Component concern — fetch in the parent, pass the result as a prop.

## Keep the boundary as low as possible

The `'use client'` directive infects the entire import chain below it. If you mark a large parent component as a Client Component, all its children become Client Components too, even if they have no interactivity.

**Wrong — the whole page becomes a Client Component:**

```tsx
'use client'; // ← unnecessary; only the button needs this

export default function ProductDetailPage({ product }) {
  const [added, setAdded] = useState(false);
  return (
    <main>
      <h1>{product.name}</h1>         {/* static, no JS needed */}
      <p>{product.description}</p>    {/* static, no JS needed */}
      <button onClick={() => setAdded(true)}>Add to cart</button>
    </main>
  );
}
```

**Right — push the boundary down to the interactive leaf:**

```tsx
// ProductDetailPage — Server Component (no directive)
export default async function ProductDetailPage({ params }) {
  const product = await getProduct(params.id);
  return (
    <main>
      <h1>{product.name}</h1>       {/* Server Component — no JS */}
      <p>{product.description}</p>  {/* Server Component — no JS */}
      <AddToCartButton productId={product.id} /> {/* Client Component leaf */}
    </main>
  );
}
```

```tsx
'use client'; // AddToCartButton.tsx — only this file is a Client Component
export default function AddToCartButton({ productId }) {
  const [added, setAdded] = useState(false);
  return <button onClick={() => setAdded(true)}>Add to cart</button>;
}
```

In Brew Gear, `AddToCartButton` is the Client Component leaf on the product detail page. The page itself — with the product image, name, price — is a Server Component.

## Hydration

The browser receives the initial HTML from the server (fast, readable by crawlers). Then React "wakes up" the Client Components by re-running them in the browser and attaching event listeners. This process is called **hydration**.

Server Components do **not** hydrate — they have no client-side representation. Their HTML is inert; the browser doesn't run any JavaScript for them.

A **hydration mismatch** occurs when the HTML the server sent differs from what React produces during hydration. This causes a warning and a full client re-render, which can cause a flash of content. Common causes: reading `window` or `localStorage` during the initial render, using `Date.now()` or random values without a seed.

## Passing data across the boundary

A Server Component can pass serializable data down to a Client Component as props. The rule: the data must be JSON-serialisable (strings, numbers, plain objects, arrays). Functions, class instances, and `undefined` cannot cross the boundary.

```tsx
// Server Component passes a plain object to a Client Component — fine.
<AddToCartButton productId={product.id} productName={product.name} />

// Server Component cannot pass a function to a Client Component.
<AddToCartButton onAdd={() => console.log('added')} /> // ← build error
```

Client Components **cannot** import Server Components. The dependency always flows downward: Server → Client, never Client → Server.

## In this app

| Component | Type | Reason |
|---|---|---|
| `ProductsPage` | Server | Fetches data, no hooks |
| `ProductDetailPage` | Server | Fetches data, no hooks |
| `AddToCartButton` | Client | `useAppSelector`, `dispatch`, `onClick` |
| `ShopHeader` | Client | `useAppSelector`, `dispatch` |
| `CartDrawer` | Client | `useAppSelector`, `dispatch` |
| `ProductEditForm` | Client | `useForm`, `useRouter` |
| `LearnPage` | Server | Static content, no interactivity |
