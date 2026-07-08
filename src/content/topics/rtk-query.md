---
title: Data Fetching — RTK Query
description: How RTK Query replaces useEffect fetches, how cache tags work, and the two-cache model in Next.js.
order: 2
---

# Data Fetching — RTK Query

RTK Query is Redux Toolkit's built-in data fetching and caching solution. It eliminates the boilerplate of `useEffect` + `useState` + manual loading/error tracking by generating React hooks from a single API definition.

**Angular analogy:** RTK Query ≈ NgRx + Effects + EntityAdapter bundled together, with the HTTP layer and cache management included.

## Why not useEffect + fetch?

The naive data-fetching pattern in React looks like this:

```tsx
'use client';
function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(data => { setProducts(data); setLoading(false); });
  }, []);

  if (loading) return <p>Loading...</p>;
  return <ul>{products.map(p => <li key={p.id}>{p.name}</li>)}</ul>;
}
```

Problems with this approach:

- **No caching** — every mount triggers a new fetch, even for the same data
- **No deduplication** — if two components mount at the same time, two identical requests fire
- **No background refetching** — stale data stays stale
- **Manual state** — loading, error, and data flags all managed by hand
- **Cleanup** — the effect needs a cleanup function to avoid setting state on an unmounted component

RTK Query handles all of this automatically.

## Setting up createApi

The entire API surface is defined once in `src/lib/redux/api.ts`:

```ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  tagTypes: ['Product'],
  endpoints: (build) => ({
    getProducts: build.query<Product[], void>({
      query: () => 'api/products',
      providesTags: ['Product'],
    }),
    updateProduct: build.mutation<...>({
      // queryFn instead of query — wraps a Server Action directly.
      // No HTTP endpoint needed; RTK Query only cares about { data } | { error }.
      queryFn: async (args) => {
        const result = await updateProductAction(args);
        return result.status === 'success'
          ? { data: result.product }
          : { error: result.message };
      },
      invalidatesTags: (result) =>
        result ? ['Product'] : [],
    }),
  }),
});
```

`createApi` generates typed React hooks automatically. You never write `useGetProductsQuery` — it is generated from the endpoint name `getProducts`.

## Using the generated hooks

```tsx
'use client';
function ProductList() {
  // data, isLoading, isError — all from one hook call.
  // RTK Query caches the result; a second component calling the same hook
  // gets the cached data with zero extra network requests.
  const { data: products, isLoading, isError } = useGetProductsQuery();

  if (isLoading) return <p>Loading...</p>;
  if (isError) return <p>Failed to load.</p>;
  return <ul>{products!.map(p => <li key={p.id}>{p.name}</li>)}</ul>;
}
```

```tsx
'use client';
function EditForm({ product }) {
  const [updateProduct, { isLoading }] = useUpdateProductMutation();

  async function handleSubmit(data) {
    const result = await updateProduct({ id: product.id, ...data }).unwrap();
    // unwrap() re-throws on error so you can catch it.
  }
}
```

## Cache tags — automatic invalidation

Tags connect queries to mutations. A query declares which tags it **provides**; a mutation declares which tags it **invalidates**.

```ts
getProducts: build.query({
  providesTags: ['Product'],       // this cache entry is tagged 'Product'
}),
deleteProduct: build.mutation({
  invalidatesTags: ['Product'],    // removing a product invalidates all 'Product' entries
}),
```

When `deleteProduct` succeeds, RTK Query finds every cached query tagged `'Product'` and refetches it. Any component subscribed to `useGetProductsQuery` updates automatically — no manual `dispatch(fetchProducts())` needed.

**Angular analogy:** dispatching a reload action in NgRx after a mutation, but the connection is declared in one place rather than wired in effects.

## queryFn — wrapping a Server Action

When there is no HTTP endpoint, use `queryFn` instead of `query`. This lets RTK Query call a Server Action directly:

```ts
updateProduct: build.mutation({
  queryFn: async ({ id, ...changes }) => {
    // Server Action — runs on the server, returns a discriminated union.
    const result = await updateProductAction({ id, ...changes });
    // RTK Query only cares about { data } or { error }.
    if (result.status === 'success') return { data: result.product };
    return { error: { status: 'CUSTOM_ERROR', error: result.message } };
  },
  // Function form: invalidate only on success (when queryFn returned { data }).
  invalidatesTags: (result) => (result ? ['Product'] : []),
}),
```

## The two-cache model

Next.js maintains **two independent caches**:

| Cache | What it holds | Invalidated by |
|---|---|---|
| Router cache (server) | HTML and RSC payloads per route | `revalidatePath()` in a Server Action |
| RTK Query cache (client) | Fetched data in memory | `invalidatesTags()` in a mutation |

A Server Action that mutates data must call **both**:

```ts
// Inside a Server Action:
await db.updateProduct(id, changes);
revalidatePath('/products');          // bust the server router cache
// Then on the client, the mutation hook calls invalidatesTags — busts the RTK cache.
```

Calling only `revalidatePath` leaves the client's RTK cache stale. Calling only `invalidatesTags` leaves the server's router cache stale. They are independent and must both be addressed.

## Optimistic updates

For mutations that are very likely to succeed, RTK Query's `onQueryStarted` callback lets you patch the cache immediately — before the server responds — and undo the patch on failure:

```ts
updateProduct: build.mutation({
  async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
    // Patch the cache immediately (optimistic).
    const patchResult = dispatch(
      api.util.updateQueryData('getProducts', undefined, (draft) => {
        const product = draft.find(p => p.id === id);
        if (product) Object.assign(product, patch);
      }),
    );
    try {
      await queryFulfilled; // wait for the real server response
    } catch {
      patchResult.undo();   // server rejected — roll back
    }
  },
}),
```

The Immer draft in `updateQueryData` produces both the forward patch and its inverse automatically. `patchResult.undo()` applies the inverse — no manual rollback logic needed.
