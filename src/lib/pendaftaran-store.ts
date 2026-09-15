// Simple in-memory store for pendaftaran submissions
// In production, replace with a database

export type Pendaftaran = {
  id: string;
  nama: string;
  nim: string;
  angkatan: string;
  divisi: string;
  berkas: string; // filename
  berkasSize: number;
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
