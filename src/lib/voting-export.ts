import * as XLSX from "xlsx";
import type { VotingDashboardData } from "../data/repositories/voting";
import { ValidationError } from "../domain/admin";

export function createVotingRecap(data: Pick<VotingDashboardData, "election" | "stats" | "results">) {
  const { election, stats, results } = data;
  if (!election || election.status !== "closed" || !stats || !results)
    throw new ValidationError("Rekap hanya tersedia setelah penutupan resmi.");
  const wb = XLSX.utils.book_new();
  const summary = XLSX.utils.aoa_to_sheet([
    ["Rekap Pemilihan Ketua HIMA TI Undiknas", ""],
    ["Periode", election.period],
    ["Status", "Ditutup"],
    ["Pemilih terdaftar", stats.total],
    ["Suara masuk", stats.ballots],
    ["Hak pilih terpakai", stats.consumed],
    ["Partisipasi", stats.total ? stats.ballots / stats.total : 0],
  ]);
  summary.B7.z = "0.0%";
  summary["!cols"] = [{ wch: 42 }, { wch: 22 }];
  const rows = election.candidates.filter(c => !c.placeholder).sort((a, b) => a.number - b.number).map(c => {
    const votes = results.find(r => r.candidateId === c.id)?._count._all || 0;
    return [c.number, c.name, votes, stats.ballots ? votes / stats.ballots : 0];
  });
  const candidates = XLSX.utils.aoa_to_sheet([["Nomor urut", "Nama kandidat", "Jumlah suara", "Persentase"], ...rows]);
  candidates["!cols"] = [{ wch: 12 }, { wch: 44 }, { wch: 16 }, { wch: 16 }];
  rows.forEach((_, i) => { candidates[`D${i + 2}`].z = "0.0%"; });
  XLSX.utils.book_append_sheet(wb, summary, "Ringkasan");
  XLSX.utils.book_append_sheet(wb, candidates, "Hasil kandidat");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
