// Server Component: a static landing page — no state, no interactivity, no
// request-time data. Featured products come from a direct synchronous module
// read, so unlike /products (which fetches at request time), this page is
// fully prerendered at build time. Compare them in the `next build` output:
// ○ vs ƒ.
import Link from "next/link";
import { products } from "@/lib/shop/mock-products";
import { formatPrice } from "@/lib/shop/format";
import styles from "./page.module.css";

const featured = products.slice(0, 3);

export default function HomePage() {
  return (
    <main className={styles.container}>
      <section className={styles.hero}>
        <h1>Brew Gear</h1>
        <p>Coffee equipment, and an excuse to learn React and Next.js.</p>
        <Link href="/products" className={styles.cta}>
          Browse all products
        </Link>
      </section>

      <section>
        <h2>Featured</h2>
        <ul className={styles.grid}>
          {featured.map((product) => (
            <li key={product.id} className={styles.card}>
              <Link
                href={`/products/${product.id}`}
                className={styles.cardLink}
              >
                <h3>{product.name}</h3>
                <p className={styles.category}>{product.category}</p>
                <p className={styles.price}>{formatPrice(product.priceCents)}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
