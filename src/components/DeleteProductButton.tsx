'use client';

// Client Component: a mutation with NO form — just a button, a confirm step,
// and the same RTK Query mutation pattern as the edit form. Forms are for
// collecting data; a delete has none to collect, so nothing here touches
// FormData, useActionState, or React Hook Form.
//
// The confirm step is local component state (a two-state machine), not
// window.confirm: a blocking native dialog can't be styled, is invisible to
// tests, and freezes the tab. Rendering the question keeps it accessible
// and testable. Pending state comes from the mutation hook's isLoading —
// completing the trio: useActionState gave isPending, RHF gave isSubmitting,
// a mutation hook gives isLoading. (useTransition is the bare-metal way to
// get the same flag when calling an action with none of these wrappers.)

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch } from '@/lib/redux/hooks';
import { itemRemoved } from '@/lib/redux/features/cartSlice';
import { useDeleteProductMutation } from '@/lib/redux/api';
import styles from './DeleteProductButton.module.css';

export default function DeleteProductButton({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [confirming, setConfirming] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [deleteProduct, { isLoading }] = useDeleteProductMutation();

  const onConfirmDelete = async () => {
    setFailure(null);
    try {
      const result = await deleteProduct(productId).unwrap();
      if (result.status === 'error') {
        setFailure(result.message);
        return;
      }
      // The tag invalidation refetches the product lists, but the cart slice
      // is plain client state — nothing refetches it. Evicting the deleted
      // product's line is this component's job, before navigating away.
      dispatch(itemRemoved(productId));
      router.push('/products');
    } catch {
      // Transport failure — the action itself was unreachable.
      setFailure('Something went wrong deleting the product. Try again.');
    }
  };

  return (
    <section className={styles.zone} aria-label="Danger zone">
      {confirming ? (
        <>
          <p className={styles.warning}>
            Delete <strong>{productName}</strong>? This can&apos;t be undone.
          </p>
          <div className={styles.confirmRow}>
            <button
              type="button"
              className={styles.confirmDelete}
              disabled={isLoading}
              onClick={onConfirmDelete}
            >
              {isLoading ? 'Deleting…' : 'Yes, delete'}
            </button>
            <button
              type="button"
              className={styles.cancel}
              disabled={isLoading}
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          className={styles.delete}
          onClick={() => {
            setFailure(null);
            setConfirming(true);
          }}
        >
          Delete product…
        </button>
      )}
      {failure && (
        <p role="alert" className={styles.error}>
          {failure}
        </p>
      )}
    </section>
  );
}
