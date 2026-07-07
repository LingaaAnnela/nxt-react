// Server Component (the default — no 'use client'): the root layout renders
// static document chrome and needs no state, effects, or browser APIs.
// {children} plays the role of <router-outlet>/<ng-content> — nested pages
// project into it, and they remain Server Components even though they render
// inside the client StoreProvider.
import type { Metadata } from 'next';
import { inter, playfair } from '@/lib/fonts';
import StoreProvider from '@/lib/redux/StoreProvider';
import { ToastProvider } from '@/lib/toast/ToastProvider';
import ShopHeader from '@/components/ShopHeader';
import CartDrawer from '@/components/CartDrawer';

// Static metadata — exported from layout.tsx to set app-wide defaults.
// Next.js deep-merges every metadata export in the active route tree; the
// closest file to the page wins on any conflict.
//
// title.template: the '%s' is replaced by whatever title a child page
// exports. A page exporting title: 'Products' renders as
// "Products — Brew Gear" in the browser tab — no repetition in every file.
// title.default: shown when a page exports no title at all.
//
// ≈ Angular's Title service, but declarative and automatically composed
// across the route tree rather than imperatively set per component.
export const metadata: Metadata = {
  title: {
    template: '%s — Brew Gear',
    default: 'Brew Gear',
  },
  description: 'Premium coffee gear for the serious home brewer.',
  openGraph: {
    siteName: 'Brew Gear',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Each font's .variable class injects its CSS custom property onto <html>.
    // Both variables are then available to every CSS file in the app via
    // var(--font-inter) and var(--font-playfair) — no per-file import needed.
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body>
        {/* ToastProvider wraps StoreProvider so toasts are available to any
            component in the tree, including those that also use the store. */}
        <ToastProvider>
          <StoreProvider>
            {/* Header and drawer live in the layout so they persist across
                route navigations — ≈ components beside <router-outlet> in the
                AppComponent template. */}
            <ShopHeader />
            {children}
            <CartDrawer />
          </StoreProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
