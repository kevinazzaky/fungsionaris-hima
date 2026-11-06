import { ValidationError } from "./admin";

export type PasswordChangeInput = {
  currentPassword: string;
  newPassword: string;
};

export function validatePasswordChange(
  data: Record<string, unknown>,
): PasswordChangeInput {
  const { currentPassword, newPassword, confirmPassword } = data;
  if (
    typeof currentPassword !== "string" ||
    !currentPassword ||
    currentPassword.length > 200
  ) {
    throw new ValidationError("Isi kata sandi saat ini dengan benar.");
  }
  if (typeof newPassword !== "string" || newPassword.length < 12) {
    throw new ValidationError("Kata sandi baru minimal 12 karakter.");
  }
  if (
    newPassword.length > 72 ||
    new TextEncoder().encode(newPassword).length > 72
  ) {
    throw new ValidationError(
      "Kata sandi baru terlalu panjang. Gunakan kata sandi yang lebih singkat.",
    );
  }
  if (newPassword !== confirmPassword)
    throw new ValidationError("Konfirmasi kata sandi baru belum sesuai.");
  if (newPassword === currentPassword)
    throw new ValidationError(
      "Kata sandi baru harus berbeda dari kata sandi saat ini.",
    );
  return { currentPassword, newPassword };
}
