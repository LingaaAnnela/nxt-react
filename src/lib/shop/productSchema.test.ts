import { describe, expect, it } from "vitest";
import { z } from "zod";
import { productFormSchema } from "./productSchema";

const validInput = {
  name: "Chemex 6-cup",
  description: "Pour-over carafe with bonded filters.",
  price: "48.50",
  category: "Brewers",
};

describe("productFormSchema", () => {
  it("transforms a price string into integer cents", () => {
    const result = productFormSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    expect(result.data?.price).toBe(4850);
  });

  it("handles float-hostile prices exactly", () => {
    // 24.53 * 100 === 2453.0000000000005 — the transform must round it away.
    const result = productFormSchema.safeParse({
      ...validInput,
      price: "24.53",
    });
    expect(result.data?.price).toBe(2453);
  });

  it("rejects a price with more than two decimals", () => {
    const result = productFormSchema.safeParse({
      ...validInput,
      price: "9.999",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a zero price", () => {
    const result = productFormSchema.safeParse({ ...validInput, price: "0" });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown category", () => {
    const result = productFormSchema.safeParse({
      ...validInput,
      category: "Mugs",
    });
    expect(result.success).toBe(false);
  });

  it("collects per-field errors in flattenError's fieldErrors shape", () => {
    // This is the exact object the Server Action echoes back to the form.
    const result = productFormSchema.safeParse({
      name: "ab",
      description: "too short",
      price: "abc",
      category: "Brewers",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const { fieldErrors } = z.flattenError(result.error);
      expect(fieldErrors.name?.[0]).toMatch(/at least 3/);
      expect(fieldErrors.description?.[0]).toMatch(/at least 10/);
      expect(fieldErrors.price?.[0]).toMatch(/like 24\.50/);
      expect(fieldErrors.category).toBeUndefined();
    }
  });

  it("trims whitespace before validating", () => {
    const result = productFormSchema.safeParse({
      ...validInput,
      name: "  Chemex 6-cup  ",
    });
    expect(result.data?.name).toBe("Chemex 6-cup");
  });
});
