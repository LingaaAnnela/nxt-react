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

- `itemRemoved` reducer + per-line remove buttons in the cart drawer (TDD it:
  reducer test first).
- Close the cart drawer on Escape / backdrop click.
- Keep form values after a failed checkout submit (React 19 resets uncontrolled
  forms after an action — return entered values in the action state and use
  `defaultValue`).
- Render product images with `next/image` (needs `remotePatterns` config).
- A `loading.tsx` for `/products` to see streaming with the 300ms API delay.
- Persist the cart to `localStorage` (store subscription ≈ NgRx meta-reducer
  territory).

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
