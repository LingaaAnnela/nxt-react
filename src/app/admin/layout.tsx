// Server Component: the app's first NESTED layout — it wraps every /admin
// route inside the root layout, ≈ a parent route component with
// <router-outlet> in a lazy-loaded admin module. Reading the session makes
// every /admin page render dynamically (cookies are request data — nothing
// cookie-dependent can be prerendered at build time).
import { verifySession } from "@/lib/auth/session";
import { logout } from "./login/actions";
import styles from "./layout.module.css";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authed = await verifySession();

  return (
    <div>
      <div className={styles.bar}>
        <span className={styles.title}>Brew Gear admin</span>
        {/* Sign-out is a plain <form action> around a Server Action — no
            client component, no hooks, works without JS. The action mutates
            cookies, which makes Next drop its client-side router cache, so
            this layout re-renders authed=false everywhere at once. */}
        {authed && (
          <form action={logout}>
            <button type="submit" className={styles.signOut}>
              Sign out
            </button>
          </form>
        )}
      </div>
      {children}
    </div>
  );
}
