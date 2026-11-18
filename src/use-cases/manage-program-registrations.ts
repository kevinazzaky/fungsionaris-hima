import { ValidationError } from "../domain/admin";
import {
  ConflictError,
  validateProgramRegistrationAdminUpdate,
  type ProgramRegistrationListFilter,
  type ProgramRegistrationRepository,
} from "../domain/program-registrations";

export async function listProgramRegistrations(
  repository: Pick<ProgramRegistrationRepository, "list">,
  filter?: ProgramRegistrationListFilter,
) {
  const programId = filter?.programId?.trim() || undefined;
  const q = filter?.q?.trim().slice(0, 100) || undefined;
  return repository.list({ programId, q });
}

export async function getProgramRegistrationCounts(
  repository: Pick<ProgramRegistrationRepository, "countsByProgram">,
) {
  return repository.countsByProgram();
}

export async function updateProgramRegistration(
  repository: Pick<ProgramRegistrationRepository, "update">,
  id: string,
  data: Record<string, unknown>,
) {
  if (typeof id !== "string" || !id.trim())
    throw new ValidationError("ID pendaftar tidak valid.");
  const input = validateProgramRegistrationAdminUpdate(data);
  try {
    return await repository.update(id, input);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw new ConflictError(
        "NIM ini sudah terdaftar pada program kerja ini.",
        "duplicate",
      );
    }
    throw error;
  }
}

export async function deleteProgramRegistration(
  repository: Pick<ProgramRegistrationRepository, "delete">,
  id: string,
) {
  if (typeof id !== "string" || !id.trim())
    throw new ValidationError("ID pendaftar tidak valid.");
  return repository.delete(id);
}
