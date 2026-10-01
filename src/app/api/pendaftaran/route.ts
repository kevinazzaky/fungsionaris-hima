import { addPendaftaran, getAllPendaftaran } from "@/lib/pendaftaran-store";
import { REGISTRATION_OPEN } from "@/lib/pendaftaran-config";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["application/pdf"];

export async function POST(request: Request) {
  try {
    if (!REGISTRATION_OPEN) {
      return Response.json(
        { error: "Pendaftaran saat ini sedang ditutup karena belum memasuki periode perekrutan." },
        { status: 403 },
      );
    }

    const formData = await request.formData();

    const nama = (formData.get("nama") as string)?.trim();
    const nim = (formData.get("nim") as string)?.trim();
    const angkatan = (formData.get("angkatan") as string)?.trim();
    const tempatTanggalLahir = (formData.get("tempatTanggalLahir") as string)?.trim() || "-";
    const jenisKelamin = (formData.get("jenisKelamin") as string)?.trim() || "-";
    const alamat = (formData.get("alamat") as string)?.trim() || "-";
    const noHp = (formData.get("noHp") as string)?.trim() || "-";
    const idLine = (formData.get("idLine") as string)?.trim() || "-";
    const pengalamanOrganisasi = (formData.get("pengalamanOrganisasi") as string)?.trim() || "-";
    const minatSkill = (formData.get("minatSkill") as string)?.trim() || "-";
    const alasanBergabung = (formData.get("alasanBergabung") as string)?.trim() || "-";
    const alasanDivisi = (formData.get("alasanDivisi") as string)?.trim() || "-";

    // Multiple divisi values
    const divisiValues = formData.getAll("divisi") as string[];
    const berkas = formData.get("berkas") as File | null;

    if (!nama || !nim || !angkatan) {
      return Response.json({ error: "Nama lengkap, NIM, dan Angkatan wajib diisi." }, { status: 400 });
    }

    if (divisiValues.length < 1) {
      return Response.json({ error: "Pilih minimal 1 divisi yang diminati." }, { status: 400 });
    }

    let berkasName = "";
    let berkasSize = 0;

    if (berkas && berkas.size > 0) {
      if (berkas.size > MAX_FILE_SIZE) {
        return Response.json({ error: "Ukuran berkas melebihi 10 MB." }, { status: 400 });
      }

      if (!ALLOWED_TYPES.includes(berkas.type)) {
        return Response.json(
          { error: "Tipe berkas tidak didukung. Harap unggah file berformat PDF." },
          { status: 400 },
        );
      }
      berkasName = berkas.name;
      berkasSize = berkas.size;
    }

    const divisiJoined = divisiValues.join(", ");

    const entry = addPendaftaran({
      nama,
      nim,
      angkatan,
      tempatTanggalLahir,
      jenisKelamin,
      alamat,
      noHp,
      idLine,
      pengalamanOrganisasi,
      minatSkill,
      alasanBergabung,
      divisi: divisiJoined,
      alasanDivisi,
      berkas: berkasName,
      berkasSize,
    });

    // ── Kirim ke Google Spreadsheet Webhook ──
    const DEFAULT_WEBHOOK_URL =
      "https://script.google.com/macros/s/AKfycbxpXV_zcvGmp4dDlaC165zYCMeUXlHw6zgOv8lYmwkohPGAiIHnfHdVrqZjg0Nzc7E8/exec";
    const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL || DEFAULT_WEBHOOK_URL;

    if (webhookUrl) {
      try {
        const sheetResponse = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          redirect: "follow",
          signal: AbortSignal.timeout(10000),
          body: JSON.stringify({
            timestamp: new Date().toISOString(),
            nama,
            nim,
            angkatan,
            tempatTanggalLahir,
            jenisKelamin,
            alamat,
            noHp,
            idLine,
            pengalamanOrganisasi,
            minatSkill,
            alasanBergabung,
            divisi: divisiJoined,
            alasanDivisi,
            berkas: berkasName,
          }),
        });

        if (!sheetResponse.ok) {
          console.error(
            `Google Sheets webhook error: status ${sheetResponse.status} ${sheetResponse.statusText}`,
          );
        } else {
          console.log("Data pendaftaran berhasil diteruskan ke Google Sheets Webhook.");
        }
      } catch (err) {
        console.error("Gagal mengirim data ke Google Sheets Webhook:", err);
        // Tetap lanjutkan respons berhasil karena data tersimpan lokal
      }
    }

    return Response.json({ success: true, id: entry.id, data: entry }, { status: 201 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Terjadi kesalahan server." }, { status: 500 });
  }
}

export async function GET() {
  const data = getAllPendaftaran();
  return Response.json(data);
}
