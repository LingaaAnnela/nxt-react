# Debugging Next.js — a field guide for an Angular developer

The core mental-model shift: an Angular app is a pure client-side SPA, so
**everything** — HTTP calls, console output, breakpoints — lives in browser
DevTools. A Next.js App Router app runs in **two runtimes at once**:

| | Server (Node.js) | Browser |
|---|---|---|
| What runs there | Server Components, route handlers, Server Actions | Client Components (`'use client'`), Redux store, RTK Query |
| `console.log` goes to | the terminal running `npm run dev` | browser console |
| Network calls visible in | terminal (fetch logging, below) | DevTools Network tab |
| Breakpoint debugger | Node inspector (`--inspect`) | DevTools Sources tab |

**Rule of thumb: where the code runs determines where you debug it.**

## Why `/api/products` doesn't show in the Network tab

`src/app/products/page.tsx` is a Server Component. Its `fetch()` executes in
the Node process *before* HTML is sent — the browser never makes that request,
so the Network tab can't see it. This isn't a limitation; it's the point:
data fetching moved off the client (≈ if your Angular resolver ran on the
server and shipped resolved HTML instead of JSON).

## What you DO see in the Network tab

- **The document request** — the HTML for a full page load. Preview it: the
  data is already in the markup.
- **RSC payload requests** — clicking a `<Link>` doesn't reload the page; it
  fetches the new page's serialized component tree. Look for requests with
  `?_rsc=...` and content-type `text/x-component`. This is the App Router's
  version of "the router made an API call".
- **Server Action calls** — submitting the checkout form sends a `POST` to
  the *current page URL* with a `Next-Action: <id>` header. There's no
  `/api/checkout` endpoint; the action ID in the header selects the function.
- **Client-side fetches** — anything RTK Query does behaves exactly like
  `HttpClient`: fully visible in the Network tab.

## Seeing server-side calls: fetch logging

`next.config.ts` in this repo enables it:

```ts
logging: {
  fetches: { fullUrl: true },
  browserToTerminal: true,
},
```

With that, the dev terminal shows every server-side `fetch` with URL, status,
duration, and cache status, nested under the request that triggered it:

```
GET /products 200 in 312ms
 │ GET http://localhost:3000/api/products 200 in 305ms (cache skip)
```

Server Action invocations are also logged by default in Next 16.2
(`POST / └─ ƒ placeOrder(...) in 812ms`), and `browserToTerminal: true`
forwards browser `console.*` output to the terminal with file/line info —
one console for both runtimes.

Docs: `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/logging.md`

## Breakpoint debugging

### Server-side code (Server Components, actions, route handlers)

```bash
npm run dev -- --inspect
```

Then open `chrome://inspect` → your app appears under **Remote Target** →
click **inspect**. You get a second DevTools window attached to the Node
process — breakpoints in `page.tsx`'s `getProducts()` hit *there*, not in the
page's own DevTools. (Dev-error overlays also show a Node.js icon that copies
this DevTools URL.)

In VS Code, a `.vscode/launch.json` with `"command": "npm run dev -- --inspect"`
(type `node-terminal`) lets you set breakpoints in the editor across both
runtimes — see the bundled guide below for the full config including a
"debug full stack" option.

### Client-side code

Plain browser DevTools → Sources tab (`⌘+P` to find the file), or drop a
`debugger` statement. Source maps work out of the box in dev.

Docs: `node_modules/next/dist/docs/01-app/02-guides/debugging.md`

## Inspecting components: React DevTools

In Angular, the DOM mirrors the component tree (`<app-product-card>` elements),
so the Elements tab is useful. React components compile away into plain
`<div>`s — the Elements tab shows only the output, never the structure.

Install the **React Developer Tools** extension (≈ Angular DevTools):

- **Components tab** — the component tree with props/state; click a DOM node
  with the picker to jump to its owning component. Server Components appear
  in the tree but have no state to edit (they already ran, on the server).
- **Profiler tab** — records which components re-rendered and why
  (≈ Angular DevTools profiler; "why did this render?" is the React
  equivalent of hunting unnecessary change-detection cycles).

## Inspecting the store: Redux DevTools

The **Redux DevTools** extension (same one NgRx's StoreDevtools piggybacks on)
works unchanged — configureStore enables it by default in dev. Action log,
state diffs, time travel. RTK Query cache entries live under the `api` key,
so you can watch cache lifecycle (pending → fulfilled, tags invalidating).

## Quick reference: "where do I look?"

| Symptom | Look in |
|---|---|
| Server Component fetch failing / slow | dev terminal (fetch logs) |
| `console.log` in a Server Component "not printing" | it printed — in the terminal |
| Server Action behaving oddly | terminal logs + Network tab (the POST with `Next-Action` header) |
| Client Component state/props wrong | React DevTools Components tab |
| Redux state wrong | Redux DevTools |
| Hydration mismatch error | browser console (React logs the exact DOM diff) |
| Need a breakpoint in server code | `npm run dev -- --inspect` + `chrome://inspect` |
