import { products } from "@/lib/shop/mock-products";

// Route handler — Next's built-in backend endpoint, ≈ a minimal NestJS
// controller method colocated with the frontend. The file location IS the
// route: app/api/products/route.ts → GET /api/products. Uses the web-standard
// Request/Response APIs, and is NOT cached by default in this Next version.
export async function GET() {
  // Simulated network latency, so loading/streaming states are observable
  // when we add them.
  await new Promise((resolve) => setTimeout(resolve, 300));
  return Response.json(products);
}
