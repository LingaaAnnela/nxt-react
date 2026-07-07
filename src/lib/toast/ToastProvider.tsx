'use client';

// Client Component: Context + useReducer are hooks, so the provider must be
// a Client Component. The toasts render inside this provider's JSX, so the
// floating container is co-located with the state that drives it.
//
// Why context instead of a Redux slice?
// Toasts are ephemeral UI infrastructure — they don't survive navigation,
// don't need devtools, and no other slice reads them. Context is the right
// scope for "any descendant can trigger this, one place renders it."
// ≈ Angular's providedIn: 'root' service with an InjectionToken, but scoped
// to the React subtree rather than the module injector.

import {
  createContext,
  useCallback,
  useContext,
  useReducer,
  type ReactNode,
} from 'react';
import styles from './ToastProvider.module.css';

// --- Types -------------------------------------------------------------------

export type ToastType = 'success' | 'error' | 'info';

type Toast = {
  id: string;
  message: string;
  type: ToastType;
};

// The context only exposes addToast — consumers never see the list.
// Hiding the list prevents consumers from depending on its shape.
type ToastContextValue = {
  addToast: (message: string, type?: ToastType) => void;
};

// --- Reducer -----------------------------------------------------------------

// useReducer is React's built-in mini-reducer. ≈ an NgRx reducer scoped to
// a component rather than the global store. Two action types, pure function,
// no side effects — the auto-remove setTimeout lives in addToast, not here.
type ToastAction =
  | { type: 'ADD'; toast: Toast }
  | { type: 'REMOVE'; id: string };

function toastReducer(state: Toast[], action: ToastAction): Toast[] {
  switch (action.type) {
    case 'ADD':
      return [...state, action.toast];
    case 'REMOVE':
      return state.filter((t) => t.id !== action.id);
  }
}

// --- Context -----------------------------------------------------------------

// null as default signals "consumed outside a provider" — caught by useToast.
const ToastContext = createContext<ToastContextValue | null>(null);

// --- Provider ----------------------------------------------------------------

const AUTO_DISMISS_MS = 3500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, dispatch] = useReducer(toastReducer, []);

  // useCallback with [] keeps addToast reference stable across re-renders.
  // Without it: every toast dismissal triggers a provider re-render →
  // new addToast reference → every useToast() consumer re-renders.
  // dispatch from useReducer is guaranteed stable, so [] deps is correct.
  const addToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = crypto.randomUUID();
    dispatch({ type: 'ADD', toast: { id, message, type } });
    setTimeout(() => dispatch({ type: 'REMOVE', id }), AUTO_DISMISS_MS);
  }, []);

  return (
    // React 19 syntax: <Context value={...}> replaces <Context.Provider value={...}>.
    // The old .Provider form still works — this is just the cleaner new API.
    <ToastContext value={{ addToast }}>
      {children}

      {/* aria-live="polite": screen readers announce new toasts without
          interrupting the user's current focus. "assertive" would interrupt —
          reserved for genuine errors that need immediate attention. */}
      <ol className={styles.container} aria-live="polite" aria-label="Notifications">
        {toasts.map((toast) => (
          <li
            key={toast.id}
            className={`${styles.toast} ${styles[toast.type]}`}
          >
            <span>{toast.message}</span>
            <button
              type="button"
              className={styles.dismiss}
              aria-label="Dismiss notification"
              onClick={() => dispatch({ type: 'REMOVE', id: toast.id })}
            >
              ×
            </button>
          </li>
        ))}
      </ol>
    </ToastContext>
  );
}

// --- Hook --------------------------------------------------------------------

// Convenience wrapper — consumers call useToast() instead of the verbose
// useContext(ToastContext). The null guard turns a silent wrong-context bug
// into a clear error message. ≈ an Angular service throwing when not provided.
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast() must be called inside <ToastProvider>');
  return ctx;
}
