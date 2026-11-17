import { text, ValidationError } from "./admin";

export class ConflictError extends Error {
  readonly reason: "duplicate" | "quota";

  constructor(message: string, reason: "duplicate" | "quota" = "duplicate") {
    super(message);
    this.name = "ConflictError";
    this.reason = reason;
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export type ProgramRegistrationInput = {
  nama: string;
  nim: string;
  angkatan: string;
  noHp: string;
  idLine: string;
  email: string;
  catatan: string;
};

export type ProgramRegistrationAdminUpdateInput = ProgramRegistrationInput;

export type ProgramRegistration = ProgramRegistrationInput & {
  id: string;
  programId: string;
  submittedAt: Date;
  createdAt: Date;
};

export type ProgramRegistrationListItem = ProgramRegistration & {
  programTitle: string;
  programPeriod: string;
};

export type ProgramRegistrationListFilter = {
  programId?: string;
  q?: string;
};

export interface ProgramRegistrationRepository {
  create(
    programId: string,
    input: ProgramRegistrationInput,
  ): Promise<ProgramRegistration>;
  get(id: string): Promise<ProgramRegistration | null>;
  list(
    filter?: ProgramRegistrationListFilter,
  ): Promise<ProgramRegistrationListItem[]>;
  update(
    id: string,
    input: ProgramRegistrationAdminUpdateInput,
  ): Promise<ProgramRegistration>;
  delete(id: string): Promise<ProgramRegistration>;
  countByProgram(programId: string): Promise<number>;
  countsByProgram(): Promise<Record<string, number>>;
}

// Check raw strings before trim() so leading/trailing newlines or tabs are rejected rather than stripped.
function singleLineText(
  value: unknown,
  label: string,
  min: number,
  max: number,
  required = true,
): string {
  if (typeof value === "string" && /[\u0000-\u001F\u007F]/.test(value))
    throw new ValidationError(
      `${label} tidak boleh mengandung karakter kontrol.`,
    );
  const result = text(value, label, max, required);
  if (!result) return "";
  if (result.length < min)
    throw new ValidationError(`${label} minimal ${min} karakter.`);
  return result;
}

function validatePhone(value: unknown, required: boolean): string {
  const noHp = singleLineText(value, "Nomor HP / WA", 8, 20, required);
  if (!noHp) return "";
  if (!/^[+\d\s()-]{8,20}$/.test(noHp) || noHp.replace(/\D/g, "").length < 8)
    throw new ValidationError(
      "Nomor HP / WA harus berisi 8 sampai 20 karakter angka atau simbol telepon yang valid.",
    );
  return noHp;
}

function validateEmail(value: unknown): string {
  const email = singleLineText(value, "Email", 1, 120, false);
  if (!email) return "";
  if (
    /\s/.test(email) ||
    email.includes("..") ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
  )
    throw new ValidationError("Format email tidak valid.");
  return email;
}

function validateNote(value: unknown): string {
  const normalized =
    typeof value === "string" ? value.replace(/\r\n/g, "\n") : value;
  if (
    typeof normalized === "string" &&
    /[\u0000-\u0008\u000B-\u001F\u007F]/.test(normalized)
  )
    throw new ValidationError(
      "Catatan tidak boleh mengandung karakter kontrol.",
    );
  return text(normalized, "Catatan", 300, false);
}

function validateParticipant(
  data: Record<string, unknown>,
  requireContacts: boolean,
): ProgramRegistrationInput {
  const nama = singleLineText(data.nama, "Nama lengkap", 2, 100, true);
  const nim = singleLineText(data.nim, "NIM", 5, 30, true);
  if (!/^\d{5,30}$/.test(nim))
    throw new ValidationError("NIM harus berisi 5 sampai 30 digit angka.");
  const angkatan = singleLineText(data.angkatan, "Angkatan", 4, 4, true);
  if (!/^(19|20)\d{2}$/.test(angkatan))
    throw new ValidationError("Angkatan harus berupa tahun empat digit.");
  const noHp = validatePhone(data.noHp, requireContacts);
  const idLine = singleLineText(
    data.idLine,
    "ID LINE",
    2,
    64,
    requireContacts,
  );
  const email = validateEmail(data.email);
  const catatan = validateNote(data.catatan);
  return { nama, nim, angkatan, noHp, idLine, email, catatan };
}

export function validateProgramRegistrationInput(
  data: Record<string, unknown>,
): ProgramRegistrationInput {
  return validateParticipant(data, true);
}

export function validateProgramRegistrationAdminUpdate(
  data: Record<string, unknown>,
): ProgramRegistrationAdminUpdateInput {
  return validateParticipant(data, false);
}
