'use client';

// Client Component: it reads the cart from the Redux store and drives the
// form with useActionState. The mutation itself (placeOrder) still executes
// on the server — this component only invokes it.

import { useActionState, useEffect } from 'react';
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
    <form action={formAction} className={styles.form}>
      {/* The store lives in the browser; the action runs on the server.
          Cart contents cross that gap as form data — ids and quantities
          only, never prices. */}
      <input type="hidden" name="items" value={JSON.stringify(items)} />

      <label className={styles.field}>
        Name
        <input name="name" autoComplete="name" />
      </label>
      <label className={styles.field}>
        Email
        <input name="email" type="email" autoComplete="email" />
      </label>

      <p className={styles.total}>
        <span>Total ({items.length === 0 ? 'cart empty' : 'from cart'})</span>
        <span>{formatPrice(totalCents)}</span>
      </p>

      {state.status === 'error' && (
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
