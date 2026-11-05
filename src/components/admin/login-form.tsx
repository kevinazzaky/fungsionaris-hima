"use client";

import { useActionState } from "react";
import { login } from "@/app/admin/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, { error: "" });
  return (
    <form action={action} className="admin-form">
      <label>
        Email pengurus
        <input
          type="email"
          name="email"
          required
          maxLength={254}
          autoComplete="username"
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
        />
      </label>
      {state.error && (
        <p className="admin-error" role="alert">
          {state.error}
        </p>
      )}
      <button className="admin-button primary" type="submit" disabled={pending}>
        {pending ? "Memeriksa akun..." : "Masuk ke admin"}
      </button>
    </form>
  );
}
