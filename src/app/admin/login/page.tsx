// Server Component: unwraps the ?from= search param (a Promise in this Next
// version, like route params) and hands it to the client form.
import AdminLoginForm from "@/components/AdminLoginForm";
import styles from "./page.module.css";

export const metadata = {
  title: "Sign in — Brew Gear admin",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;

  return (
    <main className={styles.container}>
      <h1>Admin sign in</h1>
      <AdminLoginForm from={from ?? ""} />
      <p className={styles.hint}>
        Learning app — the password is <code>brew-admin</code> (or the
        ADMIN_PASSWORD env var).
      </p>
    </main>
  );
}
