import { configureStore } from "@reduxjs/toolkit";
import { api } from "./api";
import cartReducer from "./features/cartSlice";
import uiReducer from "./features/uiSlice";

// configureStore ≈ StoreModule.forRoot(): registers reducers and middleware.
// It's exported as a FACTORY, not a singleton, because during SSR each request
// must build its own store — a module-level store instance would leak one
// user's state into another's render.
export const makeStore = () =>
  configureStore({
    reducer: {
      cart: cartReducer,
      ui: uiReducer,
      [api.reducerPath]: api.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(api.middleware),
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
