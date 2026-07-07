// Server Component: a NOT-FOUND boundary scoped to /products/[id].
// Next.js walks UP the route tree from the notFound() call in page.tsx and
// stops at the NEAREST not-found.tsx — this file, not the global app/not-found.tsx.
// Because it's closer, it can give a more specific message ("this product"
// vs "this page"). Remove this file and the global one takes over automatically.

import Link from 'next/link';
import styles from './not-found.module.css';

export default function ProductNotFound() {
  return (
    <main className={styles.container}>
      <p className={styles.code}>404</p>
      <h1 className={styles.heading}>Product not found</h1>
      <p className={styles.body}>
        This product doesn&apos;t exist or may have been removed.
      </p>
      <Link href="/products" className={styles.link}>
        ← Back to all products
      </Link>
    </main>
  );
}
