# E-commerce learning app — phase plan

A small e-commerce app to practice React/Next.js concepts, approached from a
senior Angular/NgRx background. Build **one phase at a time**: after each
phase, summarize what was built and why, then STOP and wait for an explicit
"continue" before starting the next. Never skip ahead.

## Phases

- [x] **Phase 1 — Scaffold.** Folder structure, domain types, Redux store wired
      up (single `createApi`, ready for feature slices). No UI.
- [x] **Phase 2 — Product listing page.** Server Component at `/products`,
      fetching from a local mock API route handler (`/api/products`).
- [x] **Phase 3 — Product detail + "Add to cart".** Dynamic route
      `/products/[id]`; Client Component dispatching to a new `cartSlice`.
- [x] **Phase 4 — Cart drawer.** Client Component reading cart state from the
      store; drawer open/closed state in a separate pure-UI slice.
- [x] **Phase 5 — Checkout form.** Server Action + `useActionState`, simulated
      success/failure — no real payment, no API route.
- [x] **Phase 6 — Tests.** One reducer test, one component test rendered with
      the Redux Provider wrapper (`renderWithStore`).

All six phases complete (2026-07-06). Ideas for further practice are listed at
the bottom of this file.

## Possible next exercises

- ~~`itemRemoved` reducer + per-line remove buttons in the cart drawer~~ —
  done 2026-07-06, TDD'd (red-green).
- ~~Close the cart drawer on Escape / backdrop click~~ — done 2026-07-06
  (first real `useEffect`: document keydown listener + cleanup).
- ~~Keep form values after a failed checkout submit~~ — done 2026-07-06
  (action echoes `fields` back in error state; inputs repopulate via
  `defaultValue` after React 19's post-action form reset).
- ~~Per-field validation errors~~ — done 2026-07-06 (action returns
  `errors: { name?, email? }`, hand-rolled but zod-shaped; inputs wired with
  `aria-invalid`/`aria-describedby`).
- ~~Focus first invalid field after failed submit~~ — done 2026-07-06
  (form `useRef` + effect querying `[aria-invalid="true"]`; effect depends
  on `state` object identity so re-submits refocus).
- ~~Render product images with `next/image`~~ — done 2026-07-06
  (`remotePatterns` allowlists `picsum.photos/seed/**`; lazy grid images,
  `priority` + preload on the detail page LCP; verified jpeg→webp via
  `/_next/image`; skeleton grew a matching image block).
- ~~A `loading.tsx` for `/products`~~ — done 2026-07-06 (skeleton grid reusing
  the page's CSS module; streaming verified by chunk timing: shell+skeleton
  flushed at ~43ms, product HTML at ~355ms in the same response).
- ~~Persist the cart to `localStorage`~~ — done 2026-07-06 (`cartHydrated`
  action dispatched from a StoreProvider effect after hydration — NOT
  preloadedState, which would mismatch the server HTML; `store.subscribe`
  writes on items reference change; `cartPersistence.ts` validates the
  untrusted stored JSON, with tests).

All original backlog exercises are complete as of 2026-07-06. Additional
work done the same day: per-field checkout validation errors, focus-first-
invalid-field, form value preservation after failed submits.

## Conventions

- Every component file starts with a comment explaining **why** it is or isn't
  a Client Component — the reasoning, not just the directive.
- Where a concept has a clean Angular/NgRx equivalent, add a short comment
  naming it (e.g. `// ≈ an NgRx effect`). Skip it when the analogy would be
  forced.
- RTK Query for fetched/server data; plain RTK slices for pure UI state.
- Server Actions (not API route handlers) for mutations.
- CSS Modules for styling.
- Money is stored as integer cents (`priceCents`), never floats.

## History

- The repo started with a `/counter` + jsonplaceholder RTK Query exercise.
  Both were removed on 2026-07-06 once the e-commerce app covered the same
  concepts; `/` is now the shop landing page.
