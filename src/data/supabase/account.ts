import "server-only";
import { createAuthClient } from "./server";
import { AccessError } from "@/data/auth";
import { ValidationError } from "@/domain/admin";
import type { PasswordRepository } from "@/domain/repositories";

export async function passwordRepository(): Promise<PasswordRepository> {
  const client = await createAuthClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user?.email) throw new AccessError();
  return {
    async verifyCurrentPassword(password) {
      const { data, error } = await client.auth.signInWithPassword({
        email: user.email!,
        password,
      });
      if (error?.code === "invalid_credentials") return false;
      if (error?.status === 429)
        throw new ValidationError(
          "Terlalu banyak percobaan. Tunggu beberapa saat lalu coba lagi.",
        );
      if (error) throw new Error("Verifikasi kata sandi belum dapat diproses.");
      return data.user?.id === user.id;
    },
    async updatePassword(password, currentPassword) {
      const { error } = await client.auth.updateUser({
        password,
        current_password: currentPassword,
      });
      if (error?.code === "same_password")
        throw new ValidationError(
          "Kata sandi baru harus berbeda dari sebelumnya.",
        );
      if (error?.code === "weak_password")
        throw new ValidationError(
          "Kata sandi ini terlalu mudah ditebak. Pilih kata sandi yang lebih kuat.",
        );
      if (
        error?.code === "reauthentication_needed" ||
        error?.code === "reauthentication_not_valid"
      ) {
        throw new ValidationError(
          "Verifikasi sesi diperlukan. Keluar, lalu masuk kembali sebelum mengganti kata sandi.",
        );
      }
      if (error) throw new Error("Perubahan kata sandi belum dapat diproses.");
    },
  };
}
