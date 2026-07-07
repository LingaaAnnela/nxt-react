'use client';

// Client Component: useActionState drives the error/pending UI. Same plain
// Server Action pattern as the create-product form — a login form should
// work before hydration, and it has exactly one field, so RHF would be
// all overhead here.

import { useActionState } from 'react';
import { login, type LoginState } from '@/app/admin/login/actions';
import styles from './productForm.module.css';

const initialState: LoginState = { status: 'idle' };

export default function AdminLoginForm({ from }: { from: string }) {
  const [state, formAction, isPending] = useActionState(login, initialState);

  return (
    <form action={formAction} className={styles.form}>
      {/* The returnUrl rides along as form data, so the round trip works
          even without JS. The action re-validates it — hidden inputs are
          user input like any other. */}
      <input type="hidden" name="from" value={from} />

      <label className={styles.field}>
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={state.status === 'error' ? true : undefined}
        />
      </label>

      {state.status === 'error' && state.message && (
        <p role="alert" className={styles.error}>
          {state.message}
        </p>
      )}

      <button type="submit" disabled={isPending} className={styles.submit}>
        {isPending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
