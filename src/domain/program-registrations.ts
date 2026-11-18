import { text, ValidationError } from "./admin";
import {
  DEFAULT_PROGRAM_FORM_CONFIG,
  type CustomFormField,
  type ProgramCustomResponses,
  type ProgramFormConfig,
} from "./program-form-config";

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
  customResponses: ProgramCustomResponses;
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

function validateEmail(value: unknown, required: boolean): string {
  const email = singleLineText(value, "Email", 1, 120, required);
  if (!email) return "";
  if (
    /\s/.test(email) ||
    email.includes("..") ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
  )
    throw new ValidationError("Format email tidak valid.");
  return email;
}

function validateNote(value: unknown, required: boolean): string {
  const normalized =
    typeof value === "string" ? value.replace(/\r\n/g, "\n") : value;
  if (
    typeof normalized === "string" &&
    /[\u0000-\u0008\u000B-\u001F\u007F]/.test(normalized)
  )
    throw new ValidationError(
      "Catatan tidak boleh mengandung karakter kontrol.",
    );
  return text(normalized, "Catatan", 300, required);
}

function validateAngkatan(value: unknown, required: boolean): string {
  const angkatan = singleLineText(value, "Angkatan", 4, 4, required);
  if (!angkatan) return "";
  if (!/^(19|20)\d{2}$/.test(angkatan))
    throw new ValidationError("Angkatan harus berupa tahun empat digit.");
  return angkatan;
}

function isValidCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [yearStr, monthStr, dayStr] = value.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const probe = new Date(0);
  probe.setUTCFullYear(year, month - 1, day);
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

function validateCustomFieldValue(
  field: CustomFormField,
  rawValue: unknown,
): string | boolean {
  if (field.type === "checkbox") {
    if (rawValue === undefined || rawValue === null) {
      if (field.required) {
        throw new ValidationError(`${field.label} wajib dicentang.`);
      }
      return false;
    }
    if (typeof rawValue !== "boolean") {
      throw new ValidationError(
        `${field.label} harus berupa pilihan centang (boolean).`,
      );
    }
    if (field.required && !rawValue) {
      throw new ValidationError(`${field.label} wajib dicentang.`);
    }
    return rawValue;
  }

  if (field.type === "textarea") {
    const normalized =
      typeof rawValue === "string" ? rawValue.replace(/\r\n/g, "\n") : rawValue;
    if (
      typeof normalized === "string" &&
      /[\u0000-\u0008\u000B-\u001F\u007F]/.test(normalized)
    ) {
      throw new ValidationError(
        `${field.label} tidak boleh mengandung karakter kontrol.`,
      );
    }
    return text(normalized, field.label, 500, field.required);
  }

  if (field.type === "number") {
    if (rawValue === undefined || rawValue === null) {
      if (field.required) {
        throw new ValidationError(`${field.label} wajib diisi.`);
      }
      return "";
    }
    let normalized: string;
    if (typeof rawValue === "number") {
      if (!Number.isFinite(rawValue)) {
        throw new ValidationError(`${field.label} harus berupa angka yang valid.`);
      }
      normalized = String(rawValue);
    } else if (typeof rawValue === "string") {
      if (/[\u0000-\u001F\u007F]/.test(rawValue)) {
        throw new ValidationError(
          `${field.label} tidak boleh mengandung karakter kontrol.`,
        );
      }
      normalized = rawValue.trim();
    } else {
      throw new ValidationError(`${field.label} harus berupa angka.`);
    }
    if (!normalized) {
      if (field.required) {
        throw new ValidationError(`${field.label} wajib diisi.`);
      }
      return "";
    }
    if (normalized.length > 30 || !/^-?\d+(\.\d+)?$/.test(normalized)) {
      throw new ValidationError(
        `${field.label} harus berupa angka yang valid maksimal 30 karakter.`,
      );
    }
    return normalized;
  }

  const maxLength = field.type === "date" ? 10 : field.type === "select" ? 80 : 200;
  const parsed = singleLineText(
    rawValue,
    field.label,
    1,
    maxLength,
    field.required,
  );
  if (!parsed) return "";

  if (field.type === "date" && !isValidCalendarDate(parsed)) {
    throw new ValidationError(
      `${field.label} harus berupa tanggal kalender yang valid (YYYY-MM-DD).`,
    );
  }
  if (field.type === "select" && !field.options.includes(parsed)) {
    throw new ValidationError(
      `${field.label} harus memilih salah satu opsi yang tersedia.`,
    );
  }
  return parsed;
}

function validateCustomResponses(
  raw: unknown,
  customFields: CustomFormField[],
): ProgramCustomResponses {
  let source: Record<string, unknown> = {};
  if (raw !== undefined && raw !== null) {
    if (typeof raw !== "object" || Array.isArray(raw)) {
      throw new ValidationError(
        "Jawaban kolom tambahan formulir harus berupa objek.",
      );
    }
    source = raw as Record<string, unknown>;
  }

  const result: ProgramCustomResponses = {};
  for (const field of customFields) {
    const rawValue = Object.hasOwn(source, field.id)
      ? source[field.id]
      : undefined;
    result[field.id] = validateCustomFieldValue(field, rawValue);
  }
  return result;
}

function validateParticipant(
  data: Record<string, unknown>,
  isAdminEdit: boolean,
  formConfig: ProgramFormConfig = DEFAULT_PROGRAM_FORM_CONFIG,
): ProgramRegistrationInput {
  const builtIn =
    formConfig.builtInFields ?? DEFAULT_PROGRAM_FORM_CONFIG.builtInFields;
  const nama = singleLineText(data.nama, "Nama lengkap", 2, 100, true);
  const nim = singleLineText(data.nim, "NIM", 5, 30, true);
  if (!/^\d{5,30}$/.test(nim))
    throw new ValidationError("NIM harus berisi 5 sampai 30 digit angka.");

  const angkatan =
    builtIn.angkatan === "hidden"
      ? ""
      : validateAngkatan(data.angkatan, builtIn.angkatan === "required");
  const noHp =
    builtIn.noHp === "hidden"
      ? ""
      : validatePhone(data.noHp, !isAdminEdit && builtIn.noHp === "required");
  const idLine =
    builtIn.idLine === "hidden"
      ? ""
      : singleLineText(
          data.idLine,
          "ID LINE",
          2,
          64,
          !isAdminEdit && builtIn.idLine === "required",
        );
  const email =
    builtIn.email === "hidden"
      ? ""
      : validateEmail(data.email, !isAdminEdit && builtIn.email === "required");
  const catatan =
    builtIn.catatan === "hidden"
      ? ""
      : validateNote(
          data.catatan,
          !isAdminEdit && builtIn.catatan === "required",
        );

  const customResponses = validateCustomResponses(
    data.customResponses,
    formConfig.customFields ?? [],
  );

  return {
    nama,
    nim,
    angkatan,
    noHp,
    idLine,
    email,
    catatan,
    customResponses,
  };
}

export function validateProgramRegistrationInput(
  data: Record<string, unknown>,
  formConfig: ProgramFormConfig = DEFAULT_PROGRAM_FORM_CONFIG,
): ProgramRegistrationInput {
  return validateParticipant(data, false, formConfig);
}

export function validateProgramRegistrationAdminUpdate(
  data: Record<string, unknown>,
  formConfig: ProgramFormConfig = DEFAULT_PROGRAM_FORM_CONFIG,
): ProgramRegistrationAdminUpdateInput {
  return validateParticipant(data, true, formConfig);
}
