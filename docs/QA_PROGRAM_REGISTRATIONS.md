# QA dan checklist operasional pendaftaran program kerja

Catatan ini merangkum hasil verifikasi teknis fitur pendaftaran peserta program kerja internal (`/program-kerja/[id]/daftar` dan `/admin/program-kerja`), checklist migrasi manual, serta panduan penyiapan **IT Versary & Sertijab 2026**.

## 1. Peringatan keamanan database

Jangan menggunakan `DATABASE_URL`, `DIRECT_URL`, atau kredensial project Supabase produksi saat menjalankan pengujian lokal, preview PR, atau staging. Perintah migrasi (`npm run db:migrate`), seeding (`npm run db:seed-programs`), maupun uji coba formulir di browser/panel admin lokal akan langsung menulis atau mengubah isi database tujuan yang terhubung pada `.env.local` atau Environment Variables deployment.

Gunakan project Supabase/PostgreSQL staging yang terpisah untuk seluruh pengujian manual sebelum rilis.

## 2. Verifikasi otomatis dan PGlite

Pada audit cabang `feat/pendaftaran-proker` tanggal 17 November 2026, pemeriksaan berikut berjalan dengan hasil lulus:

| Pemeriksaan | Hasil | Cakupan |
| --- | --- | --- |
| `npm run db:validate` dan `npm run db:generate` | Lulus | Validasi skema `prisma/schema.prisma` dan generasi Prisma Client |
| `npx next typegen` dan `npx tsc --noEmit` | Lulus | Pemeriksaan tipe Next.js dan TypeScript |
| `npm run lint` | Lulus | Pemeriksaan ESLint |
| `npm run build` | Lulus | Build produksi (kondisi default dan env DB/Supabase kosong: 38 halaman statis beserta route dinamis) |
| `npm test` | Lulus (`143/143`) | Validasi domain/use case (`tests/program-registrations.test.ts`, `tests/programs.test.ts`), API/ekspor `.xlsx` (`tests/program-registrations-api.test.ts`), komponen UI (`tests/program-registration-ui.test.ts`, `tests/admin-program-registrations-ui.test.ts`), serta SQL PGlite (`tests/database.test.ts`) |
| Uji SQL PGlite `FOR UPDATE OF p` | Lulus | Verifikasi sintaks penguncian baris program dalam transaksi pada engine PGlite |
| Smoke test `next start` (tanpa env backend) | Lulus | `/` (`200`), `/program-kerja` (`200`), `/program-kerja/program-2025-2026-4/daftar` (`200`), `/api/admin/programs` (`401`), `GET /api/program-registrations` (`405`), `POST` cross-origin (`403`), `POST` same-origin (`503`) |

Rincian verifikasi migrasi dan RLS pada `tests/database.test.ts` terhadap `prisma/migrations/20261117000000_program_registrations/migration.sql`:

- Tabel `ProgramRegistration` memiliki `relrowsecurity = true` (`ENABLE ROW LEVEL SECURITY`), dan hak akses `anon`, `authenticated`, serta `PUBLIC` dicabut (`REVOKE ALL`).
- Program yang sudah ada sebelumnya otomatis menerima nilai default `registrationMode = 'external'`, `registrationGroupLink = ''`, dan `registrationMaxQuota = null`.
- Constraint `Program_registrationMaxQuota_check` menolak nilai kuota di bawah `1`.
- Indeks unik `(programId, nim)` menolak NIM ganda pada program yang sama, namun mengizinkan NIM yang sama mendaftar pada program kerja berbeda.
- Foreign key `ProgramRegistration_programId_fkey` memakai `ON DELETE RESTRICT`, sehingga penghapusan `Program` yang masih memiliki peserta ditolak database.

### Temuan audit dan batas pengujian yang perlu dicek ulang

Audit kode dan `next start` pada 17 November 2026 mencatat tiga temuan yang wajib diverifikasi ulang setelah perbaikannya digabungkan, ditambah batas pengujian lingkungan nyata:

1. **Respon 401 endpoint admin baru pada `next start` produksi**: tanpa perbaikan nama error `AccessError` di `src/data/auth.ts` atau pemeriksaan `instanceof AccessError`, build produksi yang terminifikasi mengembalikan HTTP `500` alih-alih `401` pada `/api/admin/program-registrations`, `/api/admin/program-registrations/[id]`, dan `/api/admin/program-registrations/export`. Pastikan seluruh endpoint ini mengembalikan `401` saat tidak terautentikasi pada build `next start` final.
2. **Status HTTP ID tidak ditemukan pada `/program-kerja/[id]/daftar`**: permintaan ke ID yang tidak ada menampilkan judul tidak ditemukan dan tag `noindex`, namun dapat tetap mengirim HTTP `200` pada streaming respons dinamis. Pastikan `generateMetadata` memanggil `notFound()` saat program tidak ditemukan atau belum dipublikasikan.
3. **Pratinjau foto saat dialog editor program tetap terbuka**: saat mengubah program dari `external` ke `internal` sekaligus mengunggah foto baru di `src/components/admin/programs-manager.tsx`, pastikan state pratinjau file sementara (`"(belum disimpan)"`) dibersihkan setelah simpan berhasil.
4. **Cakupan PostgreSQL nyata dan browser terautentikasi**: PGlite berjalan dalam satu proses/engine dan tidak menggantikan uji multi-koneksi transaksi `FOR UPDATE OF p` di PostgreSQL sungguhan. Alur submit publik, login admin, tab **Peserta proker**, edit/hapus peserta, dan unduh file `.xlsx` di browser perlu diverifikasi pada database staging yang sudah dimigrasi.

