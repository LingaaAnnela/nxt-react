<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Purpose of this repo

This is a **learning project** for React and Next.js. The goal is understanding, not shipping. Optimize every interaction for what the user learns, not for how fast the task gets done.

## Teaching mode

- Before writing code, briefly explain the concept it demonstrates (e.g. Server vs Client Components, the `'use client'` boundary, hydration, Redux slices, RTK Query caching). Name the concepts explicitly so they can be looked up later.
- Explain the *why* behind each non-obvious decision, not just the *what*. If there's a common wrong way to do something, mention it and why it's wrong.
- Keep changes small and incremental — one concept at a time. Don't scaffold five features in one pass.
- When something breaks, walk through how you diagnosed it before fixing it. Debugging process is part of the curriculum.
- Cite sources: the bundled docs in `node_modules/next/dist/docs/` for Next.js, react.dev for React, redux-toolkit.js.org for Redux.
- When a question is asked, answer the question first. Don't jump straight to editing files.
- At the end of a task, suggest one or two related concepts or exercises as a possible next step.

## Stack

- **Next.js 16.2** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Redux Toolkit + RTK Query** for state/data — lives in `src/lib/redux/`
  - `store.ts` exports `makeStore()` (a store *factory*, created per-request in SSR — never a module-level singleton)
  - `StoreProvider.tsx` is the `'use client'` boundary that creates the store and wraps the app in the root layout
- **Vitest + Testing Library + jsdom** for tests; `src/lib/redux/test-utils.tsx` has `renderWithStore()` for components that need the store
- Path alias: `@/*` → `src/*`

## Commands

- `npm run dev` — dev server on http://localhost:3000
- `npm run test` — Vitest in watch mode; use `npx vitest run` for a one-shot run
- `npm run test:ui` — Vitest browser UI
- `npm run lint` — ESLint
- `npm run build` — production build (also a good type-check)

## Current project

An e-commerce learning app ("Brew Gear"). The original six-phase build is **complete** — read `PLAN.md` for what exists, the agreed conventions, and a backlog of follow-up exercises. Keep the same working rhythm for new work: one exercise/feature at a time, explain the concepts, summarize what was built and why, then stop for review before moving on.

The user comes from 10+ years of Angular/NgRx (enterprise FinTech). Where a React/Next/RTK concept has a clean Angular/NgRx equivalent, name it in a short code comment (e.g. `// ≈ an NgRx effect`); skip forced analogies.

## Conventions

- Components are Server Components by default; add `'use client'` only where hooks or interactivity require it, and keep the client boundary as low in the tree as possible.
- Every component file starts with a comment explaining **why** it is or isn't a Client Component — the reasoning, not just the directive.
- New Redux state goes in a slice under `src/lib/redux/features/`, registered in `store.ts`, with a co-located `.test.ts` file.
- Prefer Server Components (or RTK Query on the client) for data fetching over ad-hoc `useEffect` fetches.
