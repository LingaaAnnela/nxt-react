// Server Component: this page only fetches and displays data — no state, no
// event handlers — so it renders entirely on the server and ships no
// component JS to the browser. An async component awaiting its own data is
// the closest React gets to an Angular route resolver, except the data lands
// straight in the component instead of coming through ActivatedRoute.
import Link from "next/link";
import { connection } from "next/server";
import type { Product } from "@/lib/shop/types";
import { formatPrice } from "@/lib/shop/format";
import styles from "./page.module.css";

async function getProducts(): Promise<Product[]> {
  // Without this, `next build` prerenders the page and executes the fetch at
  // BUILD time — when no server is listening on localhost:3000 (the build
  // failed with ECONNREFUSED). connection() stops prerendering here, so the
  // fetch only runs per request. In this Next version it replaces the old
  // `export const dynamic = "force-dynamic"` segment config.
  await connection();

  // A server-side fetch has no browser origin, so a relative "/api/products"
  // can't resolve — calling our own route handler needs an absolute URL.
  // We do this hop deliberately to practice route handlers; a Server
  // Component would normally read the data source (DB, service) directly.
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const res = await fetch(`${base}/api/products`);
  if (!res.ok) {
    throw new Error(`Failed to load products (${res.status})`);
  }
  return res.json();
}

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <main className={styles.container}>
      <h1>Products</h1>
      <ul className={styles.grid}>
        {/* key ≈ trackBy in *ngFor — identity for list reconciliation */}
        {products.map((product) => (
          <li key={product.id} className={styles.card}>
            {/* <Link> ≈ routerLink: client-side navigation + prefetch */}
            <Link href={`/products/${product.id}`} className={styles.cardLink}>
              <h2>{product.name}</h2>
              <p className={styles.category}>{product.category}</p>
              <p className={styles.price}>{formatPrice(product.priceCents)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
