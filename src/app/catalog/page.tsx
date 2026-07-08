// Client Component: the whole page lives on the client because all the
// interesting state (category, sortBy, tick) and the RTK Query hook live here.
// The deliberate trade-off: no server rendering of the product grid. The demo
// value — observable useMemo + React.memo behaviour — requires a running React
// tree, which only exists in the browser.
'use client';

import { useMemo, useState, useCallback } from 'react';
import { useGetProductsQuery } from '@/lib/redux/api';
import { useAppDispatch } from '@/lib/redux/hooks';
import { itemAdded } from '@/lib/redux/features/cartSlice';
import { useToast } from '@/lib/toast/ToastProvider';
import MemoProductCard from '@/components/MemoProductCard';
import styles from './page.module.css';

// Note: generateMetadata cannot be used in Client Component files.
// Hard-code the title for this demo page.

export default function CatalogPage() {
  const { data: products = [], isLoading } = useGetProductsQuery();
  const dispatch = useAppDispatch();
  const { addToast } = useToast();

  const [category, setCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'name' | 'price'>('name');

  // Unrelated state — clicking "Force re-render" increments this, causing the
  // page to re-render. It is deliberately NOT in any useMemo dep array and NOT
  // passed to MemoProductCard. The point is to prove that unrelated parent
  // state changes don't touch the cards when the system is correctly wired.
  const [tick, setTick] = useState(0);

  // useMemo: produces a stable array reference as long as products, category,
  // and sortBy haven't changed. tick++ does NOT trigger recomputation.
  // Watch the ↻ badge on each card — it stays frozen on tick changes.
  const categories = useMemo(
    () => ['All', ...new Set(products.map((p) => p.category))].sort(),
    [products],
  );

  const filtered = useMemo(() => {
    const list =
      category === 'All'
        ? products
        : products.filter((p) => p.category === category);
    return [...list].sort((a, b) =>
      sortBy === 'name'
        ? a.name.localeCompare(b.name)
        : a.priceCents - b.priceCents,
    );
  }, [products, category, sortBy]);

  // useCallback: same function reference across renders as long as dispatch and
  // addToast don't change (they're guaranteed stable — dispatch by Redux
  // contract, addToast by useCallback([]) in ToastProvider). Without this,
  // every parent render passes a new function to MemoProductCard, the
  // React.memo prop check always fails, and the cards re-render for nothing.
  // ≈ an NgRx Store.dispatch reference being stable across component renders.
  const handleAddToCart = useCallback(
    (productId: string) => {
      dispatch(itemAdded(productId));
      addToast('Added to cart!');
    },
    [dispatch, addToast],
  );

  if (isLoading) {
    return <p className={styles.loading}>Loading products…</p>;
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>Product Catalog</h1>
      <p className={styles.subtitle}>
        Live demo — useMemo · useCallback · React.memo
      </p>

      <div className={styles.callout}>
        <p>
          The <span className={styles.badge}>↻ N</span> badge on each card
          counts how many times React has rendered it. Try the experiment:
        </p>
        <ol className={styles.steps}>
          <li>Click <strong>Force re-render</strong> — the tick counter goes up, the page re-renders, but no card counts change. Unrelated parent state does not reach memoised children.</li>
          <li>Change the category — cards for the new category appear at ↻ 1 (first render). The other cards keep their count (they were reused, not re-rendered, because React reconciles by key).</li>
          <li>Change sort order — order changes in the DOM, but no card counts tick up. React moves them by key, not by re-rendering.</li>
        </ol>
        <p className={styles.calloutNote}>
          <strong>The trap to watch for:</strong> if <code>handleAddToCart</code> were defined
          inline (<code>{'onClick={() => dispatch(...)}'}</code>), every parent render would pass a
          new function reference — the React.memo check would always fail and the cards would
          re-render on every tick anyway. <code>useCallback</code> is what makes <code>React.memo</code> stick.
        </p>
      </div>

      <div className={styles.controls}>
        <label className={styles.controlGroup}>
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={styles.select}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.controlGroup}>
          Sort by
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'price')}
            className={styles.select}
          >
            <option value="name">Name A → Z</option>
            <option value="price">Price low → high</option>
          </select>
        </label>

        <button
          type="button"
          className={styles.forceButton}
          onClick={() => setTick((t) => t + 1)}
        >
          Force re-render (tick: {tick})
        </button>
      </div>

      <p className={styles.count}>
        Showing {filtered.length} of {products.length} products
      </p>

      <ul className={styles.grid}>
        {filtered.map((product) => (
          <MemoProductCard
            key={product.id}
            product={product}
            onAddToCart={handleAddToCart}
          />
        ))}
      </ul>
    </main>
  );
}
