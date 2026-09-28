import * as XLSX from "xlsx";
import { getAllPendaftaran } from "@/lib/pendaftaran-store";

export async function GET(request: Request) {
  // ── Proteksi: hanya yang punya key bisa download ──────────────────────────
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  const validKey = process.env.EXPORT_SECRET_KEY;

  if (!validKey || key !== validKey) {
    return new Response(
      JSON.stringify({ error: "Akses ditolak. Key tidak valid." }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
  // ─────────────────────────────────────────────────────────────────────────

  const data = getAllPendaftaran();

  if (data.length === 0) {
    return new Response(
      JSON.stringify({ error: "Belum ada data pendaftaran." }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const rows = data.map((d, i) => ({
    No: i + 1,
    Nama: d.nama,
    NIM: d.nim,
    Angkatan: d.angkatan,
    "Tempat, Tgl Lahir": d.tempatTanggalLahir || "-",
    "Jenis Kelamin": d.jenisKelamin || "-",
    Alamat: d.alamat || "-",
    "No. HP / WA": d.noHp || "-",
    "ID Line": d.idLine || "-",
    "Pengalaman Organisasi": d.pengalamanOrganisasi || "-",
    "Minat dan Skill": d.minatSkill || "-",
    "Alasan Bergabung": d.alasanBergabung || "-",
    "Pilihan Divisi": d.divisi || "-",
    "Alasan Divisi": d.alasanDivisi || "-",
    Berkas: d.berkas || "-",
    "Ukuran Berkas": d.berkasSize ? `${(d.berkasSize / 1024).toFixed(1)} KB` : "-",
    "Waktu Daftar": new Date(d.submittedAt).toLocaleString("id-ID"),
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  ws["!cols"] = [
    { wch: 5 },
    { wch: 25 },
    { wch: 15 },
    { wch: 10 },
    { wch: 24 },
    { wch: 14 },
    { wch: 30 },
    { wch: 16 },
    { wch: 16 },
    { wch: 30 },
    { wch: 30 },
    { wch: 35 },
    { wch: 24 },
    { wch: 35 },
    { wch: 20 },
    { wch: 15 },
    { wch: 22 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Pendaftaran");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new Response(buf, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="pendaftaran-hima-ti-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
