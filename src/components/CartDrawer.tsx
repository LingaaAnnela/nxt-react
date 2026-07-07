"use client";

// Client Component: everything here is store-driven — open/closed from the
// UI slice, line items from the cart slice, product details via RTK Query.
// The cart slice stores only { productId, quantity }; the drawer joins that
// with the product cache at render time (normalized state, ≈ joining two
// entity collections in an NgRx selector).

import { useEffect } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectCartItems, itemRemoved } from "@/lib/redux/features/cartSlice";
import {
  selectCartDrawerOpen,
  cartDrawerClosed,
} from "@/lib/redux/features/uiSlice";
import { useGetProductsQuery } from "@/lib/redux/api";
import { formatPrice } from "@/lib/shop/format";
import styles from "./CartDrawer.module.css";

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

  // Close on Escape. A document-level listener lives outside React's tree,
  // so it needs an effect to attach/detach it — ≈ @HostListener
  // ('document:keydown.escape'), with the returned cleanup ≈ ngOnDestroy.
  // Declared above the early return: hooks must run unconditionally on every
  // render (Rules of Hooks), so the effect checks `open` itself instead.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dispatch(cartDrawerClosed());
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, dispatch]);

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
    <>
      {/* Mouse-convenience dismiss only — aria-hidden keeps it out of the
          accessibility tree; Escape and the ✕ button are the real controls. */}
      <div
        className={styles.backdrop}
        aria-hidden="true"
        onClick={() => dispatch(cartDrawerClosed())}
      />
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
                      : "—"}
                  </span>
                  <button
                    type="button"
                    className={styles.remove}
                    aria-label={`Remove ${line.product?.name ?? line.productId} from cart`}
                    onClick={() => dispatch(itemRemoved(line.productId))}
                  >
                    ✕
                  </button>
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
    </>
  );
}
