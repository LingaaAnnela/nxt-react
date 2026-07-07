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

## Current exercise — admin product CRUD (forms two ways)

Comparing the two main React form approaches on the same domain:

- [x] **Step 1 — Create product, plain Server Action** (done 2026-07-07).
      `/admin/products/new`: uncontrolled form + `useActionState`, zod schema
      with a price-string→cents transform (`src/lib/shop/productSchema.ts`,
      tested), `addProduct` mutating the in-memory array, `revalidatePath`
      before `redirect` (order matters — redirect throws). Zod 4 API note:
      `z.flattenError(error)`, not the deprecated `error.flatten()`.
- [x] **Step 2 — Edit product, React Hook Form + zod** (done 2026-07-07).
      `/admin/products/[id]/edit`: `useForm` + `zodResolver` reusing the SAME
      schema as the action; typed as
      `useForm<ProductFormInput, unknown, ProductFormValues>` (fields hold
      z.input, submit produces z.output). `defaultValues` seed fields and the
      `isDirty` baseline (gates Save). The action is called directly from
      `handleSubmit` with the raw input strings — server re-parses with the
      shared schema as the authoritative pass; rejected fields map back via
      `setError` (incl. `root.server` banner). First test to mock a Server
      Action module (`ProductEditForm.test.tsx`). Trade-off noted: RHF forms
      need JS — no progressive enhancement, `defaultValues` fill on mount,
      not in SSR HTML.
- [x] **Step 3 — RTK Query cache invalidation** (done 2026-07-07). The admin
      edit now flows through `useUpdateProductMutation`: a `queryFn` calls
      the Server Action directly (no HTTP endpoint — RTK Query only needs
      `{ data }` back), and function-form `invalidatesTags` invalidates
      `"Product"` only when `status === "success"`, so subscribed
      `getProducts` queries (cart drawer, checkout) refetch automatically.
      The action returns a discriminated union instead of `redirect()`ing —
      navigation moved to the client (`router.push`) because the client owns
      the tag invalidation. Validation failures ride the DATA channel (the
      action returns them); RTKQ's error channel is transport failures only
      (`unwrap()` + try/catch). Two-caches model: `revalidatePath` = server/
      router cache, `invalidatesTags` = client cache. Known gap: the CREATE
      path still doesn't invalidate the client cache (its server redirect
      leaves no client success hook) — candidate follow-up.
- [x] **Step 4 — Delete product** (done 2026-07-07). A mutation with NO form:
      `DeleteProductButton` on the edit page ("danger zone") with an inline
      two-step confirm held in `useState` — not `window.confirm` (blocking,
      unstylable, untestable). Same queryFn-wraps-action mutation pattern as
      step 3 (`useDeleteProductMutation`, function-form `invalidatesTags`);
      pending flag trio noted: `useActionState`→`isPending`,
      RHF→`isSubmitting`, mutation hook→`isLoading`. On success the button
      also dispatches `itemRemoved` (cart is plain client state — tags don't
      refetch it) before `router.push`. `renderWithStore` now returns the
      store so tests can seed/assert cart state.
- [x] **Step 5 — Optimistic updates** (done 2026-07-07). `updateProduct` no
      longer uses `invalidatesTags`: `onQueryStarted` patches the cached
      `getProducts` list immediately via `api.util.updateQueryData` (Immer
      draft + inverse patch), `patch.undo()` on server rejection or transport
      failure, and on success reconciles the cache with the product the
      action returned (cheaper than a refetch). The optimistic value comes
      from running the SAME zod schema client-side — a prediction, not a
      guess. `deleteProduct` stays tag-based deliberately as the pessimistic
      contrast (making it optimistic = reader exercise). New store-level test
      file `api.test.ts`: no rendering, seeds the cache with
      `api.util.upsertQueryData` (a thunk — must be awaited, or patches
      silently no-op against an empty cache), asserts the patch lands before
      the mock action resolves.
- [x] **Step 6 — Auth guard for /admin** (done 2026-07-07). Two-layer design
      straight from the bundled auth guide: `src/proxy.ts` (Next 16's rename
      of middleware.ts) does the OPTIMISTIC check — cookie presence only,
      redirect to `/admin/login?from=…` — while the real boundary is the DAL
      (`src/lib/auth/session.ts`): `verifySession()` (React `cache`d,
      value-checked) called inside every mutating action. Session = httpOnly
      SameSite=Lax cookie holding a SHA-256-derived bearer token (password:
      `brew-admin` / ADMIN_PASSWORD env; real apps: DB session or jose JWT).
      Login form echoes NO fields (never echo passwords); `from` is
      open-redirect-guarded. First nested layout (`admin/layout.tsx`) with a
      no-JS `<form action={logout}>` sign-out; reading cookies made all
      /admin routes dynamic. `server-only` poison pill in session.ts caught a
      real leak path in tests (vitest lacks the server/client split) — fixed
      with an alias stub in vitest.config.ts. Guard tests in
      `admin/products/actions.test.ts` run the REAL actions against a fake
      cookie jar, incl. the forged-cookie case the proxy admits.

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
