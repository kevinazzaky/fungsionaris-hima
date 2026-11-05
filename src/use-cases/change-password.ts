import { validatePasswordChange } from "../domain/account";
import { ValidationError } from "../domain/admin";
import type { PasswordRepository } from "../domain/repositories";

export async function changePassword(
  repository: PasswordRepository,
  data: Record<string, unknown>,
) {
  const { currentPassword, newPassword } = validatePasswordChange(data);
  if (!(await repository.verifyCurrentPassword(currentPassword))) {
    throw new ValidationError("Kata sandi saat ini tidak sesuai.");
  }
  await repository.updatePassword(newPassword, currentPassword);
}
