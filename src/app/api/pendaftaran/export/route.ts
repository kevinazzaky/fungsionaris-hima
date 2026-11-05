import * as XLSX from "xlsx";
import { requireAdmin } from "@/data/auth";
import { registrationRepository } from "@/data/repositories/registrations";
import { apiError } from "@/lib/api-response";

export async function GET() {
  try {
    await requireAdmin();
    const data = await registrationRepository.exportAll();

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
      Periode: d.period,
      Sumber: d.source,
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
      "Ukuran Berkas": d.berkasSize
        ? `${(d.berkasSize / 1024).toFixed(1)} KB`
        : "-",
      "Waktu Daftar (WITA)": d.submittedAt
        ? d.submittedAt.toLocaleString("id-ID", { timeZone: "Asia/Makassar" })
        : "Tidak tercatat",
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    ws["!cols"] = [
      { wch: 5 },
      { wch: 25 },
      { wch: 15 },
      { wch: 10 },
      { wch: 14 },
      { wch: 18 },
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
  } catch (error) {
    return apiError(error);
  }
}
