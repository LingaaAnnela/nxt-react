---
title: Angular Services → React Equivalents
description: How the single Angular service construct maps to custom hooks, plain functions, RTK Query, and Server Actions in React.
order: 13
---

# Angular Services → React Equivalents

Angular's `@Injectable` class is a single construct that handles everything: HTTP calls, shared state, utility logic, lifecycle management. React has no DI container and no equivalent class — instead it distributes these responsibilities across several patterns, each with the right scope for the concern.

## The mapping

| Angular service use case | React / Next.js equivalent |
|---|---|
| Shared stateful logic | Custom hook (`useXxx`) |
| Shared pure / stateless logic | Plain module function |
| Singleton app-wide state | Redux (RTK) or Context API |
| HTTP / API calls | RTK Query endpoints |
| Server-side business logic | Server Actions or plain async functions |
| Route guards | Middleware (`proxy.ts`) + DAL (`verifySession`) |

## Custom hooks — stateful services

A custom hook is any function that starts with `use` and calls other hooks internally. It encapsulates stateful logic that multiple components need. Call it at the top of a component — just like `inject(MyService)`.

```ts
// Angular:
constructor(private productService: ProductService) {}
ngOnInit() { this.products$ = this.productService.getAll(); }

// React — RTK Query generated hook:
const { data: products, isLoading } = useGetProductsQuery();
```

Hooks used in Brew Gear and their Angular analogues:

| Hook | Angular equivalent |
|---|---|
| `useAppSelector(...)` | `inject(Store).select(selector)` |
| `useAppDispatch()` | `inject(Store).dispatch` |
| `useToast()` | `inject(ToastService)` |
| `useRouter()` | `inject(Router)` |
| `useSearchParams()` | `inject(ActivatedRoute).queryParams` |
| `useForm(...)` | `inject(FormBuilder).group(...)` |
| `useGetProductsQuery()` | `inject(ProductService).getAll()` |
| `useUpdateProductMutation()` | `inject(ProductService).update(id, data)` |

**Key difference:** a hook is **not a singleton**. Each component calling `useToast()` gets the context value from the nearest `ToastProvider`, but the hook call itself is scoped to that component instance. The singleton part is the Provider (Context) or store (Redux) — not the hook.

## Plain module functions — stateless services

Any logic that doesn't need React hooks is just a plain exported function. No class, no `@Injectable`, no `providedIn`. Import it directly where needed.

```ts
// src/lib/shop/format.ts
export function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency', currency: 'USD',
  });
}
// ≈ CurrencyService.format() — but no DI, just import and call
```

```ts
// src/lib/shop/mock-products.ts
export function addProduct(data: ProductInput): Product { ... }
export function updateProduct(id: string, changes): Product | undefined { ... }
export function removeProduct(id: string): boolean { ... }
// ≈ ProductService CRUD methods — but plain functions
```

```ts
// src/lib/auth/session.ts
export const verifySession = cache(async (): Promise<boolean> => { ... });
// ≈ AuthService.verifyToken() — but a plain async function with React cache()
```

These functions are trivially tree-shakeable and testable without a TestBed or `TestBed.inject`. They're also easier to reason about — no DI resolution, no injection context to manage.

## RTK Query — HttpClient-based services

`src/lib/redux/api.ts` is the closest equivalent to an Angular service that injects `HttpClient`. `createApi` defines all the endpoints; the generated hooks are what components consume.

```ts
// Angular:
@Injectable({ providedIn: 'root' })
export class ProductService {
  constructor(private http: HttpClient) {}
  getAll(): Observable<Product[]> { return this.http.get<Product[]>('/api/products'); }
  update(id: string, data: Partial<Product>): Observable<Product> { ... }
}

// React — RTK Query:
export const api = createApi({
  endpoints: (build) => ({
    getProducts: build.query<Product[], void>({
      query: () => 'api/products',
      providesTags: ['Product'],
    }),
    updateProduct: build.mutation<Product, UpdateArgs>({
      queryFn: async (args) => { ... },
      invalidatesTags: ['Product'],
    }),
  }),
});
// Generated hooks: useGetProductsQuery(), useUpdateProductMutation()
```

RTK Query adds what Angular's HttpClient doesn't give you for free: automatic caching, deduplication, background refetching, loading/error state, and cache tag invalidation.

## Server Actions — server-side services

Server Actions replace backend services that Angular components called via HttpClient. They run on the server, can read databases, mutate files, and interact with `cookies()` and `headers()` — but they're called from the client like regular async functions.

```ts
// Angular (calls an API which calls a service):
this.productService.update(id, data).subscribe(result => ...);

// React (calls the Server Action directly):
const result = await updateProductAction({ id, ...data });
```

```ts
// src/app/admin/products/actions.ts
'use server';
export async function updateProductAction(data: UpdateArgs) {
  await verifySession(); // auth guard — ≈ a route guard in the action
  const product = updateProduct(data.id, data);
  revalidatePath('/products');
  return { status: 'success', product };
}
```

The `'use server'` directive is the equivalent of `@Injectable` on a server-only class — it marks the boundary between client and server code.

## When to write a hook vs a plain function

**Write a plain function** when the logic is pure and stateless: same input, same output, no hooks inside. `formatPrice`, `filterProducts`, `verifySession`, `productSchema.parse` — none of these call any hook.

**Write a custom hook** when the logic needs React hooks internally — `useState`, `useEffect`, `useContext`, `useReducer`, or any other hook. The `use` prefix is not a style choice; it's required for React's rules-of-hooks linter to work correctly.

```ts
// Plain function — no hook needed:
function formatPrice(cents: number): string { ... }

// Custom hook — wraps useContext:
function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('...');
  return ctx;
}
```

Naming a plain function `useXxx` when it doesn't call any hook is misleading — it triggers hooks lint rules unnecessarily and implies a contract (only callable from components/hooks) that isn't enforced.
