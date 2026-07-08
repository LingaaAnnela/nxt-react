// Static metadata — no data needed, so a plain export is enough.
// The template in the root layout turns 'Learn' into "Learn — Brew Gear".
import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Learn',
  description: 'Concept reference and interview prep for React, Next.js, and Redux built in the Brew Gear project.',
};

// Server Component: reads topic metadata from the filesystem (via getAllTopicMeta)
// and renders static markup. The accordion uses native <details>/<summary> — no
// 'use client' needed. The topic guide links point to /learn/[topic] pages, each
// backed by a markdown file in src/content/topics/.

import Link from 'next/link';
import { getAllTopicMeta } from '@/lib/topics';
import styles from './page.module.css';

type QA = { q: string; a: string };

function Section({ title, items }: { title: string; items: QA[] }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {items.map(({ q, a }) => (
        <details key={q} className={styles.details}>
          <summary className={styles.summary}>{q}</summary>
          <p className={styles.answer}>{a}</p>
        </details>
      ))}
    </section>
  );
}

const SECTIONS: { title: string; items: QA[] }[] = [
  {
    title: 'Rendering Model',
    items: [
      {
        q: 'What is a React Server Component?',
        a: 'A component that runs only on the server (or at build time). It can be async, read databases directly, and import server-only modules. It ships zero JS to the browser — only the rendered HTML. Think of it as a template-only Angular component with no constructor or lifecycle hooks.',
      },
      {
        q: "When do you add 'use client'?",
        a: "Only when a component needs hooks (useState, useEffect, useRef, Redux selectors) or browser event handlers (onClick, onChange). Keep the boundary as low in the tree as possible — a Server Component parent can pass data down to a Client Component child, but not the other way around.",
      },
      {
        q: 'What is hydration?',
        a: "The browser receives static HTML from the server, then React 'wakes up' the Client Components by attaching event listeners and syncing state. Server Components don't hydrate — they have no client-side representation. A hydration mismatch (server HTML ≠ client render) causes a runtime warning and a full re-render.",
      },
      {
        q: 'Why does ShopHeader need to be a Client Component when only the cart button is interactive?',
        a: "The cart button calls useAppSelector and dispatch — both are hooks, so they require 'use client'. The nav links alone could be a Server Component, but they live in the same file. The optimisation is to split the header into a Server shell + a small Client island for the cart button — worth it only if the header becomes heavy.",
      },
    ],
  },
  {
    title: 'Data Fetching — RTK Query',
    items: [
      {
        q: 'Why RTK Query instead of useEffect + fetch?',
        a: 'RTK Query gives you automatic caching, deduplication, background refetching, loading/error states, and cache invalidation — all without writing a useEffect. A useEffect fetch is a NgRx Effect with no caching, no deduplication, and manual cleanup. RTK Query ≈ NgRx + Effects + EntityAdapter bundled together.',
      },
      {
        q: 'What is cache tag invalidation?',
        a: 'Each query is tagged (e.g. "Product"). A mutation declares which tags it invalidates; RTK Query then refetches every subscribed query carrying those tags. In Brew Gear, deleteProduct invalidates ["Product"], so the product list re-fetches automatically. ≈ dispatching a reload action in NgRx.',
      },
      {
        q: "What is the 'two-cache model' in Next.js?",
        a: "Next.js has a server-side router cache (HTML/RSC payloads, invalidated by revalidatePath). RTK Query maintains a separate client-side in-memory cache (invalidated by invalidatesTags). A Server Action must call revalidatePath to bust the router cache AND the mutation must call invalidatesTags to bust the client cache — they are independent.",
      },
      {
        q: 'When does a queryFn wrap a Server Action instead of calling fetch?',
        a: "When there is no HTTP endpoint — the Server Action is the API. RTK Query only cares that queryFn returns { data } or { error }. Wrapping the action avoids creating a route handler just to have an HTTP boundary, and keeps tag invalidation working on the client.",
      },
    ],
  },
  {
    title: 'Forms — Two Approaches',
    items: [
      {
        q: 'Server Actions + useActionState — when is this the right choice?',
        a: 'When you want progressive enhancement (works without JS), simple validation on the server, or a redirect on success. The form posts to the action natively. useActionState gives you the pending flag and the last action result. Downside: no per-field live validation until the form is submitted.',
      },
      {
        q: 'React Hook Form + zod — when is this the right choice?',
        a: 'When you need per-field live validation, isDirty gates (disable Save until the form changes), or complex field interactions. RHF is fully client-side: it needs JS and does NOT progressively enhance. In Brew Gear the edit form uses RHF because isDirty prevents pointless saves.',
      },
      {
        q: 'Why does the zod schema live in both the client and the server action?',
        a: "The schema is the shared contract. The client runs it to predict the output (for optimistic UI and type inference via useForm's generic). The server re-parses as the authoritative pass — never trust client-transformed data. The schema's input type (string price) ≠ output type (cents integer): z.input vs z.output.",
      },
      {
        q: 'Why does the Server Action return a discriminated union instead of redirecting?',
        a: "redirect() throws — it can't return validation errors. When RTK Query wraps the action, the client needs to know success vs failure (tag invalidation only fires on success). The action returns { status: 'success' | 'error' }; the client handles navigation via router.push after a successful unwrap.",
      },
    ],
  },
  {
    title: 'State Management',
    items: [
      {
        q: 'Redux slice vs useState — how do you choose?',
        a: "useState for local, ephemeral UI state that only one component cares about (a toggle, a hover, a two-step confirm). A Redux slice when state is shared across components that don't have a direct parent-child relationship (cart count in the header + drawer), or when you want devtools/time-travel. ≈ NgRx feature store vs component state.",
      },
      {
        q: 'Why is makeStore() a factory, not a module-level singleton?',
        a: "In SSR each request gets its own store so user A's state never leaks into user B's response. A module-level singleton is created once and shared across all requests on the same server instance — a data leak. makeStore() ≈ a per-request NgRx module instantiation.",
      },
      {
        q: 'What are the three isPending-style flags and when does each appear?',
        a: "useActionState: isPending while a Server Action round-trip is in flight (the form is posted). React Hook Form: formState.isSubmitting while handleSubmit is executing. RTK Query mutation hook: isLoading while the queryFn is executing. All three are true for roughly the same duration; which you use depends on which form approach the component uses.",
      },
    ],
  },
  {
    title: 'Routing — App Router',
    items: [
      {
        q: 'What is the App Router and how does it differ from the Pages Router?',
        a: "The App Router (app/) uses React Server Components by default, supports nested layouts, and co-locates loading.tsx / error.tsx beside the page. The Pages Router (pages/) predates RSC — every component is a Client Component. App Router is the current standard; Pages Router is legacy.",
      },
      {
        q: 'What does loading.tsx do and how does it work?',
        a: "Next.js wraps the page in a React Suspense boundary automatically. While the async Server Component (the page) is awaiting data, the browser streams the loading.tsx shell to the client immediately — the skeleton appears in milliseconds. The full HTML arrives later in the same HTTP response as a streamed chunk.",
      },
      {
        q: 'What is a nested layout and why is /admin using one?',
        a: "A layout.tsx wraps all routes at that level and below. /admin/layout.tsx renders a sign-out button and could add admin-specific chrome without touching the root layout. Nested layouts compose: root layout → admin layout → page. ≈ Angular router's named outlets with a parent route component.",
      },
    ],
  },
  {
    title: 'Auth — Two-Layer Design',
    items: [
      {
        q: 'What is the two-layer auth pattern used in Brew Gear?',
        a: "Layer 1 — proxy.ts (middleware): fast optimistic check. Reads the cookie, if absent redirects to /admin/login. Runs on every /admin request before any rendering. Does NOT verify the token value — speed matters here. Layer 2 — DAL (verifySession in session.ts): the real boundary. Every mutating Server Action calls it; it verifies the token value. Even if an attacker crafts a cookie that passes the proxy, the DAL rejects it.",
      },
      {
        q: 'Why is verifySession() wrapped in React cache()?',
        a: "React cache() deduplicates calls within a single React render tree. If three Server Components on the same request each call verifySession(), only one cookie read / token check actually runs. ≈ an Angular route guard that's memoised for the duration of the request.",
      },
      {
        q: 'Why httpOnly + SameSite=Lax for the session cookie?',
        a: "httpOnly: JavaScript cannot read the cookie — XSS cannot steal it. SameSite=Lax: the cookie is not sent on cross-site POST requests (CSRF mitigation) but IS sent on top-level navigations (clicking a link from another site still works). The combination covers the two most common session-theft vectors.",
      },
    ],
  },
  {
    title: 'Optimistic UI',
    items: [
      {
        q: 'What is an optimistic update and when is it worth adding?',
        a: "You apply the expected result to the client cache before the server responds, so the UI feels instant. Worth it when the mutation is very likely to succeed (editing a product price) and a brief stale value is acceptable. Not worth it for irreversible or side-effectful operations (payments, sends).",
      },
      {
        q: 'How does RTK Query implement an optimistic update?',
        a: "Inside the mutation's onQueryStarted callback: call api.util.updateQueryData to patch the cached list via an Immer draft, save the returned patch object, await the action, and call patch.undo() in the catch block. The Immer draft produces both the forward patch and its inverse automatically.",
      },
      {
        q: "Why does the optimistic value run the zod schema client-side?",
        a: "The schema transforms the raw form input (price as a string) into the server-shaped output (priceCents as an integer). Running it client-side makes the optimistic value structurally identical to what the server will return — a prediction derived from the contract, not a guess.",
      },
    ],
  },
  {
    title: 'Error Handling — error.tsx + not-found.tsx',
    items: [
      {
        q: "Why must error.tsx always be a Client Component?",
        a: "React Error Boundaries — the mechanism that catches render-time throws — can only be class components or, in Next.js's model, 'use client' files. Next.js wraps error.tsx in an Error Boundary HOC automatically; you just export the fallback UI. There is no way to make error.tsx a Server Component.",
      },
      {
        q: "What are the two props error.tsx receives, and what does reset() do?",
        a: "error — the thrown Error object. In production, message may be sanitised to avoid leaking internals; error.digest is a server-log correlation hash you can display or send to Sentry without exposing stack traces. reset() — re-renders the failed segment in place, giving React another attempt without a full page reload. ≈ Angular's ErrorHandler.handleError, but recoverable.",
      },
      {
        q: "How does Next.js decide which not-found.tsx to render?",
        a: "Next.js walks UP the route tree from the notFound() call and stops at the nearest not-found.tsx. A file at app/products/[id]/not-found.tsx wins over app/not-found.tsx because it is closer. The global app/not-found.tsx is the fallback for any URL that matches no route at all. Both return a real HTTP 404 status — not just a visual change.",
      },
      {
        q: "What is error.digest and why is it safe to show to users?",
        a: "A short hash Next.js generates server-side to identify the specific error instance in server logs. It contains no message text or stack trace — just a correlation token. Displaying it in the UI lets a user give support the digest ID to look up the real error in logs, without leaking internals to the browser.",
      },
    ],
  },
  {
    title: 'URL-Driven State — useSearchParams + useTransition',
    items: [
      {
        q: "Why store search/filter state in the URL instead of useState?",
        a: "URL state is shareable (copy the URL, get the same filter), survives a page refresh, and works with the browser back/forward buttons. useState is lost on reload and can't be bookmarked. The tradeoff: URL updates require a router call, which may trigger a server re-render. ≈ Angular's ActivatedRoute.queryParams as the source of truth.",
      },
      {
        q: "What is the difference between searchParams (Server) and useSearchParams() (Client)?",
        a: "searchParams is a prop Next.js injects into Server Component pages — it's a Promise you await, available only at the page level. useSearchParams() is a hook for Client Components that reads the live URL and re-renders the component when the URL changes (handles back/forward). Both give you the same data; which you use depends on where you are in the component tree.",
      },
      {
        q: "What does useTransition do when wrapping a router.replace call?",
        a: "startTransition marks the navigation as non-urgent. React keeps the current page fully visible and interactive while the server renders the new one — no flash of empty content. isPending is true during this window, so you can show a subtle indicator (a spinner, dimmed input). Without startTransition, the old content disappears immediately and loading.tsx shows instead.",
      },
      {
        q: "Why does a component using useSearchParams() need a Suspense wrapper in the parent?",
        a: "useSearchParams() reads from the URL, which is not known until the request arrives during SSR. This causes the component to suspend. Wrapping it in <Suspense> isolates that suspension — the rest of the page (the product grid) still renders server-side. Without Suspense, Next.js must defer the entire page to dynamic rendering.",
      },
    ],
  },
  {
    title: 'Metadata API',
    items: [
      {
        q: "What is the title.template pattern and why is it useful?",
        a: "Set title: { template: '%s — Brew Gear', default: 'Brew Gear' } once in the root layout. Every page then exports title: 'Products' and Next.js stitches it into 'Products — Brew Gear' automatically. Without template, every page file would have to repeat the brand name. The default value is shown when a page exports no title at all.",
      },
      {
        q: "When do you use a static metadata export vs generateMetadata?",
        a: "Use export const metadata when the values are known at write time (a static page like /learn). Use export async function generateMetadata when the values depend on route params or fetched data (a product's name and description from its ID, or a search query changing the page title). Both run server-side and never ship to the client.",
      },
      {
        q: "How does metadata inheritance work across layouts and pages?",
        a: "Next.js deep-merges every metadata export in the active route tree, with the closest file to the page winning on conflicts. A layout.tsx sets defaults; a page.tsx overrides specific fields. The root layout's title.template applies to any title string a child page exports — no extra wiring needed.",
      },
      {
        q: "How do you prevent admin pages from being indexed by search engines?",
        a: "Export metadata with robots: { index: false } from the admin layout.tsx. Because it's in the layout rather than each page, it applies to every /admin/* route by inheritance. Next.js emits a <meta name='robots' content='noindex'> tag for those pages.",
      },
    ],
  },
  {
    title: 'Static Generation — generateStaticParams',
    items: [
      {
        q: "What does generateStaticParams do and when does it run?",
        a: "It's an async function exported from a dynamic route segment (e.g. [id]) that returns the list of param values to pre-render at build time. next build calls it once, generates a static HTML file for each returned value, and serves those as static files. The page component code doesn't change — only WHEN it runs changes: build time vs. request time. ≈ Angular Universal's prerender routes, but colocated with the route.",
      },
      {
        q: "What does dynamicParams control and what are the tradeoffs?",
        a: "dynamicParams controls what happens when a visitor hits a URL whose param was NOT returned by generateStaticParams — e.g. a product added at runtime after the build. true (default): fall through to SSR for unknown params, the page renders on demand. false: return 404 immediately. Use false when you know all valid params at build time and want strict enforcement. Use true when runtime-generated content (like admin CRUD) also needs to be viewable.",
      },
      {
        q: "What do the ○ ● ƒ symbols mean in next build output?",
        a: "○ (Static): pre-rendered at build time, no dynamic data. ● (SSG): pre-rendered at build time via generateStaticParams — one HTML file per returned param. ƒ (Dynamic): server-rendered on every request. Pages that call connection(), read cookies, or use searchParams are dynamic. The symbols tell you the rendering strategy at a glance without reading every page file.",
      },
      {
        q: "Why can the /products listing page not use generateStaticParams?",
        a: "The listing page calls connection() to explicitly opt out of prerendering, then fetches from /api/products at request time. connection() tells Next.js 'this page has request-time I/O — do not prerender me.' Without it, next build would try to execute the fetch at build time when no server is running, failing with ECONNREFUSED. A page with a dynamically fetched list also can't know its content at build time anyway.",
      },
    ],
  },
  {
    title: 'Context + useReducer',
    items: [
      {
        q: "When do you reach for context instead of a Redux slice?",
        a: "Context is right for shared UI infrastructure that is ephemeral, local to the React tree, and not needed in devtools: toasts, theme, locale, modals. Redux is right for domain state that persists across navigations, needs time-travel debugging, or is shared with Server Actions and cache invalidation. The rule: Redux for domain data, context for UI plumbing.",
      },
      {
        q: "Why use null as the createContext default and guard it in a hook?",
        a: "createContext(null) means 'no provider is present'. The useToast() wrapper calls useContext and throws if the result is null, giving a clear error message ('useToast() must be called inside <ToastProvider>'). Without the null default you'd need a no-op default value, which silently does nothing when a component is used outside the provider — the bug is invisible. ≈ Angular's inject() throwing when a token isn't provided.",
      },
      {
        q: "Why wrap the context's addToast function in useCallback?",
        a: "addToast lives in context. Without memoization, every toast dismissal triggers a ToastProvider re-render, producing a new addToast function object, which makes every useContext(ToastContext) consumer re-render — even components that didn't change. useCallback(fn, []) pins the reference across re-renders. The empty deps array is safe because dispatch from useReducer is guaranteed stable by React.",
      },
      {
        q: "useReducer vs useState — how do you choose?",
        a: "useState for a single scalar value or simple toggle. useReducer when you have multiple named operations on a collection (add toast, remove toast), or when the next state depends on the previous in non-trivial ways. useReducer makes each transition explicit and named, which is easier to test and reason about. ≈ a mini NgRx reducer scoped to a component rather than the global store.",
      },
    ],
  },
  {
    title: 'Angular Services → React Equivalents',
    items: [
      {
        q: 'There are no Angular services in React — what replaces them?',
        a: "Angular uses a single construct (the @Injectable class) for everything from HTTP calls to shared state to utility logic. React has no DI container, so it spreads those responsibilities across three patterns: custom hooks (stateful shared logic), plain module functions (stateless logic), and Context / Redux (singleton-ish state). The explicit import replaces the injector — you wire dependencies yourself instead of declaring them and letting the framework resolve them.",
      },
      {
        q: 'What is a custom hook and how does it map to an Angular service?',
        a: "A custom hook is any function whose name starts with 'use' and that calls other hooks internally. It encapsulates stateful logic that multiple components need without prop drilling. ≈ injecting a stateful Angular service into a component: useToast() ≈ inject(ToastService), useAppSelector() ≈ inject(Store).select(), useRouter() ≈ inject(Router), useGetProductsQuery() ≈ inject(ProductService).getAll(). The key difference: a hook is NOT a singleton — each component gets its own hook instance. The singleton part lives in the Context Provider or Redux store above it.",
      },
      {
        q: 'Where does Brew Gear use plain module functions instead of a service class?',
        a: "Stateless logic that needs no DI is just a plain exported function: formatPrice() in src/lib/shop/format.ts (≈ CurrencyService.format()), addProduct / updateProduct / removeProduct in mock-products.ts (≈ ProductService CRUD methods), verifySession() in src/lib/auth/session.ts (≈ AuthService.verifyToken()), and the zod productSchema (≈ ValidationService.validate()). No class, no decorator, no injector — just import the function and call it. This makes them trivially tree-shakeable and testable without a TestBed.",
      },
      {
        q: 'How does RTK Query replace an Angular HttpClient-based service?',
        a: "src/lib/redux/api.ts is the equivalent of an Angular service that injects HttpClient. The createApi call defines all endpoints (getProducts, updateProduct, deleteProduct). The generated hooks — useGetProductsQuery(), useUpdateProductMutation() — are what components consume, exactly like calling inject(ProductService).getAll() in a component. RTK Query adds caching, deduplication, loading/error states, and tag invalidation on top, which you'd otherwise wire manually in an NgRx effect.",
      },
      {
        q: 'What replaces an Angular service that runs server-side logic?',
        a: "Server Actions (src/app/admin/products/actions.ts) and plain async functions called from route handlers. verifySession() in src/lib/auth/session.ts is a pure server-side function — it reads cookies, checks a token, returns a result — exactly like an AuthService method, but it's a plain function imported directly rather than injected. The 'server-only' import at the top of session.ts acts as a compile-time guard that throws a build error if the file is ever imported on the client, ≈ keeping a service out of the browser bundle.",
      },
      {
        q: 'When should you write a custom hook vs a plain function?',
        a: "Write a plain function when the logic is pure / stateless — no hooks inside, same input always gives same output (formatPrice, productSchema.parse, verifySession). Write a custom hook when the logic needs React hooks internally: useState, useEffect, useContext, useReducer. The rule: if it doesn't call any hook, it doesn't need to be a hook. Naming it useXxx when it's really just a function is misleading and forces unnecessary linting rules.",
      },
    ],
  },
  {
    title: 'Prop Drilling & Context API',
    items: [
      {
        q: 'What is prop drilling and when does it become a problem?',
        a: "Prop drilling is passing data through intermediate components that don't use it, purely to get it to a deeply nested child. One or two levels is normal and fine — it only becomes a problem when the chain is 4–5 levels deep and every component in the chain must declare a prop it doesn't need. ≈ passing a service reference down through @Input() chains in Angular instead of injecting it directly.",
      },
      {
        q: 'Where does Brew Gear use plain props vs Context API?',
        a: "Plain props: ProductDetailPage passes productId directly to AddToCartButton (one level — fine). Context API: ToastProvider provides addToast to AddToCartButton across multiple layout levels without any intermediate component touching the prop. Redux (which is itself context under the hood): StoreProvider wraps the app so any component can call useAppSelector / useAppDispatch without prop threading. The rule: props for direct parent→child, context when intermediaries would have to carry a prop they don't use.",
      },
      {
        q: 'How do you decide between props, context, Redux, and URL state?',
        a: "One or two levels deep → plain props, don't overthink it. Many levels, UI-only concern (toasts, theme, open modal) → Context + useReducer or useState. Many levels, domain data with devtools / persistence needs (cart, user session) → Redux. State that should survive a reload, be shareable via URL, or work with back/forward → URL state via searchParams / useSearchParams. Each layer solves a specific scope; reaching for Redux or context before you've exhausted plain props is premature.",
      },
      {
        q: 'Why is the Redux store itself a context under the hood?',
        a: "Redux's React bindings (react-redux) use createContext internally. StoreProvider renders <Provider store={store}>, which is a context provider. useAppSelector and useAppDispatch are thin wrappers around useContext(ReactReduxContext). You don't see createContext in your code because RTK abstracts it — but every component that reads cart state or dispatches an action is consuming context. This is why StoreProvider must wrap the component tree just like ToastProvider does.",
      },
      {
        q: 'What is the null default pattern for createContext and why use it?',
        a: "createContext(null) signals 'no provider present'. The useToast() wrapper calls useContext(ToastContext) and throws a clear error if the result is null: 'useToast() must be called inside <ToastProvider>'. Without null as the default you'd need a no-op value — addToast would silently do nothing when called outside the provider and the bug would be invisible. The null + guard pattern turns a silent wrong-context mistake into an immediate, descriptive error. ≈ Angular's inject() throwing when a token isn't provided in the injector hierarchy.",
      },
    ],
  },
  {
    title: 'Font Optimisation — next/font',
    items: [
      {
        q: "What does next/font do that a plain <link> to Google Fonts doesn't?",
        a: "next/font/google downloads the font files at BUILD TIME and self-hosts them alongside the app. No <link> to fonts.googleapis.com is emitted — the browser makes zero third-party font requests. Benefits: privacy (Google never sees user IPs), reliability (no external CDN dependency), and performance (font served from the same origin, no extra DNS lookup or connection).",
      },
      {
        q: "What is size-adjust and how does it prevent Cumulative Layout Shift?",
        a: "When a custom font loads after the fallback, letters may be wider or taller — elements reflow and CLS score rises. Next.js measures the custom font's metrics and emits a second @font-face for the fallback (e.g. Arial) with size-adjust, ascent-override, descent-override, and line-gap-override tuned to match the custom font exactly. The fallback occupies the same space, so the swap causes no reflow.",
      },
      {
        q: "CSS variable approach vs className — what is the difference?",
        a: "className applies the font directly to whichever element carries the class and nothing else. variable: '--font-inter' injects a CSS custom property onto that element; you then write font-family: var(--font-inter) in any CSS file — globals.css, a CSS Module, anywhere — without importing the font object there. The variable approach is more flexible for an app where fonts apply globally via globals.css.",
      },
      {
        q: "Why must font objects be created at module scope, not inside a component?",
        a: "Next.js statically analyses font imports at build time to download font files and generate the size-adjusted @font-face declarations. If the font call is inside a function or component, the static analyser cannot find it at build time — the optimisation silently fails and no font files are bundled. Always initialise fonts at the top level of a module.",
      },
    ],
  },
  {
    title: 'Memoisation — useMemo, useCallback, React.memo',
    items: [
      {
        q: 'What does React.memo do and when does it have no effect?',
        a: "React.memo wraps a component and shallow-compares each prop before deciding whether to re-render. If all props are reference-equal to the previous render, the previous output is reused. It has no effect when a callback prop is defined inline in the parent — every parent render creates a new function object, the reference comparison always fails, and the child re-renders anyway. Fix: wrap the callback in useCallback in the parent. The /catalog page demonstrates this live with render count badges on each card.",
      },
      {
        q: 'What is referential equality and why does it matter for memoisation?',
        a: "JavaScript's === compares objects, arrays, and functions by reference, not value. { name: 'same' } === { name: 'same' } is false — different objects. A new array or inline function is always a different reference, even with identical contents. React.memo's shallow check and useEffect dependency arrays both use ===. useMemo and useCallback preserve references across renders so those checks can actually pass. The classic mistake: passing a new object literal {} or array [] as a prop on every render breaks React.memo silently.",
      },
      {
        q: 'Why is useCallback useless without React.memo, and vice versa?',
        a: "useCallback without React.memo: stabilising a function reference changes nothing if the child re-renders on every parent render regardless. React.memo without useCallback on callbacks: the memo check always fails because the callback is a new reference each render. They're co-requisites: useCallback gives the stable reference; React.memo uses that stability to skip the render. The same logic applies to useMemo — a memoised value passed as a prop only matters if the receiving component checks that prop.",
      },
      {
        q: 'When does useMemo help beyond skipping expensive computation?',
        a: "useMemo's return value has a stable reference. Passing a memoised array as a prop to a React.memo child: the memo check passes (same reference → skip render). Putting a memoised value in a useEffect dep array: the effect doesn't re-run for unrelated parent renders. Both are cases where the goal isn't computation savings — it's reference stability. This is why you'll see useMemo on even 'cheap' computations when the result is used in a dep array.",
      },
      {
        q: 'When is memoisation the wrong choice?',
        a: "When the computation is cheap (string formatting, simple arithmetic), the component renders infrequently, or the deps change on every render anyway (the cache never hits). Every useMemo / useCallback call allocates memory for the cached value and runs a dep comparison on every render — if the cache never hits, you paid the cost with no benefit. The right workflow: profile first with React DevTools Profiler → measure actual re-render time → memoize only the specific hot paths the profiler identifies.",
      },
    ],
  },
  {
    title: 'Senior Interview Topics — Performance, A11y, Security',
    items: [
      {
        q: 'What is list virtualisation and when do you need it?',
        a: "List virtualisation renders only the items visible in the viewport instead of the entire list — a 10,000-row table creates 10,000 DOM nodes without it. Libraries: react-window (minimal, good for simple lists/grids) and @tanstack/react-virtual (more flexible, no wrapper element required). The rule: virtualise when you have more than ~100–200 items in a scrollable container and scrolling feels slow. Never virtualise a short list — the added complexity buys nothing.",
      },
      {
        q: 'What are the most important WCAG 2.1 AA requirements for a financial app?',
        a: "(1) Focus management: when a modal opens, focus moves inside; when it closes, focus returns to the trigger. (2) Colour contrast: 4.5:1 ratio for body text, 3:1 for large text. (3) Keyboard operability: every action reachable without a mouse, including custom dropdowns and date pickers. (4) Form errors: associated with inputs via aria-invalid and aria-describedby so screen readers announce them when the field receives focus. (5) Live regions: dynamic content (toasts, search results, cart count) announced via aria-live='polite' or role='alert'. Brew Gear's toast container uses aria-live='polite'.",
      },
      {
        q: 'Why is localStorage a bad place to store auth tokens?',
        a: "localStorage is readable by any JavaScript on the page. A single XSS vulnerability — even one from a third-party script — can read and exfiltrate the token. The correct location is an httpOnly cookie: the browser sends it automatically on requests, but JavaScript cannot read document.cookie to steal it. Combine with SameSite=Lax to block CSRF (prevents cross-origin form-POST from sending the cookie) and Secure to enforce HTTPS. Next.js's cookies() API reads httpOnly cookies in Server Components and Server Actions without ever exposing them to client code.",
      },
      {
        q: 'How does React prevent XSS and what breaks that protection?',
        a: "JSX escapes all string values automatically — <script>alert(1)</script> injected as a React child renders as literal text, not an executable tag. Two things break this: (1) dangerouslySetInnerHTML with user-controlled HTML — safe only with filesystem-sourced content or server-side DOMPurify sanitisation; (2) user-controlled href attributes with javascript: URLs — validate before rendering, or use Next.js <Link> which blocks javascript: URIs. React's escaping applies only to JSX string interpolation; it does not sanitise HTML you inject yourself.",
      },
      {
        q: 'What is code splitting and how do you apply it in a Next.js app?',
        a: "Code splitting breaks the JS bundle into smaller chunks loaded on demand. Next.js does route-level splitting automatically — each page is its own chunk, never loaded until that route is visited. Apply React.lazy(() => import('./Heavy')) at the component level for heavy UI not shown on first paint: a rich text editor, a PDF viewer, an admin dashboard panel. Wrap in <Suspense fallback={<Skeleton />}> to show a placeholder while the chunk loads. In Next.js, next/dynamic is the recommended alternative to React.lazy for components that need SSR control.",
      },
      {
        q: 'How does React DevTools Profiler help with performance debugging?',
        a: "Record a Profiler session, then inspect the flame chart: each bar is a component, width represents render time, grey means 'did not render'. The 'Ranked' tab lists all components that rendered, sorted by duration. Look for: (1) components that render on every interaction but appear nowhere in the changed data path — candidates for React.memo; (2) components that take >16ms — causes of jank; (3) the same component rendering multiple times in one interaction — a missing memo or an unstable reference in a dep array. Always profile in production mode — development React adds overhead that distorts measurements.",
      },
    ],
  },
];

export default async function LearnPage() {
  const topics = await getAllTopicMeta();

  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>Learn / Prepare</h1>
      <p className={styles.intro}>
        Concept reference and interview prep for everything built in Brew Gear.
        Try the <Link href="/catalog">Catalog demo</Link> — a live useMemo + React.memo exercise with render count badges.
      </p>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Topic Guides</h2>
        <p className={styles.topicIntro}>
          Full explanations — read these to build the mental model.
        </p>
        <ul className={styles.topicList}>
          {topics.map((t) => (
            <li key={t.slug}>
              <Link href={`/learn/${t.slug}`} className={styles.topicLink}>
                <span className={styles.topicTitle}>{t.title}</span>
                <span className={styles.topicDesc}>{t.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Quick Reference — Q&amp;A</h2>
        <p className={styles.topicIntro}>
          Test your recall. Click a question to reveal the answer.
        </p>
      </section>

      {SECTIONS.map((s) => (
        <Section key={s.title} title={s.title} items={s.items} />
      ))}
    </main>
  );
}
