---
title: Prop Drilling and Context API
description: What prop drilling is, when it becomes a problem, and how Context API solves it — with examples from Brew Gear.
order: 14
---

# Prop Drilling and Context API

Prop drilling is the pattern of passing data through intermediate components that don't use it, purely to get it to a deeply nested child. Understanding when it's fine and when to reach for Context is one of the most important judgment calls in a React codebase.

## What prop drilling looks like

```tsx
// GrandParent has the data
function GrandParent() {
  const [user, setUser] = useState({ name: 'Alice' });
  return <Parent user={user} />;
}

// Parent doesn't use `user` — just passes it down
function Parent({ user }) {
  return <Child user={user} />;
}

// Child is the actual consumer
function Child({ user }) {
  return <p>Hello, {user.name}</p>;
}
```

`Parent` is "drilled through" — it carries a prop it doesn't use. At one or two levels this is completely normal. The problem appears when the chain is 4–5 levels deep and every component in the chain must declare and pass a prop it doesn't care about.

**Angular analogy:** passing a service reference down through `@Input()` chains instead of injecting it with `inject()` at the point of use.

## When prop drilling is fine — Brew Gear examples

Not all prop-passing is problematic. These are normal, correct uses of props in Brew Gear:

```tsx
// ProductDetailPage passes productId directly to AddToCartButton
// ONE level — direct parent/child — fine
<AddToCartButton productId={product.id} />

// Section in the learn page receives title and items
// ONE level — fine
<Section title={s.title} items={s.items} />

// ProductsPage passes the filtered products to the grid
// ONE level — fine
<ProductGrid products={filtered} />
```

None of these involve intermediate components that don't use the prop. They're just normal component composition.

## When context is the right solution

Context is right when a value needs to be accessible to many components at different levels of the tree, and threading it as a prop would require touching components that don't use it.

**The toast system** is the clearest example in Brew Gear:

```
app/layout.tsx         ← ToastProvider lives here
  └── StoreProvider
        └── ShopHeader
        └── page (varies)
              └── ProductDetailPage
                    └── AddToCartButton   ← needs addToast()
```

Without context, `addToast` would need to travel:
`RootLayout → StoreProvider → ProductDetailPage → AddToCartButton`

Every component in that chain would need an `onAddToCart` prop it doesn't use. With context, `AddToCartButton` calls `useToast()` and gets it directly:

```tsx
'use client';
export default function AddToCartButton({ productId }) {
  const { addToast } = useToast(); // context — no prop needed
  const dispatch = useAppDispatch();

  return (
    <button onClick={() => {
      dispatch(itemAdded(productId));
      addToast('Added to cart!');
    }}>
      Add to cart
    </button>
  );
}
```

## Redux is also context under the hood

`useAppSelector` and `useAppDispatch` are themselves `useContext` calls — they read from `ReactReduxContext`, which `StoreProvider` provides. Every component that dispatches to the Redux store or reads from it is using context. RTK abstracts it so you never write `createContext` yourself for this, but the mechanism is the same.

This is why `StoreProvider` must wrap the component tree in the root layout — without it, `useAppSelector` would throw "could not find react-redux context value."

## The decision ladder

```
Does only one component care about this state, with no child needing it?
  → Keep it local: useState or useReducer

Does one parent need to pass to 1–2 direct children?
  → Plain props — don't reach for context prematurely

Does a deeply nested child need data that would require drilling through 3+ intermediate components?
  → Context API if it's UI infrastructure
  → Redux if it's domain data that other parts of the app also need

Does the state need to survive page navigation or be bookmarkable?
  → URL state (searchParams / router.replace)

Is it server data that the client reads and mutates?
  → RTK Query
```

## Context is not a performance silver bullet

One common misconception: using context avoids re-renders that prop drilling causes. This is wrong — context does not prevent re-renders. **Every** component that calls `useContext(SomeContext)` re-renders when the context value changes.

For the toast system this is fine: context value is `{ addToast }`, which is memoised with `useCallback` and never changes. If the context value were the `toasts` array itself, every consumer would re-render on every toast add/remove — including `AddToCartButton`, which doesn't need to know about the list.

The solution used in Brew Gear: **only expose `addToast` through the context**, not the toasts list. The list is private to the provider. Consumers that don't render toasts never re-render because of toast changes.
