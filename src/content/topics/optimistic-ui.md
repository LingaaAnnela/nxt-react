---
title: Optimistic UI — RTK Query onQueryStarted
description: How to patch the client cache before the server responds and roll back on failure using RTK Query's onQueryStarted.
order: 6
---

# Optimistic UI

An optimistic update applies the expected result to the UI immediately — before the server confirms it — so the interface feels instant. If the server rejects the change, the UI rolls back.

## When is it worth adding?

Use optimistic updates when:
- The mutation is very likely to succeed (editing a product's name, not submitting a payment).
- A brief stale value is acceptable (showing the old price for a millisecond if the server rejects is fine).
- The latency is noticeable without it.

Do **not** use optimistic updates when:
- The operation is irreversible (delete, send email, payment).
- The server may reject with data the client can't predict (inventory check, uniqueness constraint).
- The user needs confirmation that the server accepted the change before proceeding.

In Brew Gear, `updateProduct` is optimistic; `deleteProduct` is intentionally pessimistic (it waits for server confirmation before removing from the UI) — a useful contrast.

## The mechanism — onQueryStarted

RTK Query's `onQueryStarted` callback fires immediately when a mutation is dispatched, before the network request completes. It receives `dispatch` and a `queryFulfilled` promise.

```ts
updateProduct: build.mutation<Product, UpdateArgs>({
  async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
    // 1. Patch the cache immediately — the UI updates now.
    const patchResult = dispatch(
      api.util.updateQueryData('getProducts', undefined, (draft) => {
        const product = draft.find((p) => p.id === id);
        if (product) Object.assign(product, patch);
      }),
    );

    try {
      // 2. Wait for the real server response.
      const { data: serverProduct } = await queryFulfilled;

      // 3. Reconcile with the actual server value (more accurate than the patch).
      dispatch(
        api.util.updateQueryData('getProducts', undefined, (draft) => {
          const product = draft.find((p) => p.id === id);
          if (product) Object.assign(product, serverProduct);
        }),
      );
    } catch {
      // 4. Server rejected — roll back to the pre-patch state.
      patchResult.undo();
    }
  },
}),
```

## api.util.updateQueryData and Immer

`api.util.updateQueryData` takes the endpoint name, its arguments, and a recipe function. Inside the recipe, `draft` is an [Immer](https://immerjs.github.io/immer/) proxy of the cached data — you mutate it directly and Immer produces the immutable update.

Crucially, `updateQueryData` returns a `patchResult` containing **both the forward patch and its inverse**. Calling `patchResult.undo()` applies the inverse — reverting to exactly the state before the patch. You write zero rollback logic.

```ts
// What Immer does under the hood:
// draft = mutable proxy of ['productA', 'productB', 'productC']
// After: Object.assign(product, { name: 'New Name' })
// Immer produces: structurally new array with the one product updated
// patchResult.undo() applies the inverse: restores the old product
```

## Why the patch value runs the zod schema

The optimistic patch must predict what the server will return. The form fields hold raw input values (price as a string like `"24.50"`), but the server returns structured data (price as integer cents `2450`). If we patched the cache with the raw string, the UI would flicker when the server returned the integer.

```ts
// In the edit form — before dispatching the mutation:
const parsed = productSchema.parse(formData); // "24.50" → 2450

// The optimistic patch uses the parsed value:
Object.assign(product, { ...patch, priceCents: parsed.priceCents });
```

Running the same zod schema that the server uses makes the optimistic value structurally identical to the server's response. It's a prediction derived from the contract, not a guess.

## The pessimistic contrast — deleteProduct

`deleteProduct` uses `invalidatesTags` instead of `onQueryStarted`. It waits for the server to confirm the deletion before refetching the list.

```ts
deleteProduct: build.mutation<void, string>({
  queryFn: async (id) => {
    const result = await deleteProductAction(id);
    return result.ok ? { data: undefined } : { error: result.message };
  },
  // Function form: only invalidate (and refetch) on success.
  invalidatesTags: (result) => (result !== undefined ? [] : ['Product']),
}),
```

Why pessimistic here? Deleting is irreversible. If we removed the product from the UI immediately and the server failed, we'd need to re-add it — complex and error-prone. Waiting the extra 500ms for confirmation is the right tradeoff.

## Visualising the timeline

```
User clicks Save
  ↓
Mutation dispatched
  ├── onQueryStarted fires immediately
  │     └── Cache patched → UI shows new name instantly
  │
  ├── Network request in flight (500ms)
  │
  └── queryFulfilled resolves
        ├── Success → cache reconciled with server value
        └── Failure → patchResult.undo() → UI reverts
```
