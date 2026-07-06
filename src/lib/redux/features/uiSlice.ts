import { createSlice } from "@reduxjs/toolkit";

export interface UiState {
  cartDrawerOpen: boolean;
}

const initialState: UiState = {
  cartDrawerOpen: false,
};

// Pure UI state, deliberately separate from domain state (cart items).
// It earns a place in Redux — instead of component-local useState — because
// unrelated components coordinate on it: the header button opens the drawer,
// the drawer closes itself. ≈ a small NgRx UI feature state; useState would
// be the equivalent of a private component field.
const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    cartDrawerToggled: (state) => {
      state.cartDrawerOpen = !state.cartDrawerOpen;
    },
    cartDrawerClosed: (state) => {
      state.cartDrawerOpen = false;
    },
  },
  selectors: {
    selectCartDrawerOpen: (state) => state.cartDrawerOpen,
  },
});

export const { cartDrawerToggled, cartDrawerClosed } = uiSlice.actions;
export const { selectCartDrawerOpen } = uiSlice.selectors;
export default uiSlice.reducer;
