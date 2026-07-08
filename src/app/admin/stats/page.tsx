// Server Component: the page shell renders instantly — heading, callout, and
// skeleton are all static HTML. Only the StatsDashboard chunk is deferred.
// This is the key insight: code splitting delays only the part you split,
// not the whole page. ≈ Angular's loadChildren but at the component level.
//
// App Router rule: next/dynamic with ssr: false must be in a Client Component.
// DynamicStatsDashboard is that thin wrapper — see src/components/DynamicStatsDashboard.tsx.
import type { Metadata } from 'next';
import DynamicStatsDashboard from '@/components/DynamicStatsDashboard';
import styles from './page.module.css';

export const metadata: Metadata = { title: 'Analytics' };

export default function AdminStatsPage() {
  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>Analytics</h1>
      <p className={styles.subtitle}>next/dynamic · ssr: false · Suspense</p>

      <div className={styles.callout}>
        <p>
          This page demonstrates <strong>component-level code splitting</strong>.
          Open DevTools → Network → JS while you navigate here — you will see a
          separate chunk file (<code>StatsDashboard</code>) requested after the
          page HTML arrives. The heading and skeleton you see first come from the
          server instantly; the dashboard chunk is downloaded in a second request.
        </p>
        <p>
          The 1.5 s delay is artificial so the skeleton is always visible without
          throttling the network in DevTools. In production, remove the{' '}
          <code>setTimeout</code> wrapper — the real chunk download time replaces it.
        </p>
        <p className={styles.calloutNote}>
          <strong>App Router constraint:</strong> <code>ssr: false</code> is not
          allowed directly in a Server Component page. A thin{' '}
          <code>&apos;use client&apos;</code> wrapper (
          <code>DynamicStatsDashboard.tsx</code>) holds the{' '}
          <code>dynamic()</code> call, and this Server Component page imports
          that wrapper. The split boundary is still between the page and{' '}
          <code>StatsDashboard</code> — the wrapper adds no bundle weight.
        </p>
      </div>

      {/* DynamicStatsDashboard is a 'use client' wrapper that calls dynamic()
          with ssr: false. The actual code-split boundary is one level deeper:
          StatsDashboard.tsx is the chunk that downloads after the page loads. */}
      <DynamicStatsDashboard />
    </main>
  );
}
