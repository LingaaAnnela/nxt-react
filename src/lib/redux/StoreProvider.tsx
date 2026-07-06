/* eslint-disable react-hooks/refs */
'use client';

// Client Component: react-redux's <Provider> is React context, which only
// exists in the client tree, and the store must live for the browser session
// (≈ providing StoreModule at the root injector). This file IS the client
// boundary — but only for the provider itself: Server Components passed in
// through {children} stay server-rendered.

import { useRef } from 'react';
import { Provider } from 'react-redux';
import { setupListeners } from '@reduxjs/toolkit/query';
import { makeStore, type AppStore } from './store';

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = makeStore();
    setupListeners(storeRef.current.dispatch);
  }

  return <Provider store={storeRef.current}>{children}</Provider>;
}
