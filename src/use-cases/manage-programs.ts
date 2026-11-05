import { validateProgram, type ProgramRepository } from "../domain/programs";
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

export async function deleteProgram(
  repository: ProgramRepository,
  storage: MediaStorage,
  id: string,
) {
  const old = await repository.delete(id);
  await cleanup(storage, old.imagePath);
}
