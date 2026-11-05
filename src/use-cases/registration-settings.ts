import { ValidationError } from "../domain/admin";
import type { RegistrationSettingsRepository } from "../domain/registration-settings";

export function setRegistrationOpen(
  repository: RegistrationSettingsRepository,
  data: Record<string, unknown>,
) {
  if (typeof data.isOpen !== "boolean")
    throw new ValidationError(
      "Status pendaftaran harus berupa buka atau tutup.",
    );
  return repository.setOpen(data.isOpen);
}
