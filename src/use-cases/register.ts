import {
  validatePeriod,
  validateRegistration,
  ValidationError,
} from "../domain/admin";
import type { RegistrationRepository } from "../domain/repositories";

export interface RegistrationFileStorage {
  upload(file: File): Promise<string>;
  remove(path: string): Promise<void>;
}

export async function register(
  repository: RegistrationRepository,
  storage: RegistrationFileStorage,
  data: Record<string, unknown>,
  periodValue: unknown,
  file: File | null,
) {
  const input = validateRegistration(data);
  const period = validatePeriod(periodValue);
  if ((await repository.existingNims([input.nim], period)).length)
    throw new ValidationError("NIM sudah terdaftar pada periode ini.");
  const path = file ? await storage.upload(file) : null;
  try {
    return await repository.create(
      input,
      period,
      file && path
        ? { name: file.name.slice(0, 255), path, size: file.size }
        : null,
    );
  } catch (error) {
    if (path) {
      try {
        await storage.remove(path);
      } catch {
        console.error("Registration file cleanup failed.");
      }
    }
    throw error;
  }
}
