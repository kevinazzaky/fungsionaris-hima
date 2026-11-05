import { validatePeriod, validateRegistration, ValidationError } from "./admin";
import type { ImportPreview, RegistrationInput } from "./admin";

const normalize = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

const aliases: Record<
  keyof RegistrationInput | "submittedAt" | "berkas",
  string[]
> = {
  nama: ["nama", "nama lengkap", "name"],
  nim: ["nim", "nomor induk mahasiswa"],
  angkatan: ["angkatan", "tahun angkatan"],
  tempatTanggalLahir: [
    "tempatTanggalLahir",
    "tempat tanggal lahir",
    "tempat tgl lahir",
    "ttl",
  ],
  jenisKelamin: ["jenisKelamin", "jenis kelamin"],
  alamat: ["alamat", "alamat domisili"],
  noHp: [
    "noHp",
    "no hp",
    "no hp wa",
    "nomor hp",
    "no whatsapp",
    "nomor telepon",
    "no whatsapp hp",
  ],
  idLine: ["idLine", "id line", "line"],
  pengalamanOrganisasi: ["pengalamanOrganisasi", "pengalaman organisasi"],
  minatSkill: ["minatSkill", "minat dan skill", "minat skill"],
  alasanBergabung: [
    "alasanBergabung",
    "alasan bergabung",
    "alasan bergabung hima ti",
  ],
  divisi: ["divisi", "pilihan divisi", "divisi yang diminati"],
  alasanDivisi: ["alasanDivisi", "alasan divisi", "alasan memilih divisi"],
  submittedAt: [
    "timestamp",
    "waktu daftar",
    "submittedAt",
    "tanggal daftar",
    "waktu submit",
  ],
  berkas: ["berkas", "nama berkas", "file", "nama berkas lampiran"],
};

function parseDate(value: string): Date | null {
  if (!value || value === "-") return null;
  // Tanggal numerik spreadsheet Indonesia dibaca hari/bulan, bukan asumsi locale server.
  const local = value.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[ ,T]+(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?)?$/,
  );
  if (local) {
    const [, day, month, year, hour = "0", minute = "0", second = "0"] = local;
    const parts = [+year, +month, +day, +hour, +minute, +second];
    const date = new Date(
      Date.UTC(
        parts[0],
        parts[1] - 1,
        parts[2],
        parts[3] - 8,
        parts[4],
        parts[5],
      ),
    );
    const bali = new Date(date.getTime() + 8 * 3600000);
    if (
      bali.getUTCFullYear() !== parts[0] ||
      bali.getUTCMonth() !== parts[1] - 1 ||
      bali.getUTCDate() !== parts[2] ||
      parts[3] > 23 ||
      parts[4] > 59 ||
      parts[5] > 59
    ) {
      throw new ValidationError("Tanggal pendaftaran tidak valid.");
    }
    return date;
  }
  const iso = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/,
  );
  if (!iso) {
    throw new ValidationError(
      "Timestamp harus ISO dengan zona waktu atau tanggal Indonesia (DD/MM/YYYY).",
    );
  }
  const [, year, month, day, hour, minute, second = "0"] = iso;
  const calendar = new Date(Date.UTC(+year, +month - 1, +day));
  if (
    calendar.getUTCFullYear() !== +year ||
    calendar.getUTCMonth() !== +month - 1 ||
    calendar.getUTCDate() !== +day ||
    +hour > 23 ||
    +minute > 59 ||
    +second > 59
  ) {
    throw new ValidationError("Tanggal pendaftaran tidak valid.");
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime()))
    throw new ValidationError("Tanggal pendaftaran tidak valid.");
  return date;
}

export function previewRegistrationImport(
  rows: unknown,
  periodValue: unknown,
): ImportPreview {
  const period = validatePeriod(periodValue);
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > 2000) {
    throw new ValidationError(
      "Impor memerlukan 1 sampai 2000 baris per berkas.",
    );
  }
  const recognized = new Set(Object.values(aliases).flat().map(normalize));
  const ignoredColumns = [
    ...new Set(
      rows.flatMap((row: unknown) =>
        row && typeof row === "object" && !Array.isArray(row)
          ? Object.keys(row).filter((key) => !recognized.has(normalize(key)))
          : [],
      ),
    ),
  ];
  const preview: ImportPreview = {
    total: rows.length,
    valid: [],
    issues: [],
    ignoredColumns,
  };
  const seen = new Set<string>();
  rows.forEach((row: unknown, index: number) => {
    try {
      if (!row || typeof row !== "object" || Array.isArray(row))
        throw new ValidationError("Baris tidak valid.");
      const entries = Object.entries(row).map(([key, value]) => [
        normalize(key),
        typeof value === "string" || typeof value === "number"
          ? String(value).trim()
          : "",
      ]);
      const mapped = Object.fromEntries(
        Object.entries(aliases).map(([field, names]) => {
          const entry = entries.find(([key]) =>
            names.some((name) => normalize(name) === key),
          );
          return [field, entry?.[1] ?? ""];
        }),
      );
      const data = validateRegistration(mapped);
      if (seen.has(data.nim))
        throw new ValidationError(`NIM ${data.nim} berulang dalam berkas ini.`);
      const submittedAt = parseDate(mapped.submittedAt);
      const berkas = mapped.berkas ? mapped.berkas.slice(0, 255) : null;
      seen.add(data.nim);
      preview.valid.push({ ...data, period, submittedAt, berkas });
    } catch (error) {
      if (!(error instanceof ValidationError)) throw error;
      preview.issues.push({ row: index + 2, message: error.message });
    }
  });
  return preview;
}
