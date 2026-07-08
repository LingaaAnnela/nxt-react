---
title: Forms — Server Actions vs React Hook Form
description: When to use Server Actions with useActionState versus React Hook Form with zod, and how they compare.
order: 3
---

# Forms — Server Actions vs React Hook Form

React has no built-in form management library. Two patterns dominate, and this app uses both deliberately so you can compare them on the same domain (product CRUD).

## Pattern 1 — Server Actions + useActionState

A **Server Action** is an `async` function marked `'use server'`. Next.js exposes it as a callable function from the client, but it always executes on the server. You wire it to a form's `action` attribute.

```tsx
// actions.ts
'use server';
export async function addProduct(prevState: State, formData: FormData): Promise<State> {
  const raw = Object.fromEntries(formData);
  const result = productSchema.safeParse(raw);
  if (!result.success) {
    return { status: 'error', errors: z.flattenError(result.error).fieldErrors };
  }
  await db.addProduct(result.data);
  revalidatePath('/products');
  redirect('/admin/products');
}
```

```tsx
// page.tsx — 'use client' only because of useActionState
'use client';
export default function NewProductForm() {
  const [state, formAction, isPending] = useActionState(addProduct, { status: 'idle' });

  return (
    <form action={formAction}>
      <input name="name" defaultValue={state.fields?.name} />
      {state.errors?.name && <span>{state.errors.name}</span>}
      <button disabled={isPending}>Save</button>
    </form>
  );
}
```

**`useActionState`** takes the Server Action and an initial state. On each submit it calls the action with `(previousState, formData)` and re-renders with the returned state. `isPending` is `true` while the round-trip is in flight.

**Progressive enhancement:** the form works without JavaScript — the `action` attribute on `<form>` is a native HTML feature. The browser POSTs the form data to the action, which runs and redirects. `useActionState` is an enhancement that adds the pending state and inline errors.

**When to use this pattern:**
- Forms that should work without JS (login, signup, simple CRUD)
- Server redirect on success (`redirect()` after a successful mutation)
- Simple validation that maps cleanly to field errors

## Pattern 2 — React Hook Form + zod

**React Hook Form (RHF)** is a client-side form library that tracks field state with refs (not controlled inputs), minimising re-renders. It integrates with zod via `@hookform/resolvers`.

```tsx
'use client'; // Required — RHF is entirely client-side
export default function EditProductForm({ product }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
    setError,
  } = useForm<ProductFormInput, unknown, ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product.name,
      priceCents: formatCentsAsDollars(product.priceCents),
    },
  });

  async function onSubmit(data: ProductFormValues) {
    const result = await updateProductAction({ id: product.id, ...data });
    if (result.status === 'error') {
      setError('root.server', { message: result.message });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name')} />
      {errors.name && <span>{errors.name.message}</span>}
      <button disabled={!isDirty || isSubmitting}>Save</button>
    </form>
  );
}
```

**Key RHF concepts:**

- `register('name')` — returns `{ name, ref, onChange, onBlur }` spread onto the input. RHF tracks the value via a ref, not state — so typing doesn't trigger re-renders.
- `handleSubmit(fn)` — runs validation before calling `fn` with the typed, parsed values.
- `defaultValues` — seeds the field values AND sets the baseline for `isDirty`. An input matches its `defaultValue` → `isDirty` is false → Save button disabled.
- `setError('root.server', ...)` — maps a server-returned error back to a form-level banner.

**`useForm` generics:** `useForm<Input, Context, Output>` where `Input` is the raw field types (price as string from the form) and `Output` is the parsed types (price as number in cents after zod's transform). The distinction matters: `handleSubmit` receives `Output`, not `Input`.

**When to use this pattern:**
- Per-field live validation as the user types
- `isDirty` gates (disable Save until something changes)
- Complex field interdependencies
- Forms where you want to map server errors back to specific fields via `setError`

**Trade-off:** RHF does NOT progressively enhance. The form requires JavaScript. `defaultValues` fill on client mount, not in the SSR HTML.

## The shared zod schema

Both patterns in this app reuse the same zod schema from `src/lib/shop/productSchema.ts`:

```ts
export const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  priceCents: z.string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid price')
    .transform(s => Math.round(parseFloat(s) * 100)), // string → integer cents
  category: z.string().min(1),
  description: z.string().min(1),
});

export type ProductFormInput = z.input<typeof productSchema>;  // price is string
export type ProductFormValues = z.output<typeof productSchema>; // price is number
```

**Why the same schema in both places?**

The schema is the contract. The client runs it to produce typed output (RHF's `handleSubmit`) and to predict the optimistic value. The server re-parses as the authoritative pass — client-transformed data is never trusted. Even if someone bypasses the form and POSTs raw data, the Server Action's schema rejects it.

`z.input` vs `z.output` is the key: the form fields hold strings (input); the server action receives and stores integers (output). The transform in the schema bridges them.

## Comparison

| | Server Actions + useActionState | React Hook Form + zod |
|---|---|---|
| JS required | No (progressive enhancement) | Yes |
| Validation | Server-side (one round-trip) | Client-side (instant) |
| Per-field live errors | No | Yes |
| isDirty / isSubmitting | No (hand-roll if needed) | Built-in |
| Server errors → field | Via returned state | Via `setError` |
| Redirect on success | `redirect()` in action | `router.push()` on client |
| Best for | Simple CRUD, login, signup | Rich forms with UX requirements |
