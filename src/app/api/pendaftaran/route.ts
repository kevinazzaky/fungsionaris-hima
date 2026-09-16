import { addPendaftaran, getAllPendaftaran } from "@/lib/pendaftaran-store";
import { REGISTRATION_OPEN } from "@/lib/pendaftaran-config";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
  "application/pdf",
];

export async function POST(request: Request) {
  try {
    if (!REGISTRATION_OPEN) {
      return Response.json(
        { error: "Pendaftaran saat ini sedang ditutup karena belum memasuki periode perekrutan." },
        { status: 403 },
      );
    }

    const formData = await request.formData();

    const nama = formData.get("nama") as string;
    const nim = formData.get("nim") as string;
    const angkatan = formData.get("angkatan") as string;
    // Multiple divisi values
    const divisiValues = formData.getAll("divisi") as string[];
    const berkas = formData.get("berkas") as File | null;

    if (!nama || !nim || !angkatan) {
      return Response.json({ error: "Semua field wajib diisi." }, { status: 400 });
    }

    if (divisiValues.length < 2) {
      return Response.json({ error: "Pilih minimal 2 divisi." }, { status: 400 });
    }

    if (!berkas || berkas.size === 0) {
      return Response.json({ error: "Berkas wajib diunggah." }, { status: 400 });
    }

    if (berkas.size > MAX_FILE_SIZE) {
      return Response.json({ error: "Ukuran berkas melebihi 10 MB." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(berkas.type)) {
      return Response.json(
        { error: "Tipe berkas tidak didukung. Harap unggah file berformat PDF." },
        { status: 400 },
      );
    }

    const entry = addPendaftaran({
      nama,
      nim,
      angkatan,
      divisi: divisiValues.join(", "),
      berkas: berkas.name,
      berkasSize: berkas.size,
    });

    return Response.json({ success: true, id: entry.id }, { status: 201 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Terjadi kesalahan server." }, { status: 500 });
  }
}

export async function GET() {
  const data = getAllPendaftaran();
  return Response.json(data);
}
