/* eslint-disable react-hooks/refs */
'use client';

// Client Component: react-redux's <Provider> is React context, which only
// exists in the client tree, and the store must live for the browser session
// (≈ providing StoreModule at the root injector). This file IS the client
// boundary — but only for the provider itself: Server Components passed in
// through {children} stay server-rendered.

import { useEffect, useRef } from 'react';
import { Provider } from 'react-redux';
import { setupListeners } from '@reduxjs/toolkit/query';
import { makeStore, type AppStore } from './store';
import { cartHydrated, selectCartItems } from './features/cartSlice';
import { loadCartItems, saveCartItems } from './cartPersistence';

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = makeStore();
    setupListeners(storeRef.current.dispatch);
  }

  // localStorage only exists in the browser, and hydration requires the
  // first client render to match the server HTML (empty cart) — so restoring
  // happens in an effect, after hydration, as a dispatched action. Loading
  // it into makeStore() as preloadedState would be the classic hydration-
  // mismatch bug. ≈ an NgRx meta-reducer rehydrating state, except effects
  // give us the "after first paint" timing for free.
  useEffect(() => {
    const store = storeRef.current!;

    const saved = loadCartItems();
    if (saved) {
      store.dispatch(cartHydrated(saved));
    }

    // store.subscribe fires after every action — the primitive under NgRx
    // meta-reducers/effects. Immer only creates a new items array when a
    // reducer actually changed it, so a reference check is a free dirty
    // flag (same mechanism NgRx selector memoization relies on).
    let prevItems = selectCartItems(store.getState());
    return store.subscribe(() => {
      const items = selectCartItems(store.getState());
      if (items !== prevItems) {
        prevItems = items;
        saveCartItems(items);
      }
    });
  }, []);

  return <Provider store={storeRef.current}>{children}</Provider>;
}
