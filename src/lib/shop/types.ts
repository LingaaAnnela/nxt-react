// Plain domain models — same role as the interfaces in a shared models lib in
// an Angular workspace. Nothing React-specific here; these are imported by
// both Server and Client Components, which is safe because types vanish at
// compile time and cross the server/client boundary for free.

export interface Product {
  id: string;
  name: string;
  description: string;
  // Integer cents, never floats — standard money handling.
  priceCents: number;
  category: string;
  imageUrl: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
}
