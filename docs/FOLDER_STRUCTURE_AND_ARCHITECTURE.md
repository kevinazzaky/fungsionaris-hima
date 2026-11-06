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
