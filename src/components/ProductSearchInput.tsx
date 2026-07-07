'use client';

// Client Component: the search input must live here because it needs:
//   - useSearchParams() to read the live URL (re-renders on back/forward)
//   - useRouter() to push URL changes
//   - useTransition() to mark the navigation as non-urgent
//
// useTransition is the key concept here. Without it, router.replace triggers
// a synchronous navigation — the current product list disappears while the
// server re-renders with the new query (a flash of empty content). Wrapping it
// in startTransition tells React: "this update can be interrupted; keep showing
// the old UI until the new one is ready." isPending is true during that window,
// so we can show a subtle spinner on the input. ≈ Angular's Router.navigate
// inside ChangeDetectionStrategy.OnPush with a loading flag, but built into
// the framework's scheduler rather than wired manually.
//
// Why is this wrapped in <Suspense> in the parent?
// useSearchParams() reads from the URL at render time. During SSR, the URL is
// not known until the request arrives, which causes the component to suspend.
// Wrapping in <Suspense> isolates that suspension so the rest of the page
// (the product grid) can still render immediately.

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import styles from './ProductSearchInput.module.css';

export default function ProductSearchInput() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Mirror the URL param in local state so the input is controlled (reacts to
  // browser back/forward navigations — if uncontrolled, it would stay stale).
  const urlQuery = searchParams.get('q') ?? '';
  const [value, setValue] = useState(urlQuery);

  // Sync the input when the URL changes externally (back/forward, or a <Link>
  // that includes ?q=…). This useEffect is valid — it's responding to an
  // external system (the URL), not to derived state from props. ≈ subscribing
  // to ActivatedRoute.queryParamMap in Angular's ngOnInit.
  useEffect(() => {
    setValue(urlQuery);
  }, [urlQuery]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setValue(next); // instant local update — input never lags

    const params = new URLSearchParams(searchParams.toString());
    if (next) {
      params.set('q', next);
    } else {
      params.delete('q');
    }

    // startTransition: the router.replace is non-urgent. React can interrupt
    // this render if a higher-priority update (e.g. another keystroke) arrives.
    // The current product list stays visible while the server re-renders.
    startTransition(() => {
      router.replace(`/products?${params.toString()}`);
    });
  }

  return (
    <div className={styles.wrapper}>
      <input
        type="search"
        value={value}
        onChange={handleChange}
        placeholder="Search products…"
        aria-label="Search products"
        className={styles.input}
        data-pending={isPending || undefined}
      />
      {isPending && (
        <span className={styles.spinner} aria-label="Loading results" />
      )}
    </div>
  );
}
