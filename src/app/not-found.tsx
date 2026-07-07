// Server Component: the global 404 fallback. Rendered when:
//   1. A URL matches no route at all (e.g. /gibberish).
//   2. notFound() is called somewhere that has no closer not-found.tsx boundary.
// Next.js automatically sends a real HTTP 404 status — not just a visual change.
// SEO crawlers and link checkers see the status code, not just the page content.

import Link from 'next/link';
import styles from './not-found.module.css';

export default function GlobalNotFound() {
  return (
    <main className={styles.container}>
      <p className={styles.code}>404</p>
      <h1 className={styles.heading}>Page not found</h1>
      <p className={styles.body}>
        This URL doesn&apos;t match any page in the app.
      </p>
      <Link href="/products" className={styles.link}>
        ← Browse products
      </Link>
    </main>
  );
}
