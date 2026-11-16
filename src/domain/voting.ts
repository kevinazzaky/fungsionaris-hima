import { ValidationError, text } from "./admin";

export type CandidateProgram = {
  title: string;
  description: string;
  target: string;
};
export type CandidateInput = {
  name: string;
  vision: string;
  missions: string[];
  programs: CandidateProgram[];
};
export type VotingCandidate = CandidateInput & {
  id: string;
  number: number;
  photo: string | null;
  placeholder: boolean;
};
export type VotingElection = {
  id: string;
  period: string;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  candidates: VotingCandidate[];
};
export type VotingState = "draft" | "upcoming" | "open" | "ended" | "closed";
export type VotingPublicData = {
  election: VotingElection | null;
  available: boolean;
  error?: string;
};
export const NIM_ONLY_WARNING =
  "Nama dan NIM bukan bukti identitas. Orang yang mengetahui pasangan nama dan NIM mahasiswa lain dapat menyalahgunakan hak pilihnya.";

export function normalizeNim(value: unknown) {
  const nim = text(value, "NIM", 30);
  if (!/^\d{8}$/.test(nim))
    throw new ValidationError("NIM harus berisi tepat 8 angka.");
  return nim;
}

export function filterVoterNameInput(value: string) {
  return value.replace(/[^\p{L}\p{M} .]/gu, "");
}

export function normalizeVoterName(value: unknown) {
  if (typeof value !== "string" || value.length > 100 ||
      filterVoterNameInput(value) !== value ||
      !/^\p{L}[\p{L}\p{M} .]*$/u.test(value.trim()))
    throw new ValidationError("Nama hanya boleh berisi huruf, spasi, dan titik, 2–100 karakter.");
  const name = value.trim().normalize("NFC").replace(/ +/g, " ");
  if (name.length < 2)
    throw new ValidationError("Nama hanya boleh berisi huruf, spasi, dan titik, 2–100 karakter.");
  return name;
}

export function electionState(
  e: Pick<VotingElection, "status" | "startsAt" | "endsAt">,
  now = new Date(),
): VotingState {
  if (e.status === "closed") return "closed";
  if (e.status !== "scheduled" || !e.startsAt || !e.endsAt) return "draft";
  if (now.getTime() < new Date(e.startsAt).getTime()) return "upcoming";
  if (now.getTime() >= new Date(e.endsAt).getTime()) return "ended";
  return "open";
}

export const votingStateLabels: Record<VotingState, string> = {
  draft: "Belum dibuka",
  upcoming: "Belum dimulai",
  open: "Pemungutan suara dibuka",
  ended: "Waktu pemungutan berakhir",
  closed: "Pemilihan telah ditutup",
};

export function parseVotingSchedule(start: unknown, end: unknown) {
  const parse = (value: unknown) => {
    if (
      typeof value !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
    )
      throw new ValidationError("Jadwal WITA tidak valid.");
    const local = new Date(`${value}:00Z`);
    if (
      !Number.isFinite(local.getTime()) ||
      local.toISOString().slice(0, 16) !== value
    )
      throw new ValidationError("Jadwal WITA tidak valid.");
    return new Date(local.getTime() - 8 * 60 * 60_000);
  };
  const startsAt = parse(start),
    endsAt = parse(end);
  if (endsAt <= startsAt)
    throw new ValidationError("Akhir pemilihan harus setelah awal.");
  return { startsAt, endsAt };
}

export function validateCandidate(
  data: Record<string, unknown>,
): CandidateInput {
  if (
    !Array.isArray(data.missions) ||
    !data.missions.length ||
    data.missions.length > 20
  )
    throw new ValidationError("Isi 1–20 misi.");
  if (!Array.isArray(data.programs) || data.programs.length > 20)
    throw new ValidationError("Program kerja maksimal 20 judul.");
  return {
    name: text(data.name, "Nama", 150),
    vision: text(data.vision, "Visi", 5000),
    missions: data.missions.map((m) => text(m, "Misi", 2000)),
    programs: data.programs.map((p) => {
      if (!p || typeof p !== "object" || Array.isArray(p))
        throw new ValidationError("Program tidak valid.");
      return {
        title: text(p.title, "Judul program", 150),
        description: text(p.description, "Deskripsi program", 5000, false),
        target: text(p.target, "Sasaran program", 1000, false),
      };
    }),
  };
}

export function assertVotingCandidatesReady(
  candidates: {
    name: string;
    vision: string;
    missions: string[];
    programs: unknown;
    photoPath: string | null;
  }[],
) {
  if (!candidates.length)
    throw new ValidationError(
      "Tambahkan kandidat sebelum mengonfirmasi jadwal.",
    );
  for (const candidate of candidates) {
    validateCandidate({
      name: candidate.name,
      vision: candidate.vision,
      missions: candidate.missions,
      programs: candidate.programs,
    });
    if (!candidate.photoPath)
      throw new ValidationError(
        "Lengkapi foto semua kandidat sebelum mengonfirmasi jadwal.",
      );
  }
}

function csvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    value = "",
    quoted = false,
    closed = false;
  const source = csv.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (quoted) {
      if (c === '"' && source[i + 1] === '"') {
        value += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
        closed = true;
      } else value += c;
    } else if (c === '"' && !value && !closed) quoted = true;
    else if (c === "," || c === "\n") {
      row.push(value.trim());
      value = "";
      closed = false;
      if (c === "\n") {
        if (row.some(Boolean)) rows.push(row);
        row = [];
      }
    } else {
      if (closed || c === '"') throw new ValidationError("CSV tidak valid.");
      value += c;
    }
  }
  if (quoted) throw new ValidationError("Tanda kutip CSV tidak ditutup.");
  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

export function parseVoterCsv(csv: string, period: string) {
  if (
    typeof csv !== "string" ||
    new TextEncoder().encode(csv).byteLength > 512_000
  )
    throw new ValidationError("CSV maksimal 500 KB.");
  const [headers, ...rows] = csvRows(csv);
  const withNames = headers?.join(",") === "nim,nama,prodi,aktif,periode";
  if (!headers || (!withNames && headers.join(",") !== "nim,prodi,aktif,periode"))
    throw new ValidationError("Header CSV harus nim,nama,prodi,aktif,periode.");
  if (!rows.length || rows.length > 5000)
    throw new ValidationError("Isi 1–5000 baris per impor.");
  const nims: string[] = [],
    seen = new Set<string>(),
    issues: { row: number; message: string }[] = [];
  const voters: { nim: string; name: string | null }[] = [];
  rows.forEach((r, index) => {
    try {
      if (r.length !== (withNames ? 5 : 4))
        throw new ValidationError("Jumlah kolom tidak sesuai.");
      const nim = normalizeNim(r[0]);
      const name = withNames ? normalizeVoterName(r[1]) : null;
      const offset = withNames ? 1 : 0;
      if (r[1 + offset] !== "TI" || r[2 + offset] !== "true" || r[3 + offset] !== period)
        throw new ValidationError(
          "Wajib mahasiswa aktif TI pada periode yang dipilih.",
        );
      if (seen.has(nim))
        throw new ValidationError("NIM duplikat dalam berkas.");
      seen.add(nim);
      nims.push(nim);
      voters.push({ nim, name });
    } catch (e) {
      issues.push({
        row: index + 2,
        message:
          e instanceof ValidationError ? e.message : "Baris tidak valid.",
      });
    }
  });
  return { total: rows.length, nims, voters, issues };
}
