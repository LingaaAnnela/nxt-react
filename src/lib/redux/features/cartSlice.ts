import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { CartItem } from "@/lib/shop/types";

export interface CartState {
  items: CartItem[];
}

const initialState: CartState = {
  items: [],
};

// createSlice ≈ createActionGroup + createReducer + createFeatureSelector in
// one. The reducer bodies "mutate" state, but Immer records those mutations
// and produces an immutable update — no hand-written spreads like in NgRx.
const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    // Past-tense event name, per the Redux style guide — same hygiene as
    // NgRx's "events, not commands" ("[Product Page] Item Added").
    itemAdded: (state, action: PayloadAction<string>) => {
      const existing = state.items.find(
        (item) => item.productId === action.payload,
      );
      if (existing) {
        existing.quantity += 1;
      } else {
        state.items.push({ productId: action.payload, quantity: 1 });
      }
    },
    cartCleared: (state) => {
      state.items = [];
    },
  },
  // Slice-level selectors (RTK 2.x) ≈ createSelector on a feature state;
  // they're automatically scoped to where the slice is mounted (state.cart).
  selectors: {
    selectCartItems: (state) => state.items,
    selectCartCount: (state) =>
      state.items.reduce((total, item) => total + item.quantity, 0),
  },
});

export const { itemAdded, cartCleared } = cartSlice.actions;
export const { selectCartItems, selectCartCount } = cartSlice.selectors;
export default cartSlice.reducer;
