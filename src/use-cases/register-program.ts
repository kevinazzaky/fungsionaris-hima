import { ValidationError } from "../domain/admin";
import type { ProgramRepository } from "../domain/programs";
import {
  ConflictError,
  NotFoundError,
  validateProgramRegistrationInput,
  type ProgramRegistration,
  type ProgramRegistrationRepository,
} from "../domain/program-registrations";

export type RegisterProgramResult = {
  registration: ProgramRegistration;
  programTitle: string;
  registrationGroupLink: string;
};

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function registerProgram(
  programRepository: Pick<ProgramRepository, "getPublished">,
  registrationRepository: Pick<
    ProgramRegistrationRepository,
    "countByProgram" | "create"
  >,
  programId: string,
  data: Record<string, unknown>,
): Promise<RegisterProgramResult> {
  if (typeof programId !== "string" || !programId.trim())
    throw new ValidationError("Program kerja tidak valid.");
  const input = validateProgramRegistrationInput(data);
  const program = await programRepository.getPublished(programId);
  if (!program || !program.isPublished)
    throw new NotFoundError("Program kerja tidak ditemukan.");
  if (program.registrationMode !== "internal")
    throw new ValidationError(
      "Program kerja ini tidak menggunakan pendaftaran melalui formulir website.",
    );
  if (program.status === "upcoming")
    throw new ValidationError("Pendaftaran program kerja ini belum dibuka.");
  if (program.status !== "open")
    throw new ValidationError("Pendaftaran program kerja ini sudah ditutup.");
  if (program.registrationMaxQuota !== null) {
    const count = await registrationRepository.countByProgram(program.id);
    if (count >= program.registrationMaxQuota)
      throw new ConflictError(
        "Kuota peserta untuk program kerja ini sudah penuh.",
        "quota",
      );
  }
  try {
    const registration = await registrationRepository.create(program.id, input);
    return {
      registration,
      programTitle: program.title,
      registrationGroupLink: program.registrationGroupLink,
    };
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError(
        "NIM ini sudah terdaftar pada program kerja ini.",
        "duplicate",
      );
    }
    throw error;
  }
}
