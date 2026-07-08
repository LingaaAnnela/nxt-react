---
title: React vs Angular — Similarities, Differences & Mental Model Map
description: A side-by-side comparison of every major Angular concept and its React/Next.js equivalent — for developers making the switch.
order: 0
---

# React vs Angular — Similarities, Differences & Mental Model Map

This guide is written for someone with deep Angular experience who is learning React. Instead of teaching React from zero, it maps every Angular concept you already know to its React counterpart — or explains what fills the gap when there is no direct equivalent.

---

## The biggest mindset shift

Angular is a **framework**: it provides one opinionated answer for every concern — routing, forms, HTTP, DI, change detection, SSR. You learn the Angular way once and follow it everywhere.

React is a **library**: it handles rendering and reconciliation only. Everything else — routing, data fetching, forms, state, SSR — is your choice, composed from separate libraries. This is both the appeal and the friction when coming from Angular.

| Concern | Angular built-in | React ecosystem choice |
|---|---|---|
| Rendering | Angular renderer | React (the library) |
| Routing | `@angular/router` | Next.js App Router (this project) |
| State (global) | NgRx Store | Redux Toolkit |
| State (server data) | NgRx + Effects + EntityAdapter | RTK Query |
| Forms | Reactive Forms / Template Forms | React Hook Form + zod (or `useActionState`) |
| HTTP | `HttpClient` | `fetch` / RTK Query `queryFn` |
| DI / services | `@Injectable` + injector | Custom hooks + plain functions + Context |
| SSR | Angular Universal | Next.js (App Router) |
| Build | Angular CLI / esbuild | Next.js (webpack / Turbopack) |
| Testing | TestBed + Jasmine/Jest | Vitest + React Testing Library |

---

## Components

### Angular

```ts
@Component({
  selector: 'app-product-card',
  templateUrl: './product-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCardComponent {
  @Input() product!: Product;
  @Output() addToCart = new EventEmitter<Product>();
}
```

### React

```tsx
// No decorator, no class, no selector — a function is a component.
// Props are just function parameters; events are callback props.
export default function ProductCard({
  product,
  onAddToCart,
}: {
  product: Product;
  onAddToCart: (p: Product) => void;
}) {
  return <button onClick={() => onAddToCart(product)}>{product.name}</button>;
}
```

**Key differences:**

| | Angular | React |
|---|---|---|
| Component definition | Class + `@Component` decorator | Function (with or without hooks) |
| Template | Separate `.html` file or inline `template:` | JSX inline in the same file |
| Inputs | `@Input()` decorator | Destructured function parameter |
| Outputs | `@Output()` + `EventEmitter` | Callback prop (`onAddToCart: (p) => void`) |
| Styles | `styleUrls`, `ViewEncapsulation` | CSS Modules, Tailwind, or `styled-components` |
| Lifecycle | `ngOnInit`, `ngOnDestroy`, `ngOnChanges` | `useEffect` (see below) |

**What's the same:** TypeScript types on inputs/props, component composition (nesting components), the concept of "presentational vs container" components.

---

## Templates vs JSX

Angular templates are HTML with a special syntax. JSX is JavaScript that looks like HTML — you can use any JS expression directly.

```html
<!-- Angular template -->
<ul>
  <li *ngFor="let p of products; trackBy: trackById">
    <span *ngIf="p.inStock">{{ p.name | currency }}</span>
  </li>
</ul>
```

```tsx
{/* JSX — just JavaScript expressions */}
<ul>
  {products.map((p) => (
    <li key={p.id}>
      {p.inStock && <span>{formatPrice(p.priceCents)}</span>}
    </li>
  ))}
</ul>
```

| Angular template | JSX equivalent |
|---|---|
| `*ngFor="let x of list; trackBy: fn"` | `list.map(x => <Item key={x.id} />)` |
| `*ngIf="condition"` | `{condition && <Item />}` or ternary |
| `{{ value }}` | `{value}` |
| `[attr]="expr"` | `attr={expr}` |
| `(click)="handler()"` | `onClick={handler}` |
| `[(ngModel)]="field"` | `value={field} onChange={e => setField(e.target.value)}` |
| `pipe \| currency` | Plain function call: `formatPrice(cents)` |
| `<ng-container>` | `<>` (React Fragment) |
| `<ng-template>` | No direct equivalent — use conditional rendering or a render prop |

