'use client';

// Client Component: dispatches to the store on click and selects the current
// quantity. Kept as a tiny leaf ("client island") so the product detail page
// stays a Server Component — the boundary wraps the button, not the page.

import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { itemAdded, selectCartItems } from '@/lib/redux/features/cartSlice';

// Props crossing the server→client boundary ≈ @Input(), with one hard rule:
// they must be serializable (no functions, no class instances).
export default function AddToCartButton({ productId }: { productId: string }) {
  const dispatch = useAppDispatch();
  // Parameterized selection — the inline arrow closes over productId,
  // ≈ a factory selector (createSelector with props) in NgRx.
  const quantity = useAppSelector(
    (state) =>
      selectCartItems(state).find((item) => item.productId === productId)
        ?.quantity ?? 0,
  );

  return (
    <p>
      <button type="button" onClick={() => dispatch(itemAdded(productId))}>
        Add to cart
      </button>
      {quantity > 0 && <span> In cart: {quantity}</span>}
    </p>
  );
}
