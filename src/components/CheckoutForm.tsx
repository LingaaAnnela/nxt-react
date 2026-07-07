'use client';

// Client Component: it reads the cart from the Redux store and drives the
// form with useActionState. The mutation itself (placeOrder) still executes
// on the server — this component only invokes it.

import { useActionState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import {
  selectCartItems,
  cartCleared,
} from '@/lib/redux/features/cartSlice';
import { useGetProductsQuery } from '@/lib/redux/api';
import { placeOrder, type CheckoutState } from '@/app/checkout/actions';
import { formatPrice } from '@/lib/shop/format';
import styles from './CheckoutForm.module.css';

const initialState: CheckoutState = { status: 'idle' };

export default function CheckoutForm() {
  const dispatch = useAppDispatch();
  const items = useAppSelector(selectCartItems);
  const { data: products } = useGetProductsQuery();
  // useActionState ≈ a reducer over form submissions: every submit calls the
  // Server Action with (previousState, formData) and re-renders with the
  // returned state. isPending replaces a hand-rolled loading flag.
  const [state, formAction, isPending] = useActionState(
    placeOrder,
    initialState,
  );
  // Ref to a DOM node ≈ @ViewChild + ElementRef.nativeElement.
  const formRef = useRef<HTMLFormElement>(null);

  // Focus is an imperative DOM action, not renderable state — so it's done
  // in an effect, after React commits (form reset, defaultValue repopulation
  // and aria-invalid attributes are all in the DOM by then). aria-invalid is
  // already the single source of truth for "invalid", so querying it beats
  // keeping a ref per field; document order = first invalid field.
  // Depending on `state` (a fresh object per submit) re-runs this even when
  // two submits fail with identical errors — identity, not value.
  useEffect(() => {
    if (state.status !== 'error' || !state.errors) return;
    formRef.current
      ?.querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus();
  }, [state]);

  // Reacting to a server result by updating client state is effect work —
  // like a subscription in a component, not an NgRx effect (those live at
  // the store level; this one is local to the form).
  useEffect(() => {
    if (state.status === 'success') {
      dispatch(cartCleared());
    }
  }, [state.status, dispatch]);

  if (state.status === 'success') {
    return (
      <section className={styles.success}>
        <h2>Thank you!</h2>
        <p>{state.message}</p>
        <p>
          Order reference: <strong>{state.orderId}</strong>
        </p>
      </section>
    );
  }

  const totalCents = items.reduce((sum, item) => {
    const product = products?.find((p) => p.id === item.productId);
    return sum + (product ? product.priceCents * item.quantity : 0);
  }, 0);

  return (
    <form ref={formRef} action={formAction} className={styles.form}>
      {/* The store lives in the browser; the action runs on the server.
          Cart contents cross that gap as form data — ids and quantities
          only, never prices. */}
      <input type="hidden" name="items" value={JSON.stringify(items)} />

      {/* Uncontrolled inputs: React 19 resets the form after every action
          (matching native POST behavior, for progressive enhancement). On a
          reset each input falls back to its *current* defaultValue — so
          echoing the entered values through the action state repopulates a
          failed submit without converting to controlled inputs. */}
      {/* aria-invalid + aria-describedby tie each error to its input so
          assistive tech announces it on focus — without them the message is
          visible but unreachable. ≈ rendering FormControl.errors, except the
          errors arrive in the action state from the server. */}
      <label className={styles.field}>
        Name
        <input
          name="name"
          autoComplete="name"
          defaultValue={state.fields?.name}
          aria-invalid={state.errors?.name ? true : undefined}
          aria-describedby={state.errors?.name ? 'name-error' : undefined}
        />
        {state.errors?.name && (
          <span id="name-error" className={styles.fieldError}>
            {state.errors.name}
          </span>
        )}
      </label>
      <label className={styles.field}>
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={state.fields?.email}
          aria-invalid={state.errors?.email ? true : undefined}
          aria-describedby={state.errors?.email ? 'email-error' : undefined}
        />
        {state.errors?.email && (
          <span id="email-error" className={styles.fieldError}>
            {state.errors.email}
          </span>
        )}
      </label>

      <p className={styles.total}>
        <span>Total ({items.length === 0 ? 'cart empty' : 'from cart'})</span>
        <span>{formatPrice(totalCents)}</span>
      </p>

      {/* Form-level errors only — field errors render at their inputs. */}
      {state.status === 'error' && state.message && (
        <p role="alert" className={styles.error}>
          {state.message}
        </p>
      )}

      <button type="submit" disabled={isPending} className={styles.submit}>
        {isPending ? 'Placing order…' : `Pay ${formatPrice(totalCents)}`}
      </button>

      <p className={styles.hint}>
        Tip: an email starting with &quot;decline&quot; simulates a failed
        payment.
      </p>
    </form>
  );
}
