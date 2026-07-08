---
title: Memoization — useMemo, useCallback, React.memo
description: How React's three memoization tools work together, when they help, and when they hurt.
order: 15
---

# Memoization — useMemo, useCallback, React.memo

Memoization is one of the most commonly misunderstood areas of React. The three tools serve different purposes and only work as a system — using one without the others often achieves nothing.

## Why React re-renders by default

Every time a component's state or props change, React re-renders that component **and all its descendants**. This is intentional — React errs on the side of correctness over performance. Re-rendering is usually cheap; the virtual DOM diff that follows is what decides whether the real DOM changes.

Memoization is an optimisation to skip re-renders (or recomputations) that are demonstrably unnecessary. It is **not** a default best practice — it has a cost.

## React.memo — skip a child re-render when props haven't changed

`React.memo` is a higher-order component that wraps a function component. Before re-rendering the wrapped component, React checks whether each prop has changed (shallow equality). If nothing changed, the previous render output is reused.

```tsx
import { memo } from 'react';

const ProductCard = memo(function ProductCard({ product, onAddToCart }) {
  return (
    <li>
      <h2>{product.name}</h2>
      <button onClick={() => onAddToCart(product.id)}>Add to cart</button>
    </li>
  );
});
```

**When the check passes (no re-render):** same `product` object reference, same `onAddToCart` function reference.

**When the check fails (re-render happens anyway):** `onAddToCart` is a new function defined inline in the parent — a new object reference every parent render, even if the function body is identical.

```tsx
// Parent re-renders → new handleAdd reference → memo check fails → ProductCard re-renders
function Catalog({ products }) {
  function handleAdd(id) { dispatch(itemAdded(id)); } // new ref every render
  return products.map(p => <ProductCard product={p} onAddToCart={handleAdd} />);
}
```

This is the most common `React.memo` mistake. The memo wrapper costs memory and a comparison on every render — if the check always fails, you paid the cost for nothing.

## useCallback — stabilise function references

`useCallback(fn, deps)` returns the same function reference across renders as long as `deps` haven't changed.

```tsx
function Catalog({ products }) {
  const dispatch = useAppDispatch();

  // Same function reference as long as dispatch doesn't change (it never does).
  // Now React.memo's check passes for onAddToCart — ProductCard skips re-render.
  const handleAdd = useCallback(
    (id: string) => dispatch(itemAdded(id)),
    [dispatch],
  );

  return products.map(p => <ProductCard product={p} onAddToCart={handleAdd} />);
}
```

`useCallback(fn, deps)` is exactly equivalent to `useMemo(() => fn, deps)`. It exists only as a readability convenience for functions.

**`useCallback` without `React.memo` is useless.** If the child isn't memoized, stabilising the function reference changes nothing — the child re-renders regardless.

## useMemo — cache an expensive computation

`useMemo(fn, deps)` runs `fn` on the first render and whenever `deps` change. Between dep changes, it returns the cached result.

```tsx
function Catalog({ products, category, sortBy }) {
  // Without useMemo: filtering and sorting runs on every parent re-render,
  // even for unrelated state changes (e.g. a toast appearing).
  const filtered = useMemo(() => {
    const list = category === 'All'
      ? products
      : products.filter((p) => p.category === category);
    return [...list].sort((a, b) =>
      sortBy === 'name'
        ? a.name.localeCompare(b.name)
        : a.priceCents - b.priceCents,
    );
  }, [products, category, sortBy]); // only recomputes when these change

  return filtered.map(p => <ProductCard key={p.id} product={p} onAddToCart={handleAdd} />);
}
```

**Important:** `useMemo` also stabilises the reference of the returned value. If `filtered` is passed as a prop to a memoized child, the child won't re-render when the parent re-renders for an unrelated reason — because `filtered` is the same array reference.

## The system — all three working together

Consider a `Catalog` page with category filter, sort order, and an unrelated "tick" counter (simulating an unrelated parent state change like a notification appearing):

```tsx
'use client';
function CatalogPage() {
  const { data: products = [] } = useGetProductsQuery();
  const [category, setCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'name' | 'price'>('name');
  const [tick, setTick] = useState(0); // unrelated state

  // 1. useMemo: filtered list only recomputes when products/category/sortBy change.
  //    tick++ does NOT trigger recomputation.
  const filtered = useMemo(() => {
    const list = category === 'All' ? products : products.filter(p => p.category === category);
    return [...list].sort((a, b) =>
      sortBy === 'name' ? a.name.localeCompare(b.name) : a.priceCents - b.priceCents,
    );
  }, [products, category, sortBy]);

  // 2. useCallback: stable reference regardless of tick or filtered changing.
  const handleAdd = useCallback(
    (id: string) => dispatch(itemAdded(id)),
    [dispatch],
  );

  return (
    <>
      <button onClick={() => setTick(t => t + 1)}>Force re-render ({tick})</button>
      {filtered.map(p => (
        // 3. React.memo: only re-renders when product or onAddToCart changes.
        //    tick++ → parent re-renders → filtered same ref → handleAdd same ref → no card re-renders
        <ProductCard key={p.id} product={p} onAddToCart={handleAdd} />
      ))}
    </>
  );
}
```

The `/catalog` page in this app demonstrates this live — each card shows a render count badge that proves when React.memo is and isn't working.

## When memoization hurts more than it helps

Every `useMemo` and `useCallback` call:
- Allocates memory for the cached value
- Runs a dependency comparison on every render
- Adds cognitive overhead for the next reader

**Do not memoize when:**
- The computation is cheap (string concatenation, simple arithmetic)
- The component renders infrequently
- The child is not wrapped in `React.memo` (useCallback is pointless)
- The deps change on every render anyway (memoization never hits the cache)

**Do memoize when:**
- The computation is measurably expensive (filtering/sorting large arrays, complex derived data)
- The result is passed as a prop to a `React.memo` component
- A stable reference is required by a hook dep array (e.g. `useEffect` to avoid infinite loops)

The right workflow: **profile first, memoize second**. React DevTools Profiler shows which components re-render and how long they take. Optimise based on evidence, not intuition.

## Referential equality — the key mental model

JavaScript's `===` on objects and arrays compares **references**, not values:

```js
{ a: 1 } === { a: 1 } // false — different objects
[1, 2] === [1, 2]     // false — different arrays
() => {} === () => {} // false — different functions
```

React's shallow equality check (used by `React.memo` and dependency arrays) uses `===` for each prop. This is why:
- A new array created in render (`products.filter(...)`) is always a new reference
- A function defined in render is always a new reference
- An object literal in JSX props is always a new reference

`useMemo` and `useCallback` preserve references across renders so these checks can actually pass.

## useRef for render counting

A render counter demonstrates memoization visually without affecting component output:

```tsx
const renderCount = useRef(0);
renderCount.current += 1; // increments on every render — no re-render triggered

return <div data-renders={renderCount.current}>...</div>;
```

`useRef` persists a mutable value across renders without causing re-renders — the opposite of `useState`. It's the right tool for measuring renders precisely because it doesn't interfere with them.
