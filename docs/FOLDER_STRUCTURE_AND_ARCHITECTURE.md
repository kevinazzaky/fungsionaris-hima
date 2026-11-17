# Struktur dan arsitektur

Program kerja menggunakan domain/validasi `programs`, use case simpan/hapus, repository Prisma dan loader publik tersendiri. API admin memeriksa akses sebelum mutasi. Beranda dan halaman Program Kerja menerima DTO serializable; pemetaan ikon dan pengelompokan periode dilakukan pada lapisan presentasi. Data awal dikelola oleh `db:seed-programs` dan tidak dipakai sebagai fallback untuk database yang sudah dikonfigurasi tetapi kosong.

| Lapisan | Lokasi | Tanggung jawab |
| --- | --- | --- |
| Domain | `src/domain` | Entity, kontrak repository/storage, validasi, normalisasi data spreadsheet |
| Use cases | `src/use-cases` | Migrasi CLI, pendaftaran, penyusunan data surat, penggantian/penghapusan media, pembacaan konten publik |
| Data | `src/data` | Prisma, implementasi repository, Supabase Auth/Storage, pemilihan konten awal |
| Presentation | `src/app`, `src/components` | Halaman, form, API transport, cookie/Origin guard dan penyajian hasil |

Domain tidak mengimpor Next.js, Prisma, Supabase, atau komponen. Use cases menerima kontrak domain; API menyusun implementasi konkret dan memeriksa akses sebelum memanggilnya. Prisma Client dihasilkan ke `src/generated/prisma`, tidak disimpan di Git dan tidak diimpor komponen client.

`loadPublicContent` mengambil snapshot dari repository untuk server-rendered page. Snapshot dikirim sebagai props/context ke bagian fungsionaris dan galeri yang interaktif. Jika `DATABASE_URL` belum ada, data awal dari source tetap dipakai. Setelah database dikonfigurasi, query dijalankan saat request; data kosong benar-benar tampil kosong dan tidak menghidupkan kembali konten yang telah dihapus.

Foto lama di `public/gallery` tetap dapat dipakai. Foto baru disimpan pada bucket publik dan dioptimalkan oleh Sharp. Penggantian foto menyimpan metadata baru sebelum membersihkan object lama. Jika database gagal, object baru dibersihkan. Jika pembersihan object gagal setelah metadata berhasil disimpan, data tetap aman dan kegagalan dicatat untuk pembersihan manual.

Admin mempunyai layout tersendiri tanpa navbar/footer publik. Server layout memeriksa akun; semua API juga memeriksa akses sendiri. Proxy memperbarui cookie sesi sebelum request diteruskan. Role admin disimpan dalam tabel server, tidak berasal dari metadata pengguna yang dapat diedit.

`scripts/import-registrations.ts` menjalankan migrasi operasional tanpa route impor aplikasi. Detail pendaftar memanggil use case penyusunan surat, lalu UI memakai `RegistrationPrintDocument` yang juga digunakan formulir publik. Portal ke body menjaga dokumen tetap terlihat ketika area admin disembunyikan pada media cetak.

## Pendaftaran peserta program kerja

Fitur pendaftaran peserta program kerja internal mengikuti pemisahan lapisan yang sama:

- **Domain** (`src/domain/programs.ts`, `src/domain/program-registrations.ts`): `validateProgram` memvalidasi `registrationMode` (`external` atau `internal`), `registrationGroupLink`, dan `registrationMaxQuota`, serta hanya mewajibkan `gformLink` ketika `status === "open"` pada mode `external`. `src/domain/program-registrations.ts` mendefinisikan kontrak `ProgramRegistrationRepository`, error domain (`ConflictError`, `NotFoundError`), `validateProgramRegistrationInput` untuk form publik, dan `validateProgramRegistrationAdminUpdate` untuk edit admin.
- **Use cases** (`src/use-cases/register-program.ts`, `src/use-cases/manage-program-registrations.ts`): `registerProgram` memeriksa program terbit, mode `internal`, status `open`, kuota maksimal, serta menerjemahkan konflik unik menjadi `ConflictError`. `manage-program-registrations.ts` menyediakan daftar terfilter (`programId`, `q`), agregasi jumlah peserta per program, edit, dan hapus data pendaftar.
- **Data** (`src/data/repositories/program-registrations.ts`, `src/data/repositories/programs.ts`, `src/data/programs.ts`): `programRegistrationRepository.create` menjalankan transaksi dengan `SELECT ... FOR UPDATE OF p` untuk mencegah penerimaan melebihi kuota saat permintaan bersamaan. `programRepository.delete` mengubah error foreign key `P2003` menjadi pesan `ValidationError` yang menjelaskan program sudah memiliki pendaftar. Loader `loadPrograms` dan `loadProgramRegistrationPage` menghapus `registrationGroupLink` sebelum merender halaman publik.
- **Presentation & API** (`src/app/program-kerja/[id]/daftar/page.tsx`, `src/components/programs/program-registration-form.tsx`, `src/components/home/program-modal.tsx`, `src/components/detail/program-period-tabs.tsx`, `src/components/admin/programs-manager.tsx`, `src/components/admin/program-registrations-manager.tsx`, `src/app/api/program-registrations/route.ts`, `src/app/api/admin/program-registrations/**`, `src/lib/program-registrations-api.ts`, `src/lib/program-registrations-export.ts`): route `/program-kerja/[id]/daftar` menampilkan ringkasan kegiatan dan formulir peserta (terhubung dari modal beranda dan halaman `/program-kerja`), serta mencetak bukti pendaftaran lewat portal `document.body` karena `globals.css` menyembunyikan `<main>` saat `@media print`. Endpoint `POST /api/program-registrations` (tanpa `GET` publik) dan endpoint admin memeriksa origin, UUID, batas payload (`16 KB` publik, `32 KB` admin), serta sesi admin. Ekspor Excel menghasilkan lembar `Peserta Program` berzona waktu `Asia/Makassar` (WITA) dengan sanitasi karakter awal formula (`sanitizeSpreadsheetText`).
