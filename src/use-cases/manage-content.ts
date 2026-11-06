import {
  validateGallery,
  validateMember,
  ValidationError,
} from "../domain/admin";
import type { ContentRepository, MediaStorage } from "../domain/repositories";

export async function cleanup(
  storage: MediaStorage,
  path: string | null | undefined,
) {
  if (!path) return;
  try {
    await storage.remove(path);
  } catch {
    console.error("Storage cleanup failed; manual cleanup required.");
  }
}

export async function saveMember(
  repository: ContentRepository,
  storage: MediaStorage,
  data: Record<string, unknown>,
  id?: string,
  file?: File,
  removePhoto = false,
) {
  const input = validateMember(data);
  const old = id ? await repository.member(id) : null;
  if (id && !old) throw new ValidationError("Fungsionaris tidak ditemukan.");
  const uploaded = file ? await storage.upload(file, "members") : undefined;
  try {
    const result = await repository.saveMember(
      input,
      id,
      uploaded ?? (removePhoto ? null : undefined),
    );
    if ((uploaded || removePhoto) && old?.photoPath)
      await cleanup(storage, old.photoPath);
    return result;
  } catch (error) {
    await cleanup(storage, uploaded);
    throw error;
  }
}

export async function saveGalleryPhoto(
  repository: ContentRepository,
  storage: MediaStorage,
  data: Record<string, unknown>,
  id?: string,
  file?: File,
  folder: "gallery" | "hero" = "gallery",
) {
  const input = validateGallery(data);
  const old = id ? await repository.photo(id) : null;
  if (id && !old) throw new ValidationError("Foto tidak ditemukan.");
  if (!id && !file) throw new ValidationError("Pilih foto untuk diunggah.");
  const uploaded = file ? await storage.upload(file, folder) : undefined;
  try {
    const result = await repository.savePhoto(input, id, uploaded);
    if (uploaded && old?.imagePath) await cleanup(storage, old.imagePath);
    return result;
  } catch (error) {
    await cleanup(storage, uploaded);
    throw error;
  }
}

export async function deleteContent(
  repository: ContentRepository,
  storage: MediaStorage,
  kind: "members" | "gallery" | "hero",
  id: string,
) {
  if (kind === "members") {
    const old = await repository.member(id);
    if (!old) throw new ValidationError("Fungsionaris tidak ditemukan.");
    await repository.deleteMember(id);
    await cleanup(storage, old.photoPath);
  } else {
    const old = await repository.photo(id);
    if (!old) throw new ValidationError("Foto tidak ditemukan.");
    await repository.deletePhoto(id);
    await cleanup(storage, old.imagePath);
  }
}
