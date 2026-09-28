// In-memory store for pendaftaran submissions and Google Sheets synchronization

export type Pendaftaran = {
  id: string;
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
  berkas?: string; // filename
  berkasSize?: number;
  submittedAt: string;
};

// Module-level store (persists across requests in dev, resets on restart)
const store: Pendaftaran[] = [];

export function addPendaftaran(
  data: Omit<Pendaftaran, "id" | "submittedAt">,
): Pendaftaran {
  const entry: Pendaftaran = {
    ...data,
    id: crypto.randomUUID(),
    submittedAt: new Date().toISOString(),
  };
  store.push(entry);
  return entry;
}

export function getAllPendaftaran(): Pendaftaran[] {
  return [...store];
}
