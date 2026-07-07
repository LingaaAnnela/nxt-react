import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteProduct, updateProduct, createProduct } from "./actions";
import { createSession } from "@/lib/auth/session";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { products } from "@/lib/shop/mock-products";
import type { ProductFormInput } from "@/lib/shop/productSchema";

// These tests run the REAL actions — only the Next runtime around them is
// faked. That's the inverse of the component tests (which mock the actions
// and keep the UI real); between the two suites every layer is covered once.

// (The server-only poison pill inside session.ts is neutralized globally by
// an alias in vitest.config.ts — see the comment there.)

// A fake cookie jar standing in for the per-request store next/headers
// exposes. The Map survives across awaits within a test and is wiped in
// beforeEach — each test is its own "browser".
const jar = vi.hoisted(() => new Map<string, string>());
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      jar.has(name) ? { name, value: jar.get(name)! } : undefined,
    set: (name: string, value: string) => {
      jar.set(name, value);
    },
    delete: (name: string) => {
      jar.delete(name);
    },
  }),
}));

const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    // The real redirect throws a control-flow error; tests that trigger it
    // must expect the throw.
    throw new Error("NEXT_REDIRECT");
  }),
}));

const validInput: ProductFormInput = {
  name: "Aero Press Go v2",
  description: "Portable espresso-style coffee maker for travel.",
  price: "45.00",
  category: "Brewers",
};

beforeEach(() => {
  jar.clear();
  revalidatePath.mockClear();
});

describe("admin action auth guards", () => {
  it("rejects an update with no session, without touching data", async () => {
    const before = products.find((p) => p.id === "p1")!.priceCents;

    const result = await updateProduct("p1", validInput);

    expect(result).toEqual({
      status: "error",
      message: expect.stringMatching(/signed in/i),
    });
    expect(products.find((p) => p.id === "p1")!.priceCents).toBe(before);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects a FORGED cookie — the case the proxy's presence check lets through", async () => {
    jar.set(SESSION_COOKIE, "admin_session=totally-legit-trust-me");

    const result = await deleteProduct("p1");

    expect(result.status).toBe("error");
    expect(products.some((p) => p.id === "p1")).toBe(true);
  });

  it("rejects an unauthenticated create and still echoes the fields back", async () => {
    const formData = new FormData();
    formData.set("name", "Sneaky product");
    formData.set("description", "Should never be created.");
    formData.set("price", "1.00");
    formData.set("category", "Beans");
    const countBefore = products.length;

    const result = await createProduct({ status: "idle" }, formData);

    expect(result.status).toBe("error");
    expect(result.message).toMatch(/signed in/i);
    // The typed values survive the rejection (expired-session UX).
    expect(result.fields?.name).toBe("Sneaky product");
    expect(products.length).toBe(countBefore);
  });

  it("allows the mutation once createSession has set a real token", async () => {
    await createSession(); // what a successful login does

    const result = await updateProduct("p1", validInput);

    expect(result.status).toBe("success");
    expect(products.find((p) => p.id === "p1")).toMatchObject({
      name: "Aero Press Go v2",
      priceCents: 4500,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/products");
  });

  it("locks the door again after destroySession (logout)", async () => {
    await createSession();
    jar.delete(SESSION_COOKIE); // what destroySession does to the jar

    const result = await deleteProduct("p1");

    expect(result.status).toBe("error");
    expect(products.some((p) => p.id === "p1")).toBe(true);
  });
});
