import { describe, it, expect } from "vitest";
import cartReducer, {
  itemAdded,
  itemRemoved,
  cartCleared,
  selectCartCount,
} from "./cartSlice";

// Reducer tests are pure-function tests: state in, action in, state out.
// Same shape as an NgRx reducer spec — no TestBed, no store, no mocks.
// Passing `undefined` as state exercises the initialState branch.
describe("cartSlice", () => {
  it("adds a new item with quantity 1", () => {
    const state = cartReducer(undefined, itemAdded("p1"));
    expect(state.items).toEqual([{ productId: "p1", quantity: 1 }]);
  });

  it("increments the quantity of an existing item instead of duplicating", () => {
    const first = cartReducer(undefined, itemAdded("p1"));
    const second = cartReducer(first, itemAdded("p1"));
    expect(second.items).toEqual([{ productId: "p1", quantity: 2 }]);
  });

  it("does not mutate the previous state (Immer emits new objects)", () => {
    const before = cartReducer(undefined, itemAdded("p1"));
    cartReducer(before, itemAdded("p1"));
    expect(before.items[0].quantity).toBe(1);
  });

  it("removes an item's entire line regardless of quantity", () => {
    let state = cartReducer(undefined, itemAdded("p1"));
    state = cartReducer(state, itemAdded("p1"));
    state = cartReducer(state, itemAdded("p2"));
    const after = cartReducer(state, itemRemoved("p1"));
    expect(after.items).toEqual([{ productId: "p2", quantity: 1 }]);
  });

  it("removing an unknown id leaves state unchanged (no-op, never throws)", () => {
    const before = cartReducer(undefined, itemAdded("p1"));
    const after = cartReducer(before, itemRemoved("nope"));
    expect(after.items).toEqual(before.items);
  });

  it("clears all items", () => {
    const filled = cartReducer(undefined, itemAdded("p1"));
    const cleared = cartReducer(filled, cartCleared());
    expect(cleared.items).toEqual([]);
  });

  it("selectCartCount sums quantities across items", () => {
    // Slice selectors take root-shaped state — the slice mounted at its name.
    let state = cartReducer(undefined, itemAdded("p1"));
    state = cartReducer(state, itemAdded("p1"));
    state = cartReducer(state, itemAdded("p2"));
    expect(selectCartCount({ cart: state })).toBe(3);
  });
});
