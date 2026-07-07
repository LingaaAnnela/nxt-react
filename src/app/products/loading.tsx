// Server Component: pure static fallback markup, no state or interactivity.
// This file is a Next.js convention — the router wraps page.tsx in
// <Suspense fallback={<Loading />}>, so this renders the instant the route
// is entered and streams out first, while the page's data fetch resolves.
// ≈ the anti-resolver: Angular blocks navigation until the resolver returns;
// this navigates immediately and fills the data in.

import styles from "./page.module.css";

// Same container/grid/card classes as the real page so the fallback→content
// swap causes no layout shift.
export default function Loading() {
  return (
    <main className={styles.container}>
      <h1>Products</h1>
      {/* role="status" politely announces loading to screen readers; the
          decorative skeletons themselves are hidden from the a11y tree. */}
      <p role="status" className={styles.srOnly}>
        Loading products…
      </p>
      <ul className={styles.grid} aria-hidden="true">
        {/* Index keys are fine here — a static placeholder list never
            reorders, so identity doesn't matter (unlike real data lists). */}
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className={styles.card}>
            <div className={styles.cardLink}>
              <div className={`${styles.skeleton} ${styles.skeletonImage}`} />
              <div className={`${styles.skeleton} ${styles.skeletonTitle}`} />
              <div className={`${styles.skeleton} ${styles.skeletonMeta}`} />
              <div className={`${styles.skeleton} ${styles.skeletonPrice}`} />
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