**Pipes → plain functions.** React has no pipe mechanism. You call a utility function directly in JSX:

```tsx
// Angular:  {{ priceCents | currency:'USD' }}
// React:    {formatPrice(priceCents)}
```

This is simpler to test and tree-shake but less declarative in the template.

---

## Change detection vs React reconciliation

This is the biggest under-the-hood difference.

**Angular** runs change detection in **zones** (Zone.js patches async APIs). After any async event (click, HTTP response, timer), Angular walks the component tree checking if outputs changed. `OnPush` optimises this: Angular only checks when an `@Input` reference changes or an `async` pipe emits.

**React** re-renders when `useState`/`useReducer` state changes or when a parent re-renders (passing new props). React's reconciler diffs the virtual DOM tree and patches only the changed DOM nodes. There is no Zone.js equivalent — React does not automatically track async operations.

| Concept | Angular | React |
|---|---|---|
| What triggers an update | Zone.js catches async events | `setState` / `dispatch` called explicitly |
| Optimisation unit | `ChangeDetectionStrategy.OnPush` | `React.memo` + `useCallback`/`useMemo` |
| Fine-grained control | `markForCheck()`, `detectChanges()` | No equivalent needed — React batches by default |

**Practical implication:** in Angular, mutating an object triggers change detection (if using default strategy). In React, mutating state directly does nothing — you must return a new reference (immutability is required, which is why RTK uses Immer under the hood, just like NgRx).

---

## Lifecycle hooks → useEffect

Angular has distinct lifecycle hooks for distinct moments. React collapses most of them into `useEffect`.

| Angular | React equivalent |
|---|---|
| `ngOnInit` | `useEffect(() => { ... }, [])` — empty deps = run once on mount |
| `ngOnDestroy` | Return a cleanup function from `useEffect` |
| `ngOnChanges(changes)` | `useEffect(() => { ... }, [prop])` — run when `prop` changes |
| `ngAfterViewInit` | `useEffect` with a `ref` (DOM is available after paint) |
| `ngDoCheck` | Rarely needed — React's reconciler handles this |

```tsx
useEffect(() => {
  const sub = someObservable.subscribe(handler);   // ≈ ngOnInit subscription
  return () => sub.unsubscribe();                  // ≈ ngOnDestroy cleanup
}, []);                                            // [] = mount/unmount only
```

**Important:** React 18+ StrictMode double-invokes effects in development (mount → unmount → remount) to surface missing cleanups. This surprises Angular developers who expect `ngOnInit` to run exactly once.

---

## Dependency Injection → no DI

Angular's DI container resolves services via the injector hierarchy. React has no DI container. The same responsibilities are split across three patterns:

```ts
// Angular — inject anything, anywhere:
constructor(
  private productService: ProductService,
  private router: Router,
  private store: Store,
) {}
```

```tsx
// React — explicit imports / hooks / context reads:
const { data } = useGetProductsQuery();       // ≈ inject(ProductService).getAll()
const router = useRouter();                   // ≈ inject(Router)
const dispatch = useAppDispatch();            // ≈ inject(Store).dispatch
const { addToast } = useToast();              // ≈ inject(ToastService)
```

| Angular DI use | React replacement | Scope |
|---|---|---|
| Stateful shared service | Custom hook | Per component instance |
| Singleton app state | Redux store (via context) | App-wide singleton |
| Utility / pure logic | Plain imported function | No scope — just a function |
| HTTP service | RTK Query endpoint | Cached, deduplicated |
| Route guard | Middleware (`proxy.ts`) + DAL | Server-side |

**The key difference:** Angular's injector makes services singletons automatically. In React, "singleton" state lives in the Redux store or a Context Provider above the tree — you wire it yourself. Custom hooks are NOT singletons; each component calling `useCounter()` gets its own instance.

