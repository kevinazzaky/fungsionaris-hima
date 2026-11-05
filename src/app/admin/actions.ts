"use server";

import { redirect } from "next/navigation";
import { clearAuthCookies, createAuthClient } from "@/data/supabase/server";
import { getPrisma } from "@/data/prisma";
import { isBackendConfigured } from "@/lib/backend-config";
import { AccessError, requireAdmin } from "@/data/auth";
import { passwordRepository } from "@/data/supabase/account";
import { changePassword } from "@/use-cases/change-password";
import { ValidationError } from "@/domain/admin";

export async function login(_previous: { error: string }, form: FormData) {
  if (!isBackendConfigured())
    return {
      error: "Hubungkan Supabase terlebih dahulu sesuai panduan setup.",
    };
  const email = form.get("email");
  const password = form.get("password");
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password ||
    email.length > 254 ||
    password.length > 200
  ) {
    return { error: "Isi email dan kata sandi dengan benar." };
  }
  const client = await createAuthClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error || !data.user)
    return {
      error:
        "Email atau kata sandi tidak sesuai. Coba kembali beberapa saat lagi.",
    };
  try {
    const admin = await getPrisma().adminUser.findUnique({
      where: { authId: data.user.id },
      select: { id: true },
    });
    if (!admin) {
      await client.auth.signOut();
      return {
        error:
          "Akun ini belum memiliki akses admin. Hubungi pengelola website.",
      };
    }
  } catch {
    await client.auth.signOut();
    return {
      error: "Database belum dapat diakses. Periksa konfigurasi dan migrasi.",
    };
  }
  redirect("/admin");
}

export async function logout() {
  const client = await createAuthClient();
  try {
    await client.auth.signOut({ scope: "local" });
  } catch {
    console.error("Supabase sign-out failed; clearing local session cookies.");
  }
  await clearAuthCookies();
  redirect("/admin/login");
}

export async function changePasswordAction(
  _previous: { error: string },
  form: FormData,
) {
  try {
    await requireAdmin();
    await changePassword(
      await passwordRepository(),
      Object.fromEntries(form.entries()),
    );
  } catch (error) {
    if (error instanceof AccessError) redirect("/admin/login");
    if (error instanceof ValidationError) return { error: error.message };
    return {
      error:
        "Kata sandi belum dapat diganti. Silakan coba kembali beberapa saat lagi.",
    };
  }
  const client = await createAuthClient();
  try {
    const { error } = await client.auth.signOut({ scope: "global" });
    if (error)
      console.error("Password changed; session revocation could not complete.");
  } catch {
    console.error("Password changed; clearing local session cookies.");
  }
  await clearAuthCookies();
  redirect("/admin/login?password=updated");
}
