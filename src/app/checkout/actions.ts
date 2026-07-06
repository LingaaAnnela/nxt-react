'use server';

// Server Function file: the directive marks every export as server-only.
// The client bundle gets an RPC stub — calling placeOrder from a component
// sends a POST under the hood, but it reads like a local function call.
// There's no Angular equivalent: this collapses the controller + HttpClient
// layers into one typed function.
//
// Security rule from the docs: Server Functions are reachable by direct
// POST, not just from your UI — validate everything here, never in the
// form alone.

import { products } from "@/lib/shop/mock-products";
import { formatPrice } from "@/lib/shop/format";
import type { CartItem } from "@/lib/shop/types";

export interface CheckoutState {
  status: "idle" | "success" | "error";
  message?: string;
  orderId?: string;
}

export async function placeOrder(
  _prevState: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  let items: CartItem[] = [];
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    // fall through with an empty cart
  }

  if (!name || !email) {
    return { status: "error", message: "Name and email are required." };
  }
  if (items.length === 0) {
    return { status: "error", message: "Your cart is empty." };
  }

  // Recompute the total from server-side data. The client sent only ids and
  // quantities — prices from the browser are never trusted.
  const totalCents = items.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId);
    return sum + (product ? product.priceCents * item.quantity : 0);
  }, 0);

  // Simulated payment gateway latency.
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Deterministic failure hook so the error path can be practiced/tested.
  if (email.toLowerCase().startsWith("decline")) {
    return { status: "error", message: "Payment declined (simulated)." };
  }

  return {
    status: "success",
    orderId: `ORD-${Date.now().toString(36).toUpperCase()}`,
    message: `Order placed — ${formatPrice(totalCents)} charged (simulated).`,
  };
}
