import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import {
  deleteProduct as deleteProductAction,
  updateProduct as updateProductAction,
  type DeleteProductState,
  type UpdateProductState,
} from "@/app/admin/products/actions";
import {
  productFormSchema,
  type ProductFormInput,
} from "@/lib/shop/productSchema";
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
    // A mutation with queryFn instead of query: the "fetcher" is the Server
    // Action itself, called as a function — no HTTP endpoint, no baseQuery.
    // RTK Query doesn't care how the data moves; it only needs { data } or
    // { error } back.
    //
    // This mutation is OPTIMISTIC: no invalidatesTags, no refetch. The
    // cached list is patched the moment the save starts, rolled back if the
    // server says no, and reconciled with the server's copy when it says
    // yes. Compare deleteProduct below, which still uses tag invalidation —
    // the pessimistic default. ≈ an NgRx "update entity now, undo on
    // effect failure" pattern, which takes three actions and a reducer case
    // to hand-write.
    updateProduct: builder.mutation<
      UpdateProductState,
      { id: string; input: ProductFormInput }
    >({
      queryFn: async ({ id, input }) => {
        // Validation failures are a *successful* RPC carrying an error-shaped
        // payload (the action returns them, it doesn't throw) — so they ride
        // the data channel. RTK Query's error channel is left for transport
        // failures: network down, server crash.
        return { data: await updateProductAction(id, input) };
      },
      // Runs when the mutation is dispatched, alongside queryFn — the
      // lifecycle hook where cache surgery happens.
      onQueryStarted: async ({ id, input }, { dispatch, queryFulfilled }) => {
        // The shared schema again: parsing the raw input here predicts
        // exactly what the server will store (trim + cents transform
        // included), so the optimistic value isn't a guess. If it fails,
        // the server will reject too — nothing worth patching.
        const parsed = productFormSchema.safeParse(input);
        if (!parsed.success) return;

        // updateQueryData patches a cached entry in place (Immer draft,
        // like a slice reducer) and returns an inverse patch for undo.
        // Subscribed components (cart drawer, checkout) re-render NOW,
        // before any network round-trip.
        const patch = dispatch(
          api.util.updateQueryData("getProducts", undefined, (draft) => {
            const product = draft.find((p) => p.id === id);
            if (!product) return;
            product.name = parsed.data.name;
            product.description = parsed.data.description;
            product.category = parsed.data.category;
            product.priceCents = parsed.data.price;
          }),
        );

        try {
          const { data } = await queryFulfilled;
          if (data.status === "success") {
            // Reconcile: overwrite the optimistic guess with the server's
            // authoritative copy. Cheaper than a refetch — the mutation
            // response already carries the product.
            dispatch(
              api.util.updateQueryData("getProducts", undefined, (draft) => {
                const index = draft.findIndex((p) => p.id === id);
                if (index !== -1) draft[index] = data.product;
              }),
            );
          } else {
            // Server rejected the save — the optimistic patch lied; undo it.
            patch.undo();
          }
        } catch {
          // Transport failure — same story.
          patch.undo();
        }
      },
    }),
    // Same queryFn-wraps-a-Server-Action pattern as updateProduct, but kept
    // PESSIMISTIC as the contrast: tag invalidation → subscribed lists
    // refetch → the removed product simply isn't in the response anymore.
    // (Making this one optimistic too is a good reader exercise: patch out
    // the product in onQueryStarted, undo on failure.)
    deleteProduct: builder.mutation<DeleteProductState, string>({
      queryFn: async (id) => ({ data: await deleteProductAction(id) }),
      invalidatesTags: (result) =>
        result?.status === "success" ? ["Product"] : [],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useUpdateProductMutation,
  useDeleteProductMutation,
} = api;
