"use server";

// Server Function file (same pattern as checkout/actions.ts), but this one
// actually MUTATES server data — which brings in the two concepts checkout
// never needed:
//
// 1. revalidatePath: /products is a Server Component whose rendered output
//    Next caches. After a write, that cache is stale; revalidatePath tells
//    Next to re-render it. Without this the new product exists in the array
//    but the list page keeps serving the old HTML. There's no NgRx analogue —
//    the closest mental model is invalidating a cache key, like RTK Query's
//    invalidatesTags but for server-rendered routes.
//
// 2. redirect: navigates the browser from inside the action, in the same
//    roundtrip. It THROWS a control-flow exception, so nothing after it runs
//    and the success case never returns a state object — which is why
//    CreateProductState has no "success" status. Docs: revalidation must be
//    called BEFORE redirect so the destination renders with fresh data.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  addProduct,
  removeProduct,
  updateProduct as updateProductRecord,
} from "@/lib/shop/mock-products";
import {
  productFormSchema,
  type ProductFormInput,
} from "@/lib/shop/productSchema";
import type { Product } from "@/lib/shop/types";
import { verifySession } from "@/lib/auth/session";

// Every action verifies the session ITSELF — the security rule quoted at the
// top of this file, now enforced. The proxy already redirected anonymous
// browsers away from the admin pages, but these functions are reachable by
// direct POST with a forged cookie; verifySession (which checks the value,
// not just presence) is the line that actually holds.
const NOT_SIGNED_IN = "You must be signed in as admin to do that.";

export interface CreateProductState {
  status: "idle" | "error";
  // Form-level error (auth) — rendered as a banner above the submit.
  message?: string;
  // Echoed back on error so the form repopulates after React 19's
  // post-action reset (same trick as CheckoutState.fields).
  fields?: { name: string; description: string; price: string; category: string };
  // Zod's native flattenError shape: string[] per field, not single strings —
  // a field can fail several checks. The form renders the first one.
  errors?: {
    name?: string[];
    description?: string[];
    price?: string[];
    category?: string[];
  };
}

export async function createProduct(
  _prevState: CreateProductState,
  formData: FormData,
): Promise<CreateProductState> {
  const raw = {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    price: String(formData.get("price") ?? ""),
    category: String(formData.get("category") ?? ""),
  };

  // Auth check after reading fields so a signed-out submit still echoes the
  // typed values back — the user shouldn't lose work over an expired session.
  if (!(await verifySession())) {
    return { status: "error", message: NOT_SIGNED_IN, fields: raw };
  }

  // safeParse never throws — it returns a discriminated union, narrowed by
  // checking .success. Compare checkout's hand-rolled if-chains: the schema
  // replaces all of them, and the transform has already produced integer
  // cents by the time we read result.data.
  const result = productFormSchema.safeParse(raw);
  if (!result.success) {
    return {
      status: "error",
      errors: z.flattenError(result.error).fieldErrors,
      fields: raw,
    };
  }

  const { name, description, category, price } = result.data;
  addProduct({ name, description, category, priceCents: price });

  revalidatePath("/products");
  redirect("/products");
}

// The edit form's action. Two deliberate contrasts with createProduct:
//
// 1. No useActionState, no FormData. React Hook Form calls this like a plain
//    async function from its submit handler, passing a typed object. Server
//    Actions accept any serializable arguments when invoked directly — the
//    FormData signature is only required for <form action={...}>.
//
// 2. The parameter is TYPED as ProductFormInput, but types vanish at
//    runtime and this endpoint is reachable by direct POST — so the same
//    schema runs again HERE, as the authoritative parse. The client-side
//    zodResolver run is UX; this run is security. One schema, two jobs.
// A discriminated union rather than optional fields: the RTK Query mutation
// wrapping this action needs to branch on the outcome, and narrowing on
// `status` beats sniffing which properties happen to exist.
export type UpdateProductState =
  | { status: "success"; product: Product }
  | {
      status: "error";
      // Field errors in the same flattenError shape as CreateProductState;
      // the form maps them back onto fields with RHF's setError.
      errors?: CreateProductState["errors"];
      // Non-field failure (unknown id) — rendered as a form-level banner.
      message?: string;
    };

export async function updateProduct(
  id: string,
  input: ProductFormInput,
): Promise<UpdateProductState> {
  if (!(await verifySession())) {
    return { status: "error", message: NOT_SIGNED_IN };
  }

  const result = productFormSchema.safeParse(input);
  if (!result.success) {
    return {
      status: "error",
      errors: z.flattenError(result.error).fieldErrors,
    };
  }

  const { name, description, category, price } = result.data;
  const updated = updateProductRecord(id, {
    name,
    description,
    category,
    priceCents: price,
  });
  if (!updated) {
    return {
      status: "error",
      message: "Product not found — it may have been removed.",
    };
  }

  // Both routes that render this product are now stale: the listing and the
  // detail page. This covers the SERVER-side cache only — the browser also
  // holds products in the RTK Query cache, which the server can't reach.
  // That's why this action no longer redirect()s: the client has follow-up
  // work (invalidate its own cache, then navigate), and a server redirect
  // would take over before any client code after the await could run.
  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  return { status: "success", product: updated };
}

export type DeleteProductState =
  | { status: "success" }
  | { status: "error"; message: string };

// The simplest action yet: no form, no schema — the only input is an id.
// It still gets the untrusted-input treatment (direct POST can send
// anything), just proportionate to the shape: a typeof check, not zod.
export async function deleteProduct(id: string): Promise<DeleteProductState> {
  if (!(await verifySession())) {
    return { status: "error", message: NOT_SIGNED_IN };
  }

  if (typeof id !== "string" || id.length === 0) {
    return { status: "error", message: "Invalid product id." };
  }

  if (!removeProduct(id)) {
    return {
      status: "error",
      message: "Product not found — it may already have been deleted.",
    };
  }

  // Same two stale server-rendered routes as an edit. The detail page now
  // 404s, which is exactly why it must be revalidated — its cached render
  // still shows the deleted product.
  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  return { status: "success" };
}
