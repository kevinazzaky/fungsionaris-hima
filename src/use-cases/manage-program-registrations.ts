import { ValidationError } from "../domain/admin";
import {
  DEFAULT_PROGRAM_FORM_CONFIG,
  type ProgramCustomResponses,
} from "../domain/program-form-config";
import type { ProgramRepository } from "../domain/programs";
import {
  ConflictError,
  NotFoundError,
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
  repository: Pick<ProgramRegistrationRepository, "update"> &
    Partial<Pick<ProgramRegistrationRepository, "get">>,
  id: string,
  data: Record<string, unknown>,
  programRepository?: Pick<ProgramRepository, "get">,
) {
  if (typeof id !== "string" || !id.trim())
    throw new ValidationError("ID pendaftar tidak valid.");

  let formConfig = DEFAULT_PROGRAM_FORM_CONFIG;
  let existingCustomResponses: ProgramCustomResponses = {};

  if (programRepository && typeof repository.get === "function") {
    const existing = await repository.get(id);
    if (!existing) {
      throw new NotFoundError("Data pendaftar tidak ditemukan.");
    }
    existingCustomResponses = existing.customResponses;
    const program = await programRepository.get(existing.programId);
    if (program) {
      formConfig = program.registrationFormConfig;
    }
  }

  const input = validateProgramRegistrationAdminUpdate(data, formConfig);

  const currentFieldIds = new Set(
    formConfig.customFields.map((field) => field.id),
  );
  const mergedCustomResponses: ProgramCustomResponses = {};
  for (const [key, value] of Object.entries(existingCustomResponses)) {
    if (!currentFieldIds.has(key)) {
      mergedCustomResponses[key] = value;
    }
  }
  for (const [key, value] of Object.entries(input.customResponses)) {
    mergedCustomResponses[key] = value;
  }

  try {
    return await repository.update(id, {
      ...input,
      customResponses: mergedCustomResponses,
    });
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