---

## Routing

| Angular Router | Next.js App Router |
|---|---|
| `app-routing.module.ts` config | File-system routing (`app/` directory) |
| `RouterModule.forRoot(routes)` | No config — folders = routes |
| `loadChildren: () => import(...)` | `page.tsx` inside a folder |
| `ActivatedRoute.snapshot.params` | `params: Promise<{ id: string }>` (awaited in Server Component) |
| `ActivatedRoute.queryParams` | `searchParams: Promise<{ q?: string }>` |
| `Router.navigate(['/products'])` | `router.push('/products')` (in Client Component) |
| `CanActivate` guard | `proxy.ts` (middleware) + server-side `verifySession()` |
| Named router outlets | Parallel routes (`@slot` folders) |
| Lazy-loaded feature module | Any `page.tsx` — Next.js splits automatically |

**The biggest difference:** Angular's router is configuration-driven; Next.js's is file-system-driven. There is no central route registry.

---

## State management — NgRx vs Redux Toolkit

NgRx and Redux share the same lineage (both are Redux-pattern implementations). The vocabulary maps almost 1:1.

| NgRx | Redux Toolkit |
|---|---|
| `Store` | `store` created by `makeStore()` |
| `createAction` | `createSlice` actions (auto-generated) |
| `createReducer` + `on()` | `createSlice` reducers (Immer-powered) |
| `createSelector` | `createSelector` (same API, from `reselect`) |
| `createEffect` (async side effect) | RTK Query `queryFn` / mutation |
| `EntityAdapter` | RTK Query cache (for server data) |
| `@ngrx/entity` normalized state | RTK Query tag-based invalidation |
| `provideMockStore` in tests | `makeStore()` + `renderWithStore()` |
| `StoreModule.forRoot()` | `StoreProvider` wrapping the app |

**What NgRx has that RTK does not:**
- `@ngrx/component-store` (local store per component) — closest React equivalent is `useReducer`
- `@ngrx/router-store` — no RTK equivalent; Next.js exposes route state via hooks/props directly
- Meta-reducers — RTK has middleware instead

**What RTK has that NgRx does not:**
- `createAsyncThunk` (simpler async than effects)
- RTK Query as a first-class citizen (NgRx data exists but is less tightly integrated)
- Immer built into every slice reducer (NgRx added this later via `createReducer`)

---

## Forms

Angular's Reactive Forms are the closest Angular equivalent to React Hook Form. Template-driven forms (two-way binding) have no React equivalent — React favours explicit controlled components.

| Angular Reactive Forms | React Hook Form + zod |
|---|---|
| `FormBuilder.group({...})` | `useForm<Input, _, Output>({ resolver: zodResolver(schema) })` |
| `FormControl.valueChanges` | `watch('field')` |
| `FormControl.valid / invalid` | `formState.errors.field` |
| `Validators.required` | `z.string().min(1)` in zod schema |
| `form.markAllAsTouched()` | Happens automatically on `handleSubmit` |
| `form.patchValue({...})` | `reset(values)` or `setValue('field', value)` |
| `form.dirty` | `formState.isDirty` |
| `AbstractControl.setErrors()` | `setError('field', { message: '...' })` |

**Progressive enhancement:** Angular Reactive Forms require JS. React's `useActionState` + Server Actions work without JS (native form post). React Hook Form requires JS (same as Angular). Choose based on whether you need the progressive-enhancement story.

---

## HTTP / data fetching

```ts
// Angular:
@Injectable({ providedIn: 'root' })
export class ProductService {
  constructor(private http: HttpClient) {}
  getAll() { return this.http.get<Product[]>('/api/products'); }
}
// Component:
this.products$ = this.productService.getAll();
```

```ts
// React + RTK Query:
const api = createApi({
  endpoints: (build) => ({
    getProducts: build.query<Product[], void>({
      queryFn: async () => {
        const res = await fetch('/api/products');
        return { data: await res.json() };
      },
    }),
  }),
});
// Component:
const { data: products } = useGetProductsQuery();
```

