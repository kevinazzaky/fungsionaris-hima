"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/app/admin/actions";

export function PasswordForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(changePasswordAction, {
    error: "",
  });
  return (
    <form action={action} className="admin-form">
      <fieldset disabled={pending}>
        <input
          name="username"
          type="hidden"
          autoComplete="username"
          value={email}
        />
        <label>
          Kata sandi saat ini
          <input
            name="currentPassword"
            type="password"
            required
            maxLength={200}
            autoComplete="current-password"
          />
        </label>
        <div>
          <label>
            Kata sandi baru
            <input
              name="newPassword"
              type="password"
              required
              minLength={12}
              maxLength={72}
              autoComplete="new-password"
              aria-describedby="password-rules"
            />
          </label>
          <small id="password-rules">
            Minimal 12 karakter. Gunakan kata sandi yang berbeda dari
            sebelumnya.
          </small>
        </div>
        <label>
          Ulangi kata sandi baru
          <input
            name="confirmPassword"
            type="password"
            required
            minLength={12}
            maxLength={72}
            autoComplete="new-password"
          />
        </label>
        {state.error && (
          <p className="admin-error" role="alert">
            {state.error}
          </p>
        )}
        <div>
          <button className="admin-button primary" type="submit">
            {pending ? "Mengganti kata sandi..." : "Simpan kata sandi baru"}
          </button>
        </div>
        {pending && (
          <p role="status">
            Memverifikasi akun dan menyimpan kata sandi baru...
          </p>
        )}
      </fieldset>
    </form>
  );
}
