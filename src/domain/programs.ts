import {
  text,
  validateGallery,
  validatePeriod,
  ValidationError,
} from "./admin";
import {
  cloneDefaultProgramFormConfig,
  validateProgramFormConfig,
  type ProgramFormConfig,
} from "./program-form-config";

export const PROGRAM_ICONS = {
  microphone: "Seminar",
  code: "Pelatihan teknologi",
  broadcast: "Webinar",
  heart: "Kegiatan sosial",
  cake: "Perayaan",
} as const;
export const PROGRAM_STATUSES = {
  upcoming: "Segera Hadir",
  open: "Pendaftaran Dibuka",
  closed: "Pendaftaran Ditutup",
} as const;
export const PROGRAM_REGISTRATION_MODES = {
  external: "Tautan eksternal",
  internal: "Formulir internal website",
} as const;

export type ProgramRegistrationMode = keyof typeof PROGRAM_REGISTRATION_MODES;

export type ProgramInput = {
  title: string;
  body: string;
  fullDescription: string;
  period: string;
  executionDate: string;
  time: string;
  location: string;
  status: keyof typeof PROGRAM_STATUSES;
  icon: keyof typeof PROGRAM_ICONS;
  gformLink: string;
  registrationMode: ProgramRegistrationMode;
  registrationGroupLink: string;
  registrationMaxQuota: number | null;
  registrationFormConfig: ProgramFormConfig;
  speakers: string[];
  price: string;
  benefits: string[];
  contactPerson: string;
  sortOrder: number;
  isPublished: boolean;
};
export type Program = ProgramInput & {
  id: string;
  imagePath: string | null;
  imageUrl: string | null;
};
export type ProgramFormSettingsInput = Pick<
  ProgramInput,
  | "status"
  | "registrationGroupLink"
  | "registrationMaxQuota"
  | "registrationFormConfig"
>;
export type ProgramPeriod = { period: string; isPublished: boolean };
export interface ProgramPeriodRepository {
  list(): Promise<ProgramPeriod[]>;
  create(input: ProgramPeriod): Promise<ProgramPeriod>;
  setPublished(input: ProgramPeriod): Promise<ProgramPeriod>;
}
export interface ProgramRepository {
  list(publishedOnly?: boolean): Promise<Program[]>;
  get(id: string): Promise<Program | null>;
  getPublished(id: string): Promise<Program | null>;
  save(
    input: ProgramInput,
    id?: string,
    imagePath?: string | null,
  ): Promise<Program>;
  delete(id: string): Promise<Program>;
}

function lines(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.length > 50)
    throw new ValidationError(
      `${label} harus berupa daftar maksimal 50 baris.`,
    );
  return value.map((entry) => text(entry, label, 300)).filter(Boolean);
}

function optionalHttpUrl(value: unknown, label: string): string {
  const url = text(value, label, 2000, false);
  if (!url) return "";
  try {
    if (!["https:", "http:"].includes(new URL(url).protocol))
      throw new Error();
  } catch {
    throw new ValidationError(
      `${label} harus berupa URL HTTP atau HTTPS yang valid.`,
    );
  }
  return url;
}

function registrationModeValue(value: unknown): ProgramRegistrationMode {
  if (value === undefined || value === null) return "external";
  const mode = text(value, "Mode pendaftaran");
  if (!Object.hasOwn(PROGRAM_REGISTRATION_MODES, mode))
    throw new ValidationError("Mode pendaftaran program tidak dikenal.");
  return mode as ProgramRegistrationMode;
}

function maxQuotaValue(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (!/^\d+$/.test(trimmed))
      throw new ValidationError(
        "Kuota maksimal peserta harus berupa bilangan bulat minimal 1.",
      );
    const parsed = Number(trimmed);
    if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 2147483647)
      throw new ValidationError(
        "Kuota maksimal peserta harus antara 1 dan 2147483647.",
      );
    return parsed;
  }
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 2147483647
  ) {
    throw new ValidationError(
      "Kuota maksimal peserta harus antara 1 dan 2147483647.",
    );
  }
  return value;
}

function registrationFormConfigValue(value: unknown): ProgramFormConfig {
  if (value === undefined || value === null) {
    return cloneDefaultProgramFormConfig();
  }
  if (typeof value === "string") {
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new ValidationError(
        "Konfigurasi formulir pendaftaran tidak valid.",
      );
    }
    return validateProgramFormConfig(parsed);
  }
  return validateProgramFormConfig(value);
}

function programStatusValue(value: unknown): ProgramInput["status"] {
  const status = text(value, "Status");
  if (!Object.hasOwn(PROGRAM_STATUSES, status))
    throw new ValidationError("Status program tidak dikenal.");
  return status as ProgramInput["status"];
}

export function validateProgramFormSettings(
  data: Record<string, unknown>,
): ProgramFormSettingsInput {
  return {
    status: programStatusValue(data.status),
    registrationGroupLink: optionalHttpUrl(
      data.registrationGroupLink,
      "Tautan grup peserta",
    ),
    registrationMaxQuota: maxQuotaValue(data.registrationMaxQuota),
    registrationFormConfig: registrationFormConfigValue(
      data.registrationFormConfig,
    ),
  };
}

export function validateProgram(data: Record<string, unknown>): ProgramInput {
  const common = validateGallery({ ...data, alt: data.body });
  const formSettings = validateProgramFormSettings(data);
  const icon = text(data.icon, "Ikon");
  if (!Object.hasOwn(PROGRAM_ICONS, icon))
    throw new ValidationError("Ikon program tidak dikenal.");
  const registrationMode = registrationModeValue(data.registrationMode);
  const gformLink = optionalHttpUrl(data.gformLink, "Tautan pendaftaran");
  if (
    formSettings.status === "open" &&
    registrationMode === "external" &&
    !gformLink
  )
    throw new ValidationError(
      "Isi tautan pendaftaran sebelum membuka pendaftaran program.",
    );
  return {
    title: common.title,
    sortOrder: common.sortOrder,
    isPublished: common.isPublished,
    body: text(data.body, "Ringkasan", 300),
    fullDescription: text(
      data.fullDescription,
      "Deskripsi lengkap",
      10000,
      false,
    ),
    period: validatePeriod(data.period).replace("-", "/"),
    executionDate: text(data.executionDate, "Jadwal pelaksanaan", 200, false),
    time: text(data.time, "Waktu", 200, false),
    location: text(data.location, "Lokasi", 300, false),
    status: formSettings.status,
    icon: icon as ProgramInput["icon"],
    gformLink,
    registrationMode,
    registrationGroupLink: formSettings.registrationGroupLink,
    registrationMaxQuota: formSettings.registrationMaxQuota,
    registrationFormConfig: formSettings.registrationFormConfig,
    speakers: lines(data.speakers, "Narasumber"),
    benefits: lines(data.benefits, "Benefit"),
    price: text(data.price, "Biaya", 200, false),
    contactPerson: text(data.contactPerson, "Narahubung", 500, false),
  };
}
