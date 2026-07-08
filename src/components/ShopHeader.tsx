'use client';

// Client Component: the cart button shows a live count from the store and
// dispatches the drawer toggle. The nav links alone could be a Server
// Component — they ride inside the client boundary because the cart button
// drags the whole file client-side. Splitting them out is the optimization
// you'd reach for if this header grew heavy.

import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { selectCartCount } from '@/lib/redux/features/cartSlice';
import { cartDrawerToggled } from '@/lib/redux/features/uiSlice';
import styles from './ShopHeader.module.css';

export default function ShopHeader() {
  const dispatch = useAppDispatch();
  const count = useAppSelector(selectCartCount);

  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
        <Link href="/products">Products</Link>
        <Link href="/catalog">Catalog</Link>
        <Link href="/virtualize">Virtualize</Link>
        <Link href="/admin/stats">Stats</Link>
        <Link href="/learn">Learn</Link>
      </nav>
      <button
        type="button"
        className={styles.cartButton}
        onClick={() => dispatch(cartDrawerToggled())}
      >
        Cart ({count})
      </button>
    </header>
  );
}
