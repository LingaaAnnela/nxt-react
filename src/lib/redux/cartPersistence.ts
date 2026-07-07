// localStorage read/write for the cart. Browser-only — call it from client
// effects, never during render or on the server (no typeof-window guards
// here on purpose: hiding a server call would mask a bug, not fix one).
//
// localStorage is user-editable and shared with every extension, so the
// stored JSON is untrusted input: loadCartItems validates the shape and
// returns null for anything suspect, the same "validate at the boundary"
// rule as the checkout Server Action.

import type { CartItem } from "@/lib/shop/types";

const STORAGE_KEY = "brew-gear-cart";

function isCartItem(value: unknown): value is CartItem {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as CartItem).productId === "string" &&
    typeof (value as CartItem).quantity === "number" &&
    Number.isInteger((value as CartItem).quantity) &&
    (value as CartItem).quantity > 0
  );
}

export function loadCartItems(): CartItem[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(isCartItem)) return null;
    // Rebuild the items instead of returning the parsed objects, so extra
    // properties smuggled into storage don't enter the store.
    return parsed.map(({ productId, quantity }) => ({ productId, quantity }));
  } catch {
    // Corrupt JSON or storage access denied — start with an empty cart.
    return null;
  }
}

export function saveCartItems(items: CartItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Quota exceeded or private-mode restrictions: persistence is a nicety,
    // never worth crashing the app for.
  }
}
