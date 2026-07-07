import { products } from "@/lib/shop/mock-products";

// Route handler — Next's built-in backend endpoint, ≈ a minimal NestJS
// controller method colocated with the frontend. The file location IS the
// route: app/api/products/route.ts → GET /api/products. Uses the web-standard
// Request/Response APIs, and is NOT cached by default in this Next version.
export async function GET() {
  // Set SIMULATE_PRODUCTS_ERROR=true in .env.local to trigger the error
  // boundary at /products. Restart the dev server after changing env vars.
  if (process.env.SIMULATE_PRODUCTS_ERROR === 'true') {
    throw new Error('Failed to load products (simulated API failure)');
  }

  // Simulated network latency — reduced from 3 s (used for loading.tsx demo)
  // to 500 ms so search feels responsive while still showing useTransition's
  // isPending state.
  await new Promise((resolve) => setTimeout(resolve, 500));
  return Response.json(products);
}