## 3. Checklist migrasi manual (staging ke produksi)

1. Buat backup atau snapshot database target sebelum menerapkan migrasi.
2. Tinjau isi SQL pada `prisma/migrations/20261117000000_program_registrations/migration.sql` dan pastikan tidak ada migrasi tertunda lain yang belum ditinjau.
3. Pastikan environment CLI (`DATABASE_URL` dan `DIRECT_URL`) mengarah ke database staging terlebih dahulu, bukan produksi.
4. Jalankan perintah berikut secara berurutan (jangan memakai `prisma db push` pada database staging/produksi):

```sh
npm run db:validate
npm run db:generate
npm run db:migrate
```

5. Periksa langsung di SQL Editor atau client database target bahwa:
   - Kolom `registrationMode`, `registrationGroupLink`, dan `registrationMaxQuota` ada pada tabel `"Program"`.
   - Tabel `"ProgramRegistration"` ada dengan `relrowsecurity = true` dan tanpa izin `SELECT`/`INSERT`/`UPDATE`/`DELETE` bagi `anon` maupun `authenticated`.
6. Jalankan ulang `npm run build` dan uji server terautentikasi pada staging sebelum menerapkan langkah yang sama ke produksi.

## 4. Checklist operasional: Setup IT Versary & Sertijab 2026

Pada kode seed (`src/lib/program-seed.ts`), entri **IT Versary & Sertijab 2026** untuk periode `2025/2026` sudah disetel ke `registrationMode: "internal"` dan `status: "open"`. Pada database baru, `npm run db:seed-programs` (`scripts/seed-programs.ts`) membuat record tersebut dengan UUID deterministik dari `program-2025-2026-4`, tanpa menimpa program yang sudah pernah dikelola admin.

Untuk menyiapkan atau memperbarui kegiatan melalui panel admin:

1. Masuk ke `/admin/login` lalu buka menu **Program kerja** (`/admin/program-kerja`).
2. Pada tab **Daftar program**, pilih tab periode **2025/2026** (gunakan **Tambah periode** jika periode belum tersedia).
3. Klik **Edit** pada **IT Versary & Sertijab 2026** (atau klik **Tambah program** bila program belum ada di database).
4. Atur **Status pendaftaran** ke **Pendaftaran Dibuka** (`open`) dan pilih **Mode pendaftaran** ke **Formulir Website (Internal)** (`internal`).
5. Isi **Kuota maksimal peserta (opsional)** dengan angka bulat minimal `1` bila panitia membatasi kuota, atau kosongkan jika tanpa batas.
6. Isi **Tautan grup WA/LINE peserta (opsional)** dengan URL `http://` atau `https://` yang valid bila panitia ingin menampilkan tombol gabung grup setelah formulir berhasil dikirim. Tautan ini disembunyikan dari pembacaan halaman sebelum submit.
7. Pastikan **Tampilkan di website** pada dialog program dan tombol **Tampilkan periode** pada periode `2025/2026` sama-sama aktif, lalu tekan **Simpan program**.
8. Setelah tersimpan, salin jalur `/program-kerja/<id>/daftar` dari kotak **Tautan formulir pendaftaran publik** melalui tombol **Salin tautan** atau uji lewat **Buka halaman**.

## 5. Checklist QA manual sebelum rilis ke peserta

Jalankan seluruh skenario berikut pada lingkungan staging:

- [ ] Akses `/program-kerja` dan modal program di `/`; tombol **Daftar Sekarang** pada **IT Versary & Sertijab 2026** mengarah ke `/program-kerja/<id>/daftar`.
- [ ] Uji pengisian formulir valid (nama 2-100 karakter, NIM 5-30 digit angka, angkatan 2020-2026 pada select formulir, No. HP/WA 8-20 karakter, ID LINE 2-64 karakter, email/catatan opsional): respons `201`, kartu sukses tampil, tombol **Gabung Grup Peserta** muncul jika tautan grup diisi, dan tombol **Cetak / Simpan Bukti** menampilkan bukti cetak.
- [ ] Uji submit ulang memakai NIM yang sama pada program yang sama: ditolak dengan status `409` dan pesan bahwa NIM sudah terdaftar.
- [ ] Uji batas kuota (misalnya atur kuota `1` di staging, kirim pendaftar pertama lalu pendaftar kedua): pendaftar kedua ditolak `409`, dan muat ulang halaman menampilkan status **Kuota Peserta Penuh** tanpa formulir.
- [ ] Uji status `Segera Hadir`, `Pendaftaran Ditutup`, dan mode `Tautan Eksternal`: halaman `/program-kerja/<id]/daftar` hanya menampilkan kartu informasi status yang sesuai tanpa `<form>`.
- [ ] Buka `/admin/program-kerja`, pastikan badge `Formulir Website` dan jumlah peserta (`N peserta` atau `N / M peserta`) tampil pada baris program, klik **Lihat peserta**, lalu uji filter program, pencarian, **Detail & Edit**, **Hapus** dengan konfirmasi, serta **Unduh Excel (.xlsx)** (sheet `Peserta Program`, timestamp WITA, dan awalan `=`/`+`/`-`/`@` dinetralkan).
- [ ] Uji permintaan anonim ke `/api/admin/program-registrations`, `/api/admin/program-registrations/<id>`, dan `/api/admin/program-registrations/export` pada `next start`: semuanya mengembalikan HTTP `401`.
