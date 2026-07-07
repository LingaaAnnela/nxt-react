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
    // Removes the whole line, whatever its quantity. filter() returns a new
    // array; assigning it to the draft is the idiomatic Immer delete (as
    // opposed to splice-by-index, which also works but reads worse).
    itemRemoved: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(
        (item) => item.productId !== action.payload,
      );
    },
    cartCleared: (state) => {
      state.items = [];
    },
    // Restore from localStorage after hydration — replaces wholesale.
    // The reducer trusts its payload; validating the untrusted JSON is the
    // reader's job (cartPersistence.ts), keeping the reducer pure and dumb.
    cartHydrated: (state, action: PayloadAction<CartItem[]>) => {
      state.items = action.payload;
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

export const { itemAdded, itemRemoved, cartCleared, cartHydrated } =
  cartSlice.actions;
export const { selectCartItems, selectCartCount } = cartSlice.selectors;
export default cartSlice.reducer;
