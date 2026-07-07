'use client';

// Client Component — NON-NEGOTIABLE for error.tsx.
// React Error Boundaries must be class components or, in Next.js's model, a
// 'use client' file. Next.js wraps this component in an Error Boundary HOC
// automatically; you just export the fallback UI.
//
// Two props are injected by Next.js:
//   error  — the thrown Error object. In production, message may be generic to
//             avoid leaking internals; error.digest is a server-log correlation
//             hash you can give to support without exposing stack traces.
//   reset  — re-renders the segment (NOT a full page reload). Calls React's
//             ErrorBoundary.reset() under the hood. ≈ Angular's
//             ErrorHandler.handleError but recoverable.
//
// Scope: catches errors thrown by /products and /products/[id] pages.
// Does NOT catch errors in the layout at the same level (layout.tsx peers).
// For that you'd need error.tsx one level higher, or global-error.tsx for
// the root layout.

import { useEffect } from 'react';
import styles from './error.module.css';

export default function ProductsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In a real app: send to your error tracking service (Sentry, Datadog…).
    // The digest is safe to log/send — it's a hash, not the raw message.
    console.error('[ProductsError]', error.message, error.digest);
  }, [error]);

  return (
    <main className={styles.container}>
      <h1 className={styles.heading}>Something went wrong</h1>
      <p className={styles.message}>{error.message}</p>
      {error.digest && (
        <p className={styles.digest}>Reference: {error.digest}</p>
      )}
      <button type="button" className={styles.retryButton} onClick={reset}>
        Try again
      </button>
    </main>
  );
}