RTK Query handles what you'd otherwise combine from `HttpClient` + NgRx Effects + `EntityAdapter`: caching, deduplication, loading/error state, background refetch, and tag-based invalidation. There is no RxJS observable chain — you get a plain value and a set of boolean flags.

**RxJS:** React has no RxJS equivalent in common use. Async sequences are handled with `async/await`, `Promise.all`, and RTK Query. If you need observable streams, `rxjs` works in React but is not idiomatic.

---

## Modules

Angular requires every component, directive, and pipe to be declared in an `NgModule`. React has no module system of its own — ES modules (`import`/`export`) do the job. There is no `declarations`, `imports`, or `providers` array to maintain.

```ts
// Angular — required NgModule boilerplate:
@NgModule({
  declarations: [ProductCardComponent],
  imports: [CommonModule, RouterModule],
  exports: [ProductCardComponent],
})
export class ProductsModule {}
```

```tsx
// React — just export the component:
export default function ProductCard() { ... }
// Consume it:
import ProductCard from '@/components/ProductCard';
```

Angular 14+ standalone components remove the NgModule requirement — that's Angular moving closer to how React has always worked.

---

## Testing

| Angular (TestBed) | React (Vitest + RTL) |
|---|---|
| `TestBed.configureTestingModule({ declarations, imports, providers })` | `renderWithStore(<Component />)` |
| `fixture.detectChanges()` | Not needed — RTL re-renders automatically |
| `fixture.nativeElement.querySelector(...)` | `screen.getByRole(...)`, `screen.getByText(...)` |
| `fixture.debugElement.query(By.css(...))` | Avoid — query by role/label instead |
| `spyOn(service, 'method')` | `vi.spyOn(module, 'export')` |
| `fakeAsync` + `tick()` | `await userEvent.click(...)` + `await screen.findBy...()` |
| `provideMockStore({ initialState })` | `renderWithStore(<C />, { preloadedState })` |

**Key philosophy difference:** Angular's TestBed tests components through the Angular framework. React Testing Library tests components through the DOM — by role, label, and text — the way a user or screen reader would. RTL tests survive refactors that TestBed tests often do not.

---

## Server-side rendering

| Angular Universal | Next.js App Router |
|---|---|
| `TransferState` to avoid double-fetch | Deduplication is automatic (React `cache()`) |
| `isPlatformBrowser()` to guard browser APIs | `'use client'` + `ssr: false` in `next/dynamic` |
| `APP_INITIALIZER` for pre-boot tasks | Root layout Server Component |
| `renderModule()` / `renderApplication()` | Built into Next.js — no configuration |
| Route-level SSR vs prerender config | `generateStaticParams` (SSG) vs default (SSR) |

Next.js integrates SSR, SSG, and streaming out of the box. Angular Universal requires additional setup and a Node.js Express (or similar) server; Next.js is the server.

---

## Summary — what carries over directly

You do not need to unlearn these. They work the same or nearly the same:

- **TypeScript** — same language, same generics, same utility types
- **Redux pattern** — reducers, actions, selectors, immutability (NgRx → RTK is mostly renaming)
- **Component composition** — building UIs by nesting components
- **Unidirectional data flow** — props down, events up (same as Angular with `OnPush`)
- **Reactive mindset** — derived state from a single source of truth
- **Zod schemas** — same library is used in Angular projects too
- **CSS architecture** — CSS Modules ≈ Angular's default `ViewEncapsulation.Emulated`

## What requires genuine unlearning

- **Two-way binding** — React has no `[(ngModel)]`. All state updates are explicit (`setState`, `dispatch`).
- **Dependency injection** — there is no injector. Wire dependencies yourself via imports and hooks.
- **Templates** — JSX is not HTML. Logic goes inside `{}`, not in attribute directives.
- **Zones / automatic change detection** — React only re-renders when you tell it to (via state updates).
- **NgModules** — they do not exist. Import directly.
- **Lifecycle methods** — `useEffect` replaces all of them, but the mental model is different (synchronisation, not lifecycle stages).
