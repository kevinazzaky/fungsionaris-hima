import { validatePeriod, validateRegistration } from "../domain/admin";
import type { RegistrationRepository } from "../domain/repositories";

export async function updateRegistration(
  repository: Pick<RegistrationRepository, "update">,
  id: string,
  data: Record<string, unknown>,
) {
  const input = validateRegistration(data);
  const period = validatePeriod(data.period);
  return repository.update(id, input, period);
}

export async function deleteRegistration(
  repository: Pick<RegistrationRepository, "delete">,
  storage: { remove(path: string): Promise<void> },
  id: string,
) {
  const deleted = await repository.delete(id);
  if (deleted.berkasPath) {
    try {
      await storage.remove(deleted.berkasPath);
    } catch {
      console.error(
        "Registration attachment cleanup failed:",
        deleted.berkasPath,
      );
      return { fileCleanupPending: true };
    }
  }
  return { fileCleanupPending: false };
}
