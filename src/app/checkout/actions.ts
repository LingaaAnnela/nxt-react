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
  // Form-level error (empty cart, payment declined) — rendered as a banner.
  message?: string;
  orderId?: string;
  // Echoed back on error so the form can repopulate after React 19's
  // post-action reset (uncontrolled inputs fall back to defaultValue).
  fields?: { name: string; email: string };
  // Per-field validation errors, rendered next to their inputs. Same shape
  // as zod's flatten().fieldErrors would give (values as single strings
  // here), so swapping in a schema library later is mechanical.
  errors?: { name?: string; email?: string };
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

  // Every error return carries the entered values back to the client.
  // Only echo what the user typed — never derived/sensitive server data.
  const fields = { name, email };

  // Per-field validation. The client's type="email" is UX only — this runs
  // regardless, because the action is reachable by direct POST.
  // ≈ Validators on a FormGroup, but evaluated server-side.
  const errors: NonNullable<CheckoutState["errors"]> = {};
  if (!name) {
    errors.name = "Name is required.";
  }
  if (!email) {
    errors.email = "Email is required.";
  } else if (!/^\S+@\S+\.\S+$/.test(email)) {
    errors.email = "That doesn't look like an email address.";
  }
  if (Object.keys(errors).length > 0) {
    return { status: "error", errors, fields };
  }

  if (items.length === 0) {
    return { status: "error", message: "Your cart is empty.", fields };
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
    return {
      status: "error",
      message: "Payment declined (simulated).",
      fields,
    };
  }

  return {
    status: "success",
    orderId: `ORD-${Date.now().toString(36).toUpperCase()}`,
    message: `Order placed — ${formatPrice(totalCents)} charged (simulated).`,
  };
}
