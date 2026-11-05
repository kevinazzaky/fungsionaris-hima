import {
  text,
  validateGallery,
  validatePeriod,
  ValidationError,
} from "./admin";

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
export type ProgramPeriod = { period: string; isPublished: boolean };
export interface ProgramPeriodRepository {
  list(): Promise<ProgramPeriod[]>;
  create(input: ProgramPeriod): Promise<ProgramPeriod>;
  setPublished(input: ProgramPeriod): Promise<ProgramPeriod>;
}
export interface ProgramRepository {
  list(publishedOnly?: boolean): Promise<Program[]>;
  get(id: string): Promise<Program | null>;
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

export function validateProgram(data: Record<string, unknown>): ProgramInput {
  const common = validateGallery({ ...data, alt: data.body });
  const status = text(data.status, "Status");
  const icon = text(data.icon, "Ikon");
  if (!Object.hasOwn(PROGRAM_STATUSES, status))
    throw new ValidationError("Status program tidak dikenal.");
  if (!Object.hasOwn(PROGRAM_ICONS, icon))
    throw new ValidationError("Ikon program tidak dikenal.");
  const gformLink = text(data.gformLink, "Tautan pendaftaran", 2000, false);
  if (gformLink) {
    try {
      if (!["https:", "http:"].includes(new URL(gformLink).protocol))
        throw new Error();
    } catch {
      throw new ValidationError(
        "Tautan pendaftaran harus berupa URL HTTP atau HTTPS yang valid.",
      );
    }
  }
  if (status === "open" && !gformLink)
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
    status: status as ProgramInput["status"],
    icon: icon as ProgramInput["icon"],
    gformLink,
    speakers: lines(data.speakers, "Narasumber"),
    benefits: lines(data.benefits, "Benefit"),
    price: text(data.price, "Biaya", 200, false),
    contactPerson: text(data.contactPerson, "Narahubung", 500, false),
  };
}
