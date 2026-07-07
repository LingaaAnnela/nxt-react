// Server Component: looks up one product and renders static detail. The only
// interactive piece is <AddToCartButton>, a Client Component leaf — the
// 'use client' boundary is deliberately pushed down to that button instead of
// marking this whole page client.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { products } from "@/lib/shop/mock-products";
import { formatPrice } from "@/lib/shop/format";
import AddToCartButton from "@/components/AddToCartButton";
import styles from "./page.module.css";

// generateStaticParams tells Next.js which [id] values to pre-render at
// BUILD time instead of per request. Next.js calls this once during
// `next build`, iterates the returned array, and generates a static HTML file
// for each product — no server needed to serve them afterwards.
//
// The component code (below) doesn't change at all: it's still a Server
// Component, still reads products.find(), still calls notFound(). The only
// difference is WHEN it runs: build time vs. request time.
//
// Why can this page be static when the listing page can't?
// The listing page calls connection() + fetch() — request-time I/O that
// can't be replayed at build time. This page reads the products array
// directly from a module — pure data, available at build time.
//
// ≈ Angular Universal's prerender routes array, but colocated with the route
// and typed to match [id]'s shape automatically.
export async function generateStaticParams(): Promise<{ id: string }[]> {
  return products.map((p) => ({ id: p.id }));
}

// dynamicParams controls what happens when a visitor hits a URL whose [id]
// was NOT returned by generateStaticParams — e.g. a product created via the
// admin CRUD after the build ran (its UUID was unknown at build time).
//
//   true  (default) → fall through to SSR for unknown IDs: the new product's
//                      detail page renders on demand. Admin CRUD keeps working.
//   false            → return 404 immediately for unknown IDs. Correct for a
//                      fully static dataset, but breaks our runtime addProduct.
//
// We keep true so the learning exercises remain consistent. In a real app with
// a DB you'd rebuild on new content (ISR, webhook-triggered) and set false.
export const dynamicParams = true;

// generateMetadata and the page both receive the same params Promise.
// Next.js deduplicates the params await — it's not resolved twice.
// For the OG image we reuse the product's existing picsum URL; in production
// you'd generate a custom social card via next/og (ImageResponse).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = products.find((p) => p.id === id);
  if (!product) return {};          // page's notFound() handles the 404

  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [{ url: product.imageUrl, width: 400, height: 300 }],
    },
  };
}

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
      {/* priority: this is the page's LCP element, above the fold — preload
          it instead of the default lazy loading (lazy would *delay* the
          largest paint). ≈ NgOptimizedImage's priority attribute. */}
      <Image
        src={product.imageUrl}
        alt={product.name}
        width={400}
        height={300}
        priority
        className={styles.photo}
      />
      <p className={styles.category}>{product.category}</p>
      <p className={styles.price}>{formatPrice(product.priceCents)}</p>
      <p>{product.description}</p>
      <AddToCartButton productId={product.id} />
      <p>
        <Link href={`/admin/products/${product.id}/edit`}>
          Edit product (admin)
        </Link>
      </p>
    </main>
  );
}
