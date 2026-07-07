import { describe, it, expect, beforeEach } from "vitest";
import { loadCartItems, saveCartItems } from "./cartPersistence";

// jsdom provides a real (in-memory) localStorage, so these tests exercise
// the actual storage API — no mocks needed.
describe("cartPersistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips cart items", () => {
    saveCartItems([{ productId: "p1", quantity: 2 }]);
    expect(loadCartItems()).toEqual([{ productId: "p1", quantity: 2 }]);
  });

  it("returns null when nothing is stored", () => {
    expect(loadCartItems()).toBeNull();
  });

  it("returns null for corrupt JSON", () => {
    localStorage.setItem("brew-gear-cart", "{not json");
    expect(loadCartItems()).toBeNull();
  });

  it("returns null for well-formed JSON with the wrong shape", () => {
    localStorage.setItem(
      "brew-gear-cart",
      JSON.stringify([{ productId: "p1", quantity: "two" }]),
    );
    expect(loadCartItems()).toBeNull();
  });

  it("rejects non-positive and fractional quantities", () => {
    localStorage.setItem(
      "brew-gear-cart",
      JSON.stringify([{ productId: "p1", quantity: 0 }]),
    );
    expect(loadCartItems()).toBeNull();
    localStorage.setItem(
      "brew-gear-cart",
      JSON.stringify([{ productId: "p1", quantity: 1.5 }]),
    );
    expect(loadCartItems()).toBeNull();
  });

  it("strips properties beyond productId/quantity", () => {
    localStorage.setItem(
      "brew-gear-cart",
      JSON.stringify([{ productId: "p1", quantity: 1, priceCents: 1 }]),
    );
    expect(loadCartItems()).toEqual([{ productId: "p1", quantity: 1 }]);
  });
});
