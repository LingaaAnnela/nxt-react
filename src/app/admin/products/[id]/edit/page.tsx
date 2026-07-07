// Server Component: looks up the product server-side and hands it to the
// client form as a prop. Props crossing the server→client boundary must be
// serializable — a plain data object is; a class instance or function
// wouldn't be. This is also where defaultValues originate: the server
// renders the form already filled, no client-side fetch-then-populate.
import { notFound } from "next/navigation";
import { products } from "@/lib/shop/mock-products";
import ProductEditForm from "@/components/ProductEditForm";
import DeleteProductButton from "@/components/DeleteProductButton";
import styles from "./page.module.css";

export const metadata = {
  title: "Edit product — Brew Gear admin",
};

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = products.find((p) => p.id === id);
  if (!product) {
    notFound();
  }

  return (
    <main className={styles.container}>
      <h1>Edit product</h1>
      <ProductEditForm product={product} />
      <DeleteProductButton productId={product.id} productName={product.name} />
    </main>
  );
}
