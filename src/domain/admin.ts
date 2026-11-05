export const MEMBER_GROUPS = {
  pembina: "Pembina",
  pimpinan: "Pimpinan Himpunan",
  sekretariat: "Sekretariat",
  bendahara: "Bendahara",
  delegasi: "Delegasi",
  hh: "Divisi HH",
  psdm: "Divisi PSDM",
  kominfo: "Divisi Kominfo",
} as const;

export type MemberGroup = keyof typeof MEMBER_GROUPS;

export type MemberInput = {
  name: string;
  role: string;
  group: MemberGroup;
  sortOrder: number;
  isPublished: boolean;
};

export type Member = MemberInput & {
  id: string;
  photoPath: string | null;
  photo?: string;
};
export type GalleryInput = {
  title: string;
  alt: string;
  sortOrder: number;
  isPublished: boolean;
};
export type GalleryPhoto = GalleryInput & {
  id: string;
  imagePath: string;
  imageUrl: string;
};

export type RegistrationInput = {
  nama: string;
  nim: string;
  angkatan: string;
  tempatTanggalLahir: string;
  jenisKelamin: string;
  alamat: string;
  noHp: string;
  idLine: string;
  pengalamanOrganisasi: string;
  minatSkill: string;
  alasanBergabung: string;
  divisi: string;
  alasanDivisi: string;
};

export type ImportedRegistration = RegistrationInput & {
  period: string;
  submittedAt: Date | null;
  berkas: string | null;
};

export type Registration = ImportedRegistration & {
  id: string;
  berkasPath: string | null;
  berkasSize: number | null;
  source: "web" | "spreadsheet";
};

export type RegistrationSummary = Pick<
  Registration,
  | "id"
  | "nama"
  | "nim"
  | "angkatan"
  | "divisi"
  | "period"
  | "source"
  | "submittedAt"
>;

export type ImportIssue = { row: number; message: string };
export type ImportPreview = {
  total: number;
  valid: ImportedRegistration[];
  issues: ImportIssue[];
  ignoredColumns: string[];
};

export class ValidationError extends Error {}

export function text(
  value: unknown,
  label: string,
  max = 300,
  required = true,
): string {
  if (typeof value !== "string") {
    if (!required && (value === null || value === undefined)) return "";
    throw new ValidationError(`${label} harus berupa teks.`);
  }
  const result = value.trim();
  if (required && !result) throw new ValidationError(`${label} wajib diisi.`);
  if (result.length > max)
    throw new ValidationError(`${label} maksimal ${max} karakter.`);
  return result;
}

function sortOrder(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 10000
  ) {
    throw new ValidationError(
      "Urutan harus berupa bilangan bulat antara 0 dan 10000.",
    );
  }
  return value;
}

function published(value: unknown): boolean {
  if (typeof value !== "boolean")
    throw new ValidationError("Status publikasi tidak valid.");
  return value;
}

export function validateMember(data: Record<string, unknown>): MemberInput {
  const group = text(data.group, "Kelompok");
  if (!Object.hasOwn(MEMBER_GROUPS, group))
    throw new ValidationError("Kelompok tidak dikenal.");
  return {
    name: text(data.name, "Nama", 150),
    role: text(data.role, "Jabatan", 150),
    group: group as MemberGroup,
    sortOrder: sortOrder(data.sortOrder),
    isPublished: published(data.isPublished),
  };
}

export function validateGallery(data: Record<string, unknown>): GalleryInput {
  return {
    title: text(data.title, "Judul", 150),
    alt: text(data.alt, "Deskripsi foto", 300),
    sortOrder: sortOrder(data.sortOrder),
    isPublished: published(data.isPublished),
  };
}

export function validateRegistration(
  data: Record<string, unknown>,
): RegistrationInput {
  const nim = text(data.nim, "NIM", 30);
  if (!/^\d{5,30}$/.test(nim))
    throw new ValidationError("NIM harus berisi 5 sampai 30 digit angka.");
  const angkatan = text(data.angkatan, "Angkatan", 4);
  if (!/^(19|20)\d{2}$/.test(angkatan))
    throw new ValidationError("Angkatan harus berupa tahun empat digit.");
  const result: RegistrationInput = {
    nama: text(data.nama, "Nama", 150),
    nim,
    angkatan,
    tempatTanggalLahir: text(
      data.tempatTanggalLahir,
      "Tempat/tanggal lahir",
      200,
      false,
    ),
    jenisKelamin: text(data.jenisKelamin, "Jenis kelamin", 50, false),
    alamat: text(data.alamat, "Alamat", 1000, false),
    noHp: text(data.noHp, "Nomor HP", 50, false),
    idLine: text(data.idLine, "ID LINE", 100, false),
    pengalamanOrganisasi: text(
      data.pengalamanOrganisasi,
      "Pengalaman organisasi",
      5000,
      false,
    ),
    minatSkill: text(data.minatSkill, "Minat dan skill", 5000, false),
    alasanBergabung: text(
      data.alasanBergabung,
      "Alasan bergabung",
      5000,
      false,
    ),
    divisi: text(data.divisi, "Pilihan divisi", 300),
    alasanDivisi: text(data.alasanDivisi, "Alasan divisi", 5000, false),
  };
  return result;
}

export function validatePeriod(value: unknown): string {
  const period = text(value, "Periode", 20);
  if (!/^\d{4}(?:[/-]\d{4})?$/.test(period))
    throw new ValidationError("Periode harus berupa 2026 atau 2025/2026.");
  return period;
}
