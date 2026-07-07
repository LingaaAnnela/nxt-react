import type { Product } from "./types";

// In-memory mock "database", read by the /api/products route handler and now
// mutated by admin Server Actions. Module scope lives for the server process,
// not per request — so writes ARE visible to later requests, but disappear on
// server restart (and in dev, an HMR recompile of this module resets it).
// This is exactly where a real DB would go.
export const products: Product[] = [
  {
    id: "p1",
    name: "Aero Press Go",
    description: "Portable espresso-style coffee maker for travel.",
    priceCents: 3999,
    category: "Brewers",
    imageUrl: "https://picsum.photos/seed/p1/400/300",
  },
  {
    id: "p2",
    name: "Hario V60 Dripper",
    description: "Classic ceramic pour-over cone, size 02.",
    priceCents: 2850,
    category: "Brewers",
    imageUrl: "https://picsum.photos/seed/p2/400/300",
  },
  {
    id: "p3",
    name: "Comandante C40 Grinder",
    description: "Hand grinder with high-alloy steel burrs.",
    priceCents: 24500,
    category: "Grinders",
    imageUrl: "https://picsum.photos/seed/p3/400/300",
  },
  {
    id: "p4",
    name: "Fellow Stagg EKG Kettle",
    description: "Electric gooseneck kettle with PID temperature control.",
    priceCents: 16500,
    category: "Kettles",
    imageUrl: "https://picsum.photos/seed/p4/400/300",
  },
  {
    id: "p5",
    name: "Acaia Pearl Scale",
    description: "0.1g precision brewing scale with flow-rate display.",
    priceCents: 15000,
    category: "Accessories",
    imageUrl: "https://picsum.photos/seed/p5/400/300",
  },
  {
    id: "p6",
    name: "Ethiopia Yirgacheffe 250g",
    description: "Washed single origin, floral and citrus notes.",
    priceCents: 1450,
    category: "Beans",
    imageUrl: "https://picsum.photos/seed/p6/400/300",
  },
];

// The "DELETE" of the mock database.
export function removeProduct(id: string): boolean {
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) return false;
  products.splice(index, 1);
  return true;
}

// The "UPDATE" of the mock database. Id and imageUrl stay fixed — editing
// changes what a product is, not which product it is.
export function updateProduct(
  id: string,
  changes: Omit<Product, "id" | "imageUrl">,
): Product | undefined {
  const product = products.find((p) => p.id === id);
  if (!product) return undefined;
  Object.assign(product, changes);
  return product;
}

// The "INSERT" of the mock database. Id and imageUrl are server-generated —
// the client never picks them (next.config.ts already allowlists
// picsum.photos/seed/** for next/image, so any new seed just works).
export function addProduct(data: Omit<Product, "id" | "imageUrl">): Product {
  const id = `p-${crypto.randomUUID().slice(0, 8)}`;
  const product: Product = {
    ...data,
    id,
    imageUrl: `https://picsum.photos/seed/${id}/400/300`,
  };
  products.push(product);
  return product;
}
