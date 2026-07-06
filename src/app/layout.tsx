// Server Component (the default — no 'use client'): the root layout renders
// static document chrome and needs no state, effects, or browser APIs.
// {children} plays the role of <router-outlet>/<ng-content> — nested pages
// project into it, and they remain Server Components even though they render
// inside the client StoreProvider.
import StoreProvider from '@/lib/redux/StoreProvider';
import ShopHeader from '@/components/ShopHeader';
import CartDrawer from '@/components/CartDrawer';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          {/* Header and drawer live in the layout so they persist across
              route navigations — ≈ components beside <router-outlet> in the
              AppComponent template. */}
          <ShopHeader />
          {children}
          <CartDrawer />
        </StoreProvider>
      </body>
    </html>
  );
}
