# Dokumentasi pengembangan HIMA TI

Buka/tutup penerimaan fungsionaris tersedia di **Admin → Pendaftar**. Status disimpan di Supabase, berlaku pada halaman publik dan API, serta tidak memerlukan perubahan kode/deploy. Data pendaftar yang sudah ada tetap dapat dikelola saat penerimaan ditutup.

Navigasi admin pada mobile/tablet dibuka dari tombol **Menu**; layar tidak lagi diawali seluruh daftar sidebar. Mulai lebar 1100 px, sidebar tetap terlihat di kiri.

Program kerja dikelola melalui `/admin/program-kerja` dengan tiga tab: **Daftar program** (tab periode, tambah periode, tampil/sembunyi seluruh periode, CRUD program melalui dialog ringkas, status/mode pendaftaran eksternal atau formulir website, pintasan **Atur formulir**, urutan, publikasi dan foto dengan preview), **Atur formulir** (`?tab=formulir`, pengaturan status akses, kuota, tautan grup peserta, kotak tautan `/program-kerja/[id]/daftar`, kolom bawaan formulir serta hingga 20 pertanyaan tambahan custom per program internal, reset perubahan, konfirmasi perubahan belum disimpan, dan simpan lewat `PATCH /api/admin/programs/[id]/form`), dan **Peserta proker** (`?tab=peserta`, filter program, pencarian, detail/edit termasuk jawaban custom dan data terdahulu, hapus dengan konfirmasi, serta ekspor `.xlsx` berkolom dinamis). Program mode internal membuka formulir peserta publik pada `/program-kerja/[id]/daftar`. Setup baru menjalankan `npm run db:seed-programs` setelah migration; beranda dan `/program-kerja` memakai filter publikasi periode dan program yang sama.

Galeri dan Hero beranda dikelola melalui tab di `/admin/galeri`; tab Hero dapat dibuka langsung dengan `?tab=hero`. URL lama `/admin/hero` diarahkan ke tab tersebut. Tiga foto hero awal tersimpan di Supabase Storage, sementara database hanya menyimpan metadata dan path. Setup baru menjalankan `npm run db:seed-hero` setelah migration. Foto opsional calon pendaftar belum disimpan ke Storage; fitur itu merupakan pekerjaan terpisah dari pengelolaan hero.

- [Setup Supabase, Prisma, dan deployment](INFRASTRUCTURE_AND_CICD.md)
- [Skema database dan migrasi data lama](DATABASE_SCHEMA.md)
- [Struktur dan arsitektur](FOLDER_STRUCTURE_AND_ARCHITECTURE.md)
- [Workflow Git](GITFLOW_AND_CONVENTIONS.md)
- [Pedoman agen](AI_AGENT_GUIDELINES.md)
- [Arah tampilan admin](ADMIN_DESIGN.md)
- [Hasil QA dan batas verifikasi](QA_ADMIN.md)
- [QA dan checklist operasional pendaftaran program kerja](QA_PROGRAM_REGISTRATIONS.md)

Skema Supabase sudah dimigrasikan dan konten awal berisi 28 fungsionaris serta 36 foto galeri sudah dimasukkan setelah persetujuan pemilik. Empat pendaftar dari XLSX asli sudah tersimpan dan diverifikasi. Admin bisa mencetak ulang formulir dan surat pernyataan melalui Detail pendaftar; fitur impor di aplikasi sudah dihapus. Akun institusi HIMA sudah aktif; ganti password tersedia di `/admin/akun`. Setup bucket dan pengujian upload cloud masih perlu dilakukan. Website publik memakai konten awal jika `DATABASE_URL` belum valid. Data pendaftaran tidak disimpan sementara di memori atau diteruskan ke webhook lama.
