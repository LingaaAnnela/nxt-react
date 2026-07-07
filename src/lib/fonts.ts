// next/font/google downloads these fonts at BUILD TIME and self-hosts them.
// No <link rel="stylesheet"> to Google's CDN is emitted — the browser never
// makes a third-party font request (privacy + reliability benefit).
//
// CONSTRAINT: font objects must be created at module scope, never inside a
// component or function. Next.js statically analyses font imports to bundle
// the files at build time; dynamic instantiation silently falls back to a
// no-op and you lose the optimisation without an obvious error.
//
// variable: the CSS custom property name injected on whichever element
// receives the font's .variable class. Referencing var(--font-inter) in any
// CSS file then "just works" — no import needed at the usage site.
// This is more flexible than using font.className directly, which would lock
// the font to one element and require the import everywhere else.
//
// subsets: only download the Latin character subset. The full font can be
// 10× larger. Always be explicit — omitting subsets downloads everything.
//
// display: 'swap' — show the fallback font immediately, swap in the custom
// font when it's ready. Can cause a brief FOUT (flash of unstyled text), but
// Next.js generates a size-adjusted @font-face fallback so the layout shift
// is near-zero: the fallback occupies the same space as the real font.
// Alternative: 'optional' — gives the browser 100ms; if the font isn't ready,
// uses the fallback for the entire page load. Zero CLS, but the custom font
// may not appear on slow connections or first visits.

import { Inter, Playfair_Display } from 'next/font/google';

export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

// Playfair Display: serif, editorial feel — used for headings only.
// weight: the specific weights to download. Omitting this downloads ALL
// weights, which is wasteful. '400' (regular) + '700' (bold) covers
// most heading use cases.
export const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  weight: ['400', '700'],
});
