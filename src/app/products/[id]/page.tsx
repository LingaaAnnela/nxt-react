// Server Component: looks up one product and renders static detail. The only
// interactive piece is <AddToCartButton>, a Client Component leaf — the
// 'use client' boundary is deliberately pushed down to that button instead of
// marking this whole page client.
import { notFound } from "next/navigation";
import Link from "next/link";
import { products } from "@/lib/shop/mock-products";
import { formatPrice } from "@/lib/shop/format";
import AddToCartButton from "@/components/AddToCartButton";
import styles from "./page.module.css";

// params is a Promise in this Next version — route inputs arrive
// asynchronously, loosely like paramMap being an Observable instead of a
// snapshot in ActivatedRoute.
export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Contrast with the listing page: no HTTP hop to our own API here — a
  // Server Component can just read the data source directly. This is the
  // normal pattern; the listing's fetch was the exercise.
  const product = products.find((p) => p.id === id);
  if (!product) {
    // Renders the nearest not-found boundary and sends a real 404 status.
    notFound();
  }

  return (
    <main className={styles.container}>
      <Link href="/products" className={styles.back}>
        ← All products
      </Link>
      <h1>{product.name}</h1>
      <p className={styles.category}>{product.category}</p>
      <p className={styles.price}>{formatPrice(product.priceCents)}</p>
      <p>{product.description}</p>
      <AddToCartButton productId={product.id} />
    </main>
  );
}
