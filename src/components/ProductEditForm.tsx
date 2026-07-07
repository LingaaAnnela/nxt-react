'use client';

// Client Component: React Hook Form is hooks all the way down. This is the
// second half of the forms exercise — same domain as ProductCreateForm, but
// the library owns field registration, dirty tracking and client-side
// validation, and the Server Action is reached through an RTK Query mutation
// instead of <form action>. The trade: instant per-field feedback, isDirty,
// and automatic cache invalidation for free, in exchange for progressive
// enhancement (this form needs JS; the create form works before hydration).

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUpdateProductMutation } from '@/lib/redux/api';
import {
  productFormSchema,
  PRODUCT_CATEGORIES,
  type ProductFormInput,
  type ProductFormValues,
} from '@/lib/shop/productSchema';
import type { Product } from '@/lib/shop/types';
import styles from './productForm.module.css';

export default function ProductEditForm({ product }: { product: Product }) {
  const router = useRouter();
  // The Server Action now reaches the server THROUGH RTK Query: the mutation
  // wraps it, so a successful save invalidates the "Product" tag and every
  // subscribed getProducts query (cart drawer, checkout) refetches on its
  // own. The form no longer knows the cache exists — that's the point.
  const [saveProduct] = useUpdateProductMutation();
  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProductFormInput, unknown, ProductFormValues>({
    // The resolver plugs the SAME zod schema from the Server Action into
    // RHF's validation slot — the generics say: fields hold z.input (price
    // as string), a valid submit produces z.output (price in cents).
    // ≈ FormBuilder.group(...) with Validators, but schema-derived.
    resolver: zodResolver(productFormSchema),
    // Validate on first blur, then on every change — the usual UX middle
    // ground. The default (onSubmit only) would feel like a downgrade next
    // to Angular's live FormControl validity.
    mode: 'onTouched',
    // defaultValues seed the form AND the dirty-tracking baseline — isDirty
    // compares against these. ≈ pristine/dirty on a FormGroup.
    defaultValues: {
      name: product.name,
      description: product.description,
      // Domain (integer cents) → display string. toFixed also hides any
      // float noise from the division.
      price: (product.priceCents / 100).toFixed(2),
      // Product.category is a plain string; the schema is stricter (enum).
      // The cast is safe for data that came through the schema, and honest
      // about seed data: an off-enum value would fail validation on save.
      category: product.category as ProductFormInput['category'],
    },
  });

  const onSubmit = handleSubmit(async () => {
    try {
      // handleSubmit only reaches here after the schema passed client-side.
      // We send getValues() — the raw field strings (z.input) — because the
      // server re-runs the same schema as the authoritative parse, transform
      // included. unwrap() collapses the mutation result to plain
      // data-or-throw (≈ firstValueFrom on the effect's response).
      const result = await saveProduct({
        id: product.id,
        input: getValues(),
      }).unwrap();

      if (result.status === 'success') {
        // Navigation moved from the action (redirect) to the client: the
        // tag invalidation dispatched by the mutation had to happen on this
        // side of the wire, and it must precede leaving the page.
        router.push(`/products/${product.id}`);
        return;
      }

      // Server-rejected submit: feed the errors into RHF's own error state,
      // so they render exactly like client errors. ≈ setErrors on a
      // FormGroup from a failed API response.
      for (const [field, messages] of Object.entries(result.errors ?? {})) {
        setError(field as keyof ProductFormInput, {
          type: 'server',
          message: messages[0],
        });
      }
      if (result.message) {
        setError('root.server', { type: 'server', message: result.message });
      }
    } catch {
      // unwrap() throws only for transport-level failures (network down,
      // server unreachable) — validation errors came back as data above.
      setError('root.server', {
        type: 'server',
        message: 'Something went wrong saving the product. Try again.',
      });
    }
  });

  return (
    // No action prop: RHF owns submission. onSubmit wraps preventDefault.
    <form onSubmit={onSubmit} className={styles.form} noValidate>
      {/* register('name') returns { name, ref, onChange, onBlur } — spreading
          it wires the input as UNCONTROLLED (RHF tracks values via the ref,
          no re-render per keystroke). ≈ formControlName="name". */}
      <label className={styles.field}>
        Name
        <input
          {...register('name')}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {errors.name && (
          <span id="name-error" className={styles.fieldError}>
            {errors.name.message}
          </span>
        )}
      </label>

      <label className={styles.field}>
        Price (USD)
        <input
          {...register('price')}
          inputMode="decimal"
          aria-invalid={errors.price ? true : undefined}
          aria-describedby={errors.price ? 'price-error' : undefined}
        />
        {errors.price && (
          <span id="price-error" className={styles.fieldError}>
            {errors.price.message}
          </span>
        )}
      </label>

      <label className={styles.field}>
        Category
        <select
          {...register('category')}
          aria-invalid={errors.category ? true : undefined}
          aria-describedby={errors.category ? 'category-error' : undefined}
        >
          {PRODUCT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        {errors.category && (
          <span id="category-error" className={styles.fieldError}>
            {errors.category.message}
          </span>
        )}
      </label>

      <label className={styles.field}>
        Description
        <textarea
          {...register('description')}
          rows={3}
          aria-invalid={errors.description ? true : undefined}
          aria-describedby={
            errors.description ? 'description-error' : undefined
          }
        />
        {errors.description && (
          <span id="description-error" className={styles.fieldError}>
            {errors.description.message}
          </span>
        )}
      </label>

      {errors.root?.server && (
        <p role="alert" className={styles.error}>
          {errors.root.server.message}
        </p>
      )}

      {/* isDirty gates the save — nothing changed, nothing to submit. */}
      <button
        type="submit"
        disabled={!isDirty || isSubmitting}
        className={styles.submit}
      >
        {isSubmitting ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}
