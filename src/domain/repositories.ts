import type {
  GalleryInput,
  GalleryPhoto,
  ImportedRegistration,
  Member,
  MemberInput,
  Registration,
  RegistrationInput,
  RegistrationSummary,
} from "./admin";

export interface PublicContentRepository {
  members(): Promise<Member[]>;
  gallery(): Promise<GalleryPhoto[]>;
}

export interface RegistrationImportRepository {
  existingNims(nims: string[], period: string): Promise<string[]>;
  insertImported(rows: ImportedRegistration[]): Promise<number>;
}

export interface ContentRepository extends PublicContentRepository {
  member(id: string): Promise<Member | null>;
  photo(id: string): Promise<GalleryPhoto | null>;
  saveMember(
    input: MemberInput,
    id?: string,
    photoPath?: string | null,
  ): Promise<Member>;
  savePhoto(
    input: GalleryInput,
    id?: string,
    imagePath?: string,
  ): Promise<GalleryPhoto>;
  deleteMember(id: string): Promise<void>;
  deletePhoto(id: string): Promise<void>;
}

export interface MediaStorage {
  upload(
    file: File,
    folder: "members" | "gallery" | "hero" | "programs",
  ): Promise<string>;
  remove(path: string): Promise<void>;
}

export interface RegistrationRepository extends RegistrationImportRepository {
  list(
    search: string,
    page: number,
    period?: string,
  ): Promise<{ items: RegistrationSummary[]; total: number }>;
  detail(id: string): Promise<Registration | null>;
  update(
    id: string,
    input: RegistrationInput,
    period: string,
  ): Promise<Registration>;
  delete(id: string): Promise<Registration>;
  create(
    input: RegistrationInput,
    period: string,
    file: { name: string; path: string; size: number } | null,
  ): Promise<{ id: string }>;
  exportAll(): Promise<Registration[]>;
}

export interface PasswordRepository {
  verifyCurrentPassword(password: string): Promise<boolean>;
  updatePassword(password: string, currentPassword: string): Promise<void>;
}
