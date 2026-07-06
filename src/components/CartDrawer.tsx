'use client';

// Client Component: everything here is store-driven — open/closed from the
// UI slice, line items from the cart slice, product details via RTK Query.
// The cart slice stores only { productId, quantity }; the drawer joins that
// with the product cache at render time (normalized state, ≈ joining two
// entity collections in an NgRx selector).

import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { selectCartItems } from '@/lib/redux/features/cartSlice';
import {
  selectCartDrawerOpen,
  cartDrawerClosed,
} from '@/lib/redux/features/uiSlice';
import { useGetProductsQuery } from '@/lib/redux/api';
import { formatPrice } from '@/lib/shop/format';
import styles from './CartDrawer.module.css';

export default function CartDrawer() {
  const dispatch = useAppDispatch();
  const open = useAppSelector(selectCartDrawerOpen);
  const items = useAppSelector(selectCartItems);
  // The generated hook fetches on first use, then serves the cache. `skip`
  // defers the request until the drawer is actually opened — ≈ an effect
  // guarded by a "loaded" flag, but declarative.
  const { data: products, isLoading } = useGetProductsQuery(undefined, {
    skip: !open,
  });

  if (!open) return null;

  const lines = items.map((item) => ({
    ...item,
    product: products?.find((p) => p.id === item.productId),
  }));
  const totalCents = lines.reduce(
    (sum, line) =>
      sum + (line.product ? line.product.priceCents * line.quantity : 0),
    0,
  );

  return (
    <aside className={styles.drawer} aria-label="Shopping cart">
      <div className={styles.head}>
        <h2>Your cart</h2>
        <button
          type="button"
          className={styles.close}
          aria-label="Close cart"
          onClick={() => dispatch(cartDrawerClosed())}
        >
          ✕
        </button>
      </div>

      {items.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : isLoading ? (
        <p>Loading…</p>
      ) : (
        <>
          <ul className={styles.lines}>
            {lines.map((line) => (
              <li key={line.productId} className={styles.line}>
                <span>
                  {line.product?.name ?? line.productId} × {line.quantity}
                </span>
                <span>
                  {line.product
                    ? formatPrice(line.product.priceCents * line.quantity)
                    : '—'}
                </span>
              </li>
            ))}
          </ul>
          <p className={styles.total}>
            <span>Total</span>
            <span>{formatPrice(totalCents)}</span>
          </p>
          <Link
            href="/checkout"
            className={styles.checkout}
            onClick={() => dispatch(cartDrawerClosed())}
          >
            Checkout
          </Link>
        </>
      )}
    </aside>
  );
}
