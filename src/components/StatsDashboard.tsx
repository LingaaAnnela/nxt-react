// This file is intentionally excluded from the initial page bundle.
// next/dynamic loads it as a separate JS chunk — in production this would
// be a charting library import (recharts, Chart.js ~500 KB) that you only
// pay for when the user visits the analytics page.
//
// Client Component: uses hooks (useGetProductsQuery, useEffect, useState)
// AND reads localStorage — both require a browser environment.
// The 'use client' directive + ssr: false in next/dynamic ensures this
// file never runs on the server.
'use client';

import { useEffect, useState } from 'react';
import { useGetProductsQuery } from '@/lib/redux/api';
import { formatPrice } from '@/lib/shop/format';
import styles from './StatsDashboard.module.css';

// localStorage hook — the legitimate reason ssr: false is needed.
// The server doesn't have localStorage; rendering on the server would
// produce "First visit" while the client might show a real date, causing
// a hydration mismatch. ssr: false prevents the server from rendering
// this component at all — the client is always authoritative.
function useLastViewed(key: string) {
  const [lastViewed, setLastViewed] = useState<string | null>(null);
  useEffect(() => {
    const previous = localStorage.getItem(key);
    localStorage.setItem(key, new Date().toISOString());
    // Reading localStorage (an external system) then syncing to state is
    // exactly the intended use of useEffect — the lint rule is a false positive here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLastViewed(previous);
  }, [key]);
  return lastViewed;
}

export default function StatsDashboard() {
  const { data: products = [] } = useGetProductsQuery();
  const lastViewed = useLastViewed('brew-stats-viewed');

  const total = products.length;
  const totalValueCents = products.reduce((s, p) => s + p.priceCents, 0);
  const avgPriceCents = total > 0 ? Math.round(totalValueCents / total) : 0;

  // Group by category for the bar chart
  const byCategory = Object.entries(
    products.reduce<Record<string, number>>((acc, p) => {
      acc[p.category] = (acc[p.category] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort(([, a], [, b]) => b - a);

  const cheapest = [...products].sort((a, b) => a.priceCents - b.priceCents)[0];
  const priciest = [...products].sort((a, b) => b.priceCents - a.priceCents)[0];

  return (
    <div className={styles.dashboard}>
      <p className={styles.lastViewed}>
        {/* localStorage value — only accurate in the browser, hence ssr: false */}
        Last viewed:{' '}
        {lastViewed
          ? new Date(lastViewed).toLocaleString()
          : 'First visit — refresh to see the timestamp update'}
      </p>

      <div className={styles.statGrid}>
        <StatCard label="Total products" value={total} />
        <StatCard label="Catalogue value" value={formatPrice(totalValueCents)} />
        <StatCard label="Average price" value={formatPrice(avgPriceCents)} />
      </div>

      <h2 className={styles.subheading}>By category</h2>
      <ul className={styles.categoryList} aria-label="Products by category">
        {byCategory.map(([cat, count]) => (
          <li key={cat} className={styles.categoryRow}>
            <span className={styles.catName}>{cat}</span>
            {/* CSS custom property drives the bar width — no chart library needed */}
            <span
              className={styles.catBar}
              style={{ '--pct': `${(count / total) * 100}%` } as React.CSSProperties}
              aria-label={`${count} of ${total}`}
            />
            <span className={styles.catCount}>{count}</span>
          </li>
        ))}
      </ul>

      {(cheapest || priciest) && (
        <>
          <h2 className={styles.subheading}>Price range</h2>
          <div className={styles.statGrid}>
            {cheapest && (
              <StatCard
                label="Cheapest"
                value={`${cheapest.name} — ${formatPrice(cheapest.priceCents)}`}
              />
            )}
            {priciest && (
              <StatCard
                label="Most expensive"
                value={`${priciest.name} — ${formatPrice(priciest.priceCents)}`}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={styles.statCard}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  );
}
