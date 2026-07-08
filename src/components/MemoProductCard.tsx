// Client Component: uses useRef to count renders — a hook, so 'use client' is
// required. Wrapped in React.memo so the parent catalog page can demonstrate
// memoisation by triggering parent re-renders without touching this card's props.
'use client';
import { memo, useRef } from 'react';
import Image from 'next/image';
import type { Product } from '@/lib/shop/types';
import { formatPrice } from '@/lib/shop/format';
import styles from './MemoProductCard.module.css';

interface Props {
  product: Product;
  onAddToCart: (id: string) => void;
}

// React.memo: before re-rendering, React shallow-compares every prop.
// If `product` and `onAddToCart` references are the same as the last render,
// this function never runs — the previous output is reused unchanged.
//
// The trap: `onAddToCart` MUST be stabilised with useCallback in the parent.
// If the parent defines it inline, every parent render creates a new function
// object, the reference comparison always fails, and memo does nothing.
const MemoProductCard = memo(function MemoProductCard({ product, onAddToCart }: Props) {
  // useRef persists a mutable value across renders WITHOUT triggering a re-render.
  // Incrementing here makes re-renders visible without interfering with them.
  // ≈ storing a mutable field on an Angular component class without a signal.
  const renderCount = useRef(0);
  renderCount.current += 1;

  return (
    <li className={styles.card}>
      <span className={styles.renderBadge} title="Number of times React has rendered this card">
        ↻ {renderCount.current}
      </span>
      <div className={styles.imageWrapper}>
        <Image
          src={product.imageUrl}
          alt={product.name}
          width={280}
          height={180}
          className={styles.image}
        />
      </div>
      <div className={styles.body}>
        <span className={styles.category}>{product.category}</span>
        <h2 className={styles.name}>{product.name}</h2>
        <p className={styles.price}>{formatPrice(product.priceCents)}</p>
        <button
          type="button"
          className={styles.addButton}
          onClick={() => onAddToCart(product.id)}
        >
          Add to cart
        </button>
      </div>
    </li>
  );
});

export default MemoProductCard;
