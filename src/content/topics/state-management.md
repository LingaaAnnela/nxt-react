---
title: State Management — useState, useReducer, Redux, Context, URL
description: How to choose between the five state mechanisms in this app, with concrete examples from Brew Gear.
order: 4
---

# State Management

React has no single state management system — it has a layered set of tools, each with a different scope and lifecycle. Picking the wrong layer is one of the most common mistakes when coming from Angular, where NgRx (or a service) handles everything.

## The five layers

| Layer | Scope | Persists across navigation | Devtools |
|---|---|---|---|
| `useState` | One component | No | No |
| `useReducer` | One component (complex) | No | No |
| Context API | Subtree | No | No |
| Redux (RTK) | Whole app | Via localStorage | Yes |
| URL state | Whole app + shareable | Yes (it's the URL) | Browser address bar |

## useState — local, simple

The right default for any state that only one component cares about.

```tsx
'use client';
function DeleteButton({ productId }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return <button onClick={() => setConfirming(true)}>Delete</button>;
  }
  return (
    <>
      <button onClick={() => deleteProduct(productId)}>Confirm delete</button>
      <button onClick={() => setConfirming(false)}>Cancel</button>
    </>
  );
}
```

**When to use:** a toggle, a hover state, a two-step confirm, any value that lives and dies with a single component. `DeleteProductButton` in Brew Gear uses `useState` for exactly this.

**Angular analogy:** a local component property — `isConfirming = false` — not an NgRx store.

## useReducer — local, complex

Use `useReducer` when a component manages a collection with named operations, or when the next state depends on the previous in non-trivial ways. It takes a pure reducer function and an initial state, and returns the current state and a `dispatch` function.

```tsx
type ToastAction =
  | { type: 'ADD'; toast: Toast }
  | { type: 'REMOVE'; id: string };

function toastReducer(state: Toast[], action: ToastAction): Toast[] {
  switch (action.type) {
    case 'ADD': return [...state, action.toast];
    case 'REMOVE': return state.filter(t => t.id !== action.id);
  }
}

function ToastProvider({ children }) {
  const [toasts, dispatch] = useReducer(toastReducer, []);
  // dispatch({ type: 'ADD', toast: { ... } })
  // dispatch({ type: 'REMOVE', id: '...' })
}
```

**When to use:** multiple named transitions on the same state (add/remove/update), or when you find yourself writing several `useState` calls that always change together.

**Angular analogy:** an NgRx reducer scoped to a component rather than the global store. Same pure function pattern, different scope.

## Context API — subtree, infrastructure

Context makes a value available to any descendant without prop drilling. It is **not** a replacement for Redux — it lacks devtools, subscriptions are coarse-grained (all consumers re-render when the value changes), and it has no middleware.

```tsx
// The context only exposes the dispatch function, not the state.
// Consumers that need to read the state subscribe to Redux directly.
const ToastContext = createContext<{ addToast: (msg: string) => void } | null>(null);

export function ToastProvider({ children }) {
  const [toasts, dispatch] = useReducer(toastReducer, []);

  const addToast = useCallback((message) => {
    const id = crypto.randomUUID();
    dispatch({ type: 'ADD', toast: { id, message, type: 'success' } });
    setTimeout(() => dispatch({ type: 'REMOVE', id }), 3500);
  }, []);

  return (
    <ToastContext value={{ addToast }}>
      {children}
      {/* render toasts here */}
    </ToastContext>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast() must be inside <ToastProvider>');
  return ctx;
}
```

**When to use:** UI infrastructure that any component needs to trigger but only one place needs to render (toasts, modals, theme, locale). The rule: context for plumbing, Redux for domain data.

**Angular analogy:** `@Injectable({ providedIn: 'root' })` with `inject()` — any component in the tree can call `inject(ToastService)` without being handed it as an input.

## Redux (RTK) — global, domain state

Redux is right when state needs to be shared across many unrelated components, survive navigation, be inspectable in devtools, or integrate with RTK Query's cache.

```tsx
// cartSlice.ts — defines state, reducers, and selectors together
const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [] as CartItem[] },
  reducers: {
    itemAdded: (state, action) => {
      const existing = state.items.find(i => i.productId === action.payload);
      if (existing) existing.quantity += 1;
      else state.items.push({ productId: action.payload, quantity: 1 });
    },
    itemRemoved: (state, action) => {
      state.items = state.items.filter(i => i.productId !== action.payload);
    },
    cartCleared: (state) => { state.items = []; },
  },
});
```

The cart is in Redux because both `ShopHeader` (shows count) and `CartDrawer` (shows items) need it, and they have no direct parent-child relationship. Prop drilling would require threading cart state through the entire layout.

**Angular analogy:** an NgRx feature store. Same `createSlice` ≈ `createReducer` + `createAction` bundled, Immer draft mutations ≈ `on(action, (state) => ({ ...state }))` but without the spread.

## URL state — shareable, persistent

State that lives in the URL is automatically shareable, survives a page reload, and works with the browser back/forward buttons. This is the right layer for search queries, filters, pagination, and sort order.

```tsx
// Reading URL state in a Server Component — prop injected by Next.js
export default async function ProductsPage({ searchParams }) {
  const { q = '' } = await searchParams;
  const products = filterProducts(allProducts, q);
  return <main>...</main>;
}

// Writing URL state in a Client Component
'use client';
function SearchInput() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(e) {
    startTransition(() => {
      router.replace(`/products?q=${e.target.value}`);
    });
  }
  return <input onChange={handleChange} />;
}
```

**When to use:** anything that should be bookmarkable, shareable by copying the URL, or recoverable on page reload. The search filter in Brew Gear lives in the URL — visit `/products?q=grinder` and you get the same filtered view every time.

**Angular analogy:** `ActivatedRoute.queryParams` as the source of truth, with `Router.navigate` to update it.

## The decision ladder

```
Does only one component care about this state?
  → useState (or useReducer if the transitions are complex)

Do many components need to trigger something but only one place renders it?
  → Context API (toasts, theme, modals)

Is it domain data shared across unrelated components?
  → Redux slice

Should it survive a reload and be shareable via URL?
  → URL state (searchParams / router.replace)

Is it fetched server data?
  → RTK Query (not useState + useEffect)
```

Reaching for Redux before exhausting `useState` is the most common over-engineering mistake. Three components needing the same value is not automatically a Redux problem — a shared parent with `useState` plus prop passing is often enough.
