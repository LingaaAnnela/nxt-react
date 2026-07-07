import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./api";
import { makeStore, type AppStore } from "./store";
import {
  updateProduct,
  type UpdateProductState,
} from "@/app/admin/products/actions";
import type { ProductFormInput } from "@/lib/shop/productSchema";
import type { Product } from "@/lib/shop/types";

// Store-level test: no components, no jsdom rendering — the optimistic
// update is pure cache behavior, so it's exercised by dispatching against a
// bare store and reading the cache back through the endpoint's selector.
// ≈ testing an NgRx effect + reducer with a real Store and no TestBed.
vi.mock("@/app/admin/products/actions", () => ({
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
}));
const updateProductMock = vi.mocked(updateProduct);

const aeroPress: Product = {
  id: "p1",
  name: "Aero Press Go",
  description: "Portable espresso-style coffee maker for travel.",
  priceCents: 3999,
  category: "Brewers",
  imageUrl: "https://picsum.photos/seed/p1/400/300",
};
const grinder: Product = {
  id: "p3",
  name: "Comandante C40 Grinder",
  description: "Hand grinder with high-alloy steel burrs.",
  priceCents: 24500,
  category: "Grinders",
  imageUrl: "https://picsum.photos/seed/p3/400/300",
};

const input: ProductFormInput = {
  name: "Aero Press Go v2",
  description: "Portable espresso-style coffee maker for travel.",
  price: "45.00",
  category: "Brewers",
};

async function makeSeededStore(): Promise<AppStore> {
  const store = makeStore();
  // upsertQueryData plants a cache entry as if getProducts had fetched it —
  // no fetch mocking needed to have something to patch. It's a thunk that
  // completes on a microtask, so it must be AWAITED: without this, the
  // optimistic patch in onQueryStarted runs against an empty cache and
  // silently no-ops (which is how this comment got here).
  await store.dispatch(
    api.util.upsertQueryData("getProducts", undefined, [aeroPress, grinder]),
  );
  return store;
}

function cachedProduct(store: AppStore, id: string) {
  const { data } = api.endpoints.getProducts.select(undefined)(
    store.getState(),
  );
  return data?.find((p) => p.id === id);
}

beforeEach(() => {
  updateProductMock.mockReset();
});

describe("updateProduct optimistic update", () => {
  it("patches the cached list immediately, before the server responds", async () => {
    // A promise we control: the "server" hasn't answered yet.
    updateProductMock.mockImplementation(() => new Promise(() => {}));
    const store = await makeSeededStore();

    store.dispatch(api.endpoints.updateProduct.initiate({ id: "p1", input }));

    // No await between dispatch and assert — this IS the optimistic claim.
    // The patch also proves the schema ran client-side: "45.00" → 4500.
    expect(cachedProduct(store, "p1")).toMatchObject({
      name: "Aero Press Go v2",
      priceCents: 4500,
    });
    // Bystanders untouched.
    expect(cachedProduct(store, "p3")).toEqual(grinder);
  });

  it("rolls back the patch when the server rejects the save", async () => {
    updateProductMock.mockResolvedValue({
      status: "error",
      message: "Product not found — it may have been removed.",
    });
    const store = await makeSeededStore();

    await store.dispatch(
      api.endpoints.updateProduct.initiate({ id: "p1", input }),
    );

    expect(cachedProduct(store, "p1")).toEqual(aeroPress);
  });

  it("rolls back on transport failure", async () => {
    updateProductMock.mockRejectedValue(new Error("network down"));
    const store = await makeSeededStore();

    await store.dispatch(
      api.endpoints.updateProduct.initiate({ id: "p1", input }),
    );

    expect(cachedProduct(store, "p1")).toEqual(aeroPress);
  });

  it("reconciles the cache with the server's authoritative copy on success", async () => {
    // The server answers with a copy that differs from the optimistic guess
    // — the reconcile step must win over the patch.
    const serverCopy: Product = {
      ...aeroPress,
      name: "Aero Press Go v2 (server truth)",
      priceCents: 4500,
    };
    updateProductMock.mockResolvedValue({
      status: "success",
      product: serverCopy,
    } satisfies UpdateProductState);
    const store = await makeSeededStore();

    await store.dispatch(
      api.endpoints.updateProduct.initiate({ id: "p1", input }),
    );

    expect(cachedProduct(store, "p1")).toEqual(serverCopy);
  });

  it("patches nothing when the input would fail the schema anyway", async () => {
    updateProductMock.mockImplementation(() => new Promise(() => {}));
    const store = await makeSeededStore();

    store.dispatch(
      api.endpoints.updateProduct.initiate({
        id: "p1",
        input: { ...input, price: "free" },
      }),
    );

    expect(cachedProduct(store, "p1")).toEqual(aeroPress);
  });
});
