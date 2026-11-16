"use client";

import { useActionState } from "react";
import { login } from "@/app/admin/actions";
import { PendingLabel } from "@/components/ui/pending-label";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, { error: "" });
  return (
    <form action={action} className="admin-form" aria-busy={pending}>
      <label>
        Email pengurus
        <input
          type="email"
          name="email"
          required
          maxLength={254}
          autoComplete="username"
          disabled={pending}
        />
      </label>
      <label>
        Kata sandi
        <input
          type="password"
          name="password"
          required
          maxLength={200}
          autoComplete="current-password"
          disabled={pending}
        />
      </label>
      {state.error && (
        <p className="admin-error" role="alert">
          {state.error}
        </p>
      )}
      <button className="admin-button primary" type="submit" disabled={pending}>
        <PendingLabel pending={pending} text="Memeriksa akun…">Masuk ke admin</PendingLabel>
      </button>
    </form>
  );
}
