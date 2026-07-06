// Server Component: a static wrapper. The form must be a Client Component
// (it reads the cart from the Redux store), and the mutation is a Server
// Action in ./actions.ts — no API route involved. Three files, three
// runtimes: this renders on the server, the form hydrates in the browser,
// the action executes back on the server.
import CheckoutForm from "@/components/CheckoutForm";
import styles from "./page.module.css";

export default function CheckoutPage() {
  return (
    <main className={styles.container}>
      <h1>Checkout</h1>
      <CheckoutForm />
    </main>
  );
}
