// Server Component: static shell around the form — no hooks, no state. The
// client boundary starts at ProductCreateForm, as low in the tree as it can.
// The /admin segment keeps store CRUD out of the shopper-facing routes, the
// way an admin feature area would be its own lazy-loaded Angular module.
import ProductCreateForm from "@/components/ProductCreateForm";
import styles from "./page.module.css";

export const metadata = {
  title: "New product — Brew Gear admin",
};

export default function NewProductPage() {
  return (
    <main className={styles.container}>
      <h1>New product</h1>
      <ProductCreateForm />
    </main>
  );
}
