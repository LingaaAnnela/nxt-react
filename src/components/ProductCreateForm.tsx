'use client';

// Client Component: useActionState is a hook, and hooks need the client
// runtime. Everything else about this form is deliberately server-leaning —
// uncontrolled inputs, native <form action>, validation on the server. This
// is the "plain Server Action" half of the create/edit exercise; the edit
// form will layer React Hook Form on top for comparison.

import { useActionState, useEffect, useRef } from 'react';
import {
  createProduct,
  type CreateProductState,
} from '@/app/admin/products/actions';
import { PRODUCT_CATEGORIES } from '@/lib/shop/productSchema';
// Shared with ProductEditForm — a CSS module is just a file; importing the
// same one from two components shares the classes.
import styles from './productForm.module.css';

const initialState: CreateProductState = { status: 'idle' };

export default function ProductCreateForm() {
  const [state, formAction, isPending] = useActionState(
    createProduct,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Same focus-first-invalid pattern as CheckoutForm: aria-invalid is the
  // single source of truth for "invalid", document order = first field.
  useEffect(() => {
    if (state.status !== 'error' || !state.errors) return;
    formRef.current
      ?.querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus();
  }, [state]);

  // No success branch here: on success the action redirects to /products,
  // so this component never re-renders with a success state.

  // Zod reports string[] per field (a field can fail several checks);
  // showing the first is enough for the UI.
  const errors = {
    name: state.errors?.name?.[0],
    description: state.errors?.description?.[0],
    price: state.errors?.price?.[0],
    category: state.errors?.category?.[0],
  };

  return (
    <form ref={formRef} action={formAction} className={styles.form}>
      {/* Uncontrolled inputs + defaultValue echo, exactly as in CheckoutForm:
          React 19 resets the form after every action, and each control falls
          back to its current defaultValue — which the action refreshed with
          what the user typed. */}
      <label className={styles.field}>
        Name
        <input
          name="name"
          defaultValue={state.fields?.name}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {errors.name && (
          <span id="name-error" className={styles.fieldError}>
            {errors.name}
          </span>
        )}
      </label>

      <label className={styles.field}>
        Price (USD)
        {/* type="text" + inputMode="decimal", not type="number": number
            inputs fight money entry (scroll-wheel changes, locale commas,
            silent clamping). The server parses the string with the schema —
            client attributes are UX, never validation. */}
        <input
          name="price"
          inputMode="decimal"
          placeholder="24.50"
          defaultValue={state.fields?.price}
          aria-invalid={errors.price ? true : undefined}
          aria-describedby={errors.price ? 'price-error' : undefined}
        />
        {errors.price && (
          <span id="price-error" className={styles.fieldError}>
            {errors.price}
          </span>
        )}
      </label>

      <label className={styles.field}>
        Category
        {/* Options come from the schema's enum — the <select> can't drift
            from what the server accepts. defaultValue on <select> is React's
            replacement for putting `selected` on an <option>. */}
        <select
          name="category"
          defaultValue={state.fields?.category ?? ''}
          aria-invalid={errors.category ? true : undefined}
          aria-describedby={errors.category ? 'category-error' : undefined}
        >
          <option value="" disabled>
            Choose a category…
          </option>
          {PRODUCT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        {errors.category && (
          <span id="category-error" className={styles.fieldError}>
            {errors.category}
          </span>
        )}
      </label>

      <label className={styles.field}>
        Description
        {/* React textareas take their content via defaultValue/value, not
            children — unlike plain HTML. */}
        <textarea
          name="description"
          rows={3}
          defaultValue={state.fields?.description}
          aria-invalid={errors.description ? true : undefined}
          aria-describedby={
            errors.description ? 'description-error' : undefined
          }
        />
        {errors.description && (
          <span id="description-error" className={styles.fieldError}>
            {errors.description}
          </span>
        )}
      </label>

      {/* Form-level errors (auth) — field errors render at their inputs. */}
      {state.status === 'error' && state.message && (
        <p role="alert" className={styles.error}>
          {state.message}
        </p>
      )}

      <button type="submit" disabled={isPending} className={styles.submit}>
        {isPending ? 'Creating…' : 'Create product'}
      </button>
    </form>
  );
}
