---
title: Context API and useReducer
description: How createContext and useReducer work together to build the toast notification system without Redux.
order: 11
---

# Context API and useReducer

React's Context API lets you share a value across the component tree without threading it through props at every level. Combined with `useReducer`, it covers a class of problems that Redux solves with more ceremony than necessary.

## When context is the right tool

Context is right for **UI infrastructure** that:
- Any component may need to trigger
- Only one place needs to render
- Should not persist across navigations or be serialised to localStorage
- Doesn't need Redux DevTools

Good fits: toast notifications, modal system, theme, locale, sidebar open/closed state.

Poor fits: cart contents (persisted, synced to the server), product list (fetched, cached by RTK Query), user session (needed in Server Components, not just Client Components).

## createContext and the null default

```ts
import { createContext, useContext } from 'react';

type ToastContextValue = {
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
};

// null as default: signals "no Provider is present in the tree".
// The useToast() hook checks for null and throws a descriptive error.
// A non-null default (a no-op function) would silently do nothing
// when a component is used outside the provider — invisible bug.
const ToastContext = createContext<ToastContextValue | null>(null);
```

**Angular analogy:** `InjectionToken<ToastService>` with `inject(ToastToken)` throwing when the token isn't provided in the injector hierarchy.

## useReducer — named transitions on a collection

`useReducer` is React's built-in mini-reducer. Use it when a component manages a collection with multiple named operations — the same pattern as an NgRx reducer, scoped to one component tree.

```ts
type Toast = { id: string; message: string; type: 'success' | 'error' | 'info' };
type ToastAction =
  | { type: 'ADD'; toast: Toast }
  | { type: 'REMOVE'; id: string };

// Pure function — same input, same output, no side effects.
// Side effects (setTimeout) live in the dispatch caller, not the reducer.
function toastReducer(state: Toast[], action: ToastAction): Toast[] {
  switch (action.type) {
    case 'ADD':    return [...state, action.toast];
    case 'REMOVE': return state.filter((t) => t.id !== action.id);
  }
}
```

## The Provider component

```tsx
'use client'; // Providers are always Client Components — they use hooks

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, dispatch] = useReducer(toastReducer, []);

  // useCallback pins addToast's reference across re-renders.
  // Without it: every toast dismiss triggers a provider re-render →
  // new addToast object → every useToast() consumer re-renders.
  // dispatch from useReducer is stable (guaranteed by React), so [] is correct.
  const addToast = useCallback(
    (message: string, type: ToastType = 'success') => {
      const id = crypto.randomUUID();
      dispatch({ type: 'ADD', toast: { id, message, type } });
      // setTimeout is a side effect — not in the reducer.
      setTimeout(() => dispatch({ type: 'REMOVE', id }), 3500);
    },
    [],
  );

  return (
    // React 19 syntax: <Context value={...}> instead of <Context.Provider value={...}>
    <ToastContext value={{ addToast }}>
      {children}
      {/* Toasts render here — inside the provider, alongside children */}
      <ol aria-live="polite">
        {toasts.map((toast) => (
          <li key={toast.id}>
            {toast.message}
            <button onClick={() => dispatch({ type: 'REMOVE', id: toast.id })}>×</button>
          </li>
        ))}
      </ol>
    </ToastContext>
  );
}
```

**What the context exposes vs what it holds:**
- **Exposed:** only `addToast` — consumers dispatch into the system, they don't read the list.
- **Internal:** `toasts`, `dispatch` — private to the provider. Hiding the list prevents consumers from depending on its shape.

## The useToast hook

```ts
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  // Throw a descriptive error rather than silently failing.
  if (!ctx) throw new Error('useToast() must be called inside <ToastProvider>');
  return ctx;
}
```

Consumers call `useToast()` — not `useContext(ToastContext)`. The hook wrapper:
1. Hides the context object from consumers (implementation detail)
2. Adds the null guard (descriptive error on misuse)
3. Provides a stable import name that won't change if the internal implementation changes

## Using it in a component

```tsx
'use client';
import { useToast } from '@/lib/toast/ToastProvider';

export default function AddToCartButton({ productId }) {
  const dispatch = useAppDispatch();
  const { addToast } = useToast();

  function handleAddToCart() {
    dispatch(itemAdded(productId));
    // No prop needed — the toast system is available anywhere in the tree.
    addToast('Added to cart!');
  }

  return <button onClick={handleAddToCart}>Add to cart</button>;
}
```

No prop threading needed. `AddToCartButton` sits several levels deep (layout → StoreProvider → page → button). Without context, `addToast` would need to travel through every intermediate component as a prop.

## aria-live — accessibility

```tsx
<ol aria-live="polite" aria-label="Notifications">
```

`aria-live="polite"` tells screen readers to announce new list items when the user is not busy. New toasts are announced after the current spoken content finishes. `aria-live="assertive"` would interrupt immediately — correct for genuine errors that demand attention, wrong for "Added to cart."

## React 19 — new context syntax

React 19 allows using the context object itself as a provider element:

```tsx
// Old (React 18 and earlier):
<ToastContext.Provider value={{ addToast }}>

// New (React 19):
<ToastContext value={{ addToast }}>
```

Both work during the transition. The new form is shorter and removes the need to type `.Provider`. The old form still works and is fine to use.
