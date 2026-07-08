// Server Component: no hooks, no browser APIs — pure static markup.
// The Suspense / next/dynamic loading fallback renders server-side,
// so it is visible in the initial HTML before the JS chunk arrives.
// This is the correct pattern: skeleton = Server Component, payload = Client Component.
import styles from './StatsSkeletonLoader.module.css';

export default function StatsSkeletonLoader() {
  return (
    <div className={styles.skeleton} aria-busy="true" aria-label="Loading analytics…">
      <div className={styles.lviewed} />
      <div className={styles.grid}>
        {[1, 2, 3].map((i) => (
          <div key={i} className={styles.card} />
        ))}
      </div>
      <div className={styles.sectionLabel} />
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className={styles.bar} style={{ width: `${85 - i * 12}%` }} />
      ))}
      <div className={styles.sectionLabel} />
      <div className={styles.grid}>
        {[1, 2].map((i) => (
          <div key={i} className={styles.card} />
        ))}
      </div>
    </div>
  );
}
