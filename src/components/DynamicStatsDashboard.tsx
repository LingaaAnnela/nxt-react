// Client Component: next/dynamic with ssr: false is only permitted inside
// a Client Component in Next.js App Router. A Server Component page cannot
// call dynamic(..., { ssr: false }) directly — the runtime enforces this.
//
// Pattern: a thin 'use client' wrapper holds the dynamic() call; the Server
// Component page imports this wrapper. The wrapper adds no visible UI —
// it exists purely to satisfy the Client Component boundary requirement.
'use client';

import dynamic from 'next/dynamic';
import StatsSkeletonLoader from './StatsSkeletonLoader';

// The dynamic import is the code-split boundary. Everything inside
// @/components/StatsDashboard becomes a separate JS chunk.
// ssr: false — StatsDashboard reads localStorage; see StatsDashboard.tsx for why.
const StatsDashboard = dynamic(
  async () => {
    // Artificial delay so the skeleton is always visible without throttling
    // the network. Remove this wrapper in production — the real chunk
    // download time replaces it.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return import('./StatsDashboard');
  },
  {
    loading: () => <StatsSkeletonLoader />,
    ssr: false,
  },
);

export default function DynamicStatsDashboard() {
  return <StatsDashboard />;
}
