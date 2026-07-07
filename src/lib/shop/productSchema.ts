import { z } from "zod";

// One schema, validated on both sides: the Server Action uses it now, and the
// edit form (React Hook Form) will reuse it client-side later. ≈ sharing a
// Validators config between an Angular form and the backend — except here it
// really is the same object, not a convention kept in sync by hand.

export const PRODUCT_CATEGORIES = [
  "Brewers",
  "Grinders",
  "Kettles",
  "Accessories",
  "Beans",
] as const;

export const productFormSchema = z.object({
  name: z.string().trim().min(3, "Name needs at least 3 characters."),
  description: z
    .string()
    .trim()
    .min(10, "Description needs at least 10 characters."),
  // The form submits a display string ("24.50"); the domain stores integer
  // cents. A zod transform does the conversion *inside* validation, so the
  // string type exists on the way in and the number type on the way out —
  // see ProductFormInput vs ProductFormValues below. The regex caps it at
  // two decimals, so Math.round only cleans up float noise (24.53 * 100 is
  // 2453.0000000000005 in IEEE 754), never changes the value.
  price: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a price like 24.50.")
    .transform((value) => Math.round(Number(value) * 100))
    .refine((cents) => cents > 0, "Price must be more than zero."),
  category: z.enum(PRODUCT_CATEGORIES, "Choose a category."),
});

// z.input = what goes IN (price: string), z.output = what safeParse returns
// after transforms (price: number, in cents). Two types from one schema.
export type ProductFormInput = z.input<typeof productFormSchema>;
export type ProductFormValues = z.output<typeof productFormSchema>;
