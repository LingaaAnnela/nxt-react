// Server Component: fetches all products, filters by ?q= on the server, and
// renders the grid. The search input is a Client Component island kept separate
// so 'use client' doesn't infect the whole page — the grid stays a Server
// Component even though the input above it is interactive.
//
// searchParams is how Next.js exposes URL query params to Server Components.
// It arrives as a Promise in this Next version (same as params for dynamic
// routes) and must be awaited. ≈ ActivatedRoute.snapshot.queryParams in
// Angular, but server-side and async.
//
// Why filter here instead of on the client?
// Server-side filtering means the HTML that arrives already has only the
// matching products — correct for SEO, correct for users with JS disabled.
// For huge datasets you'd push this into a DB query. The client never sees
// the unfiltered list.

import type { Metadata } from 'next';
import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { connection } from 'next/server';
import type { Product } from '@/lib/shop/types';
import { formatPrice } from '@/lib/shop/format';
import ProductSearchInput from '@/components/ProductSearchInput';
import styles from './page.module.css';

// generateMetadata runs before the page renders and receives the same props.
// When ?q= is set, the browser tab reads e.g. 'Search: "grinder" — Brew Gear'
// rather than the static 'Products — Brew Gear' — useful for shared links.
// searchParams is a Promise in this Next version, same as in the page itself.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `Search: "${q}"` : 'Products',
    description: q
      ? `Brew Gear products matching "${q}".`
      : 'Browse all Brew Gear products.',
  };
}

async function getProducts(): Promise<Product[]> {
  await connection();
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const res = await fetch(`${base}/api/products`);
  if (!res.ok) {
    throw new Error(`Failed to load products (${res.status})`);
  }
  return res.json();
}

function filterProducts(products: Product[], query: string): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return products;
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q),
  );
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = '' } = await searchParams;
  const allProducts = await getProducts();
  const products = filterProducts(allProducts, q);

  return (
    <main className={styles.container}>
      <h1>Products</h1>

      {/*
        ProductSearchInput uses useSearchParams() which suspends during SSR.
        The <Suspense> fallback renders in its place on the server; the real
        input takes over on hydration. Without Suspense here, Next.js would
        bail out of static rendering for the entire page.
        The fallback mirrors the input dimensions to avoid layout shift.
      */}
      <Suspense fallback={<div className={styles.searchPlaceholder} />}>
        <ProductSearchInput />
      </Suspense>

      {products.length === 0 ? (
        <p className={styles.empty}>
          No products match &ldquo;{q}&rdquo;.{' '}
          <Link href="/products">Clear search</Link>
        </p>
      ) : (
        <ul className={styles.grid}>
          {products.map((product) => (
            <li key={product.id} className={styles.card}>
              <Link href={`/products/${product.id}`} className={styles.cardLink}>
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  width={400}
                  height={300}
                  className={styles.cardImage}
                />
                <h2>{product.name}</h2>
                <p className={styles.category}>{product.category}</p>
                <p className={styles.price}>{formatPrice(product.priceCents)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
