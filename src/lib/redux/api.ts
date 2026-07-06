import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { Product } from "@/lib/shop/types";

// The app's single RTK Query api slice. Closest NgRx analogy: @ngrx/effects +
// @ngrx/entity rolled into one — createApi generates the actions, reducer,
// request lifecycle, and normalized cache you'd hand-write as an effect plus
// entity adapter per endpoint. Convention is ONE createApi per app; features
// add endpoints here (≈ registering feature effects) rather than creating
// parallel api slices.
export const api = createApi({
  reducerPath: "api",
  // Relative baseUrl: shop endpoints hit this app's own route handlers under
  // /api/* (added in Phase 2).
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  // Cache tags drive invalidation (≈ deciding which entity collections an
  // effect should refresh after a mutation).
  tagTypes: ["Product"],
  endpoints: (builder) => ({
    // Client-side product fetch (used by the cart drawer). This one endpoint
    // definition generates what you'd hand-write in NgRx as an effect, an
    // entity cache, and loading-state selectors. Relative URL → resolved
    // against baseUrl, so it hits our own /api/products route handler.
    getProducts: builder.query<Product[], void>({
      query: () => "/products",
      providesTags: ["Product"],
    }),
  }),
});

export const { useGetProductsQuery } = api;
