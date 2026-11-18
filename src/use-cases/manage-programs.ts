import {
  validateProgram,
  validateProgramFormSettings,
  type Program,
  type ProgramInput,
  type ProgramRepository,
} from "../domain/programs";
import { ValidationError } from "../domain/admin";
import type { MediaStorage } from "../domain/repositories";
import { cleanup } from "./manage-content";

export async function saveProgram(
  repository: ProgramRepository,
  storage: MediaStorage,
  data: Record<string, unknown>,
  id?: string,
  file?: File,
  removeImage = false,
) {
  const input = validateProgram(data);
  const old = id ? await repository.get(id) : null;
  if (id && !old) throw new ValidationError("Program kerja tidak ditemukan.");
  const uploaded = file ? await storage.upload(file, "programs") : undefined;
  try {
    const result = await repository.save(
      input,
      id,
      uploaded ?? (removeImage ? null : undefined),
    );
    if ((uploaded || removeImage) && old?.imagePath)
      await cleanup(storage, old.imagePath);
    return result;
  } catch (error) {
    await cleanup(storage, uploaded);
    throw error;
  }
}

export async function saveProgramFormSettings(
  repository: Pick<ProgramRepository, "get" | "save">,
  id: string,
  data: Record<string, unknown>,
): Promise<Program> {
  if (typeof id !== "string" || !id.trim()) {
    throw new ValidationError("Program kerja tidak ditemukan.");
  }
  const targetId = id.trim();
  const existing = await repository.get(targetId);
  if (!existing) {
    throw new ValidationError("Program kerja tidak ditemukan.");
  }
  if (existing.registrationMode !== "internal") {
    throw new ValidationError(
      "Pengaturan formulir hanya tersedia untuk program bermode Formulir Website.",
    );
  }
  const settings = validateProgramFormSettings(data);
  const nextInput: ProgramInput = {
    title: existing.title,
    body: existing.body,
    fullDescription: existing.fullDescription,
    period: existing.period,
    executionDate: existing.executionDate,
    time: existing.time,
    location: existing.location,
    status: settings.status,
    icon: existing.icon,
    gformLink: existing.gformLink,
    registrationMode: existing.registrationMode,
    registrationGroupLink: settings.registrationGroupLink,
    registrationMaxQuota: settings.registrationMaxQuota,
    registrationFormConfig: settings.registrationFormConfig,
    speakers: existing.speakers,
    price: existing.price,
    benefits: existing.benefits,
    contactPerson: existing.contactPerson,
    sortOrder: existing.sortOrder,
    isPublished: existing.isPublished,
  };
  return repository.save(nextInput, targetId);
}

export async function deleteProgram(
  repository: ProgramRepository,
  storage: MediaStorage,
  id: string,
) {
  const old = await repository.delete(id);
  await cleanup(storage, old.imagePath);
}
