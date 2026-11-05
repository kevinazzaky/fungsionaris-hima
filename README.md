# Portal HIMA TI Undiknas

Website informasi Himpunan Mahasiswa Teknologi Informasi Universitas Pendidikan Nasional, dengan panel admin untuk mengelola konten dan pendaftaran fungsionaris. Aplikasi memakai Next.js, PostgreSQL Supabase, Prisma, Supabase Auth, dan Supabase Storage.

## Fitur aplikasi

### Halaman publik

| Halaman          | Isi                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------- |
| `/`              | Slideshow hero, profil organisasi, fungsionaris, program kerja per periode, galeri, dan informasi pendaftaran |
| `/about`         | Profil, visi dan misi organisasi                                                                              |
| `/fungsionaris`  | Struktur pengurus dan divisi dari data yang dipublikasikan                                                    |
| `/gallery`       | Galeri foto kegiatan                                                                                          |
| `/program-kerja` | Program kerja per periode; rincian dan tautan pendaftaran program juga tersedia melalui modal di beranda      |
| `/pendaftaran`   | Formulir fungsionaris ketika penerimaan dibuka, atau informasi penutupan                                      |
| `/contact`       | Informasi kontak organisasi                                                                                   |

Hero, fungsionaris, galeri dan program kerja membaca konten database. Program hanya tampil jika **program dan periodenya sama-sama dipublikasikan**. Periode kosong tidak membuat tab publik kosong. Status pendaftaran fungsionaris terpisah dari status registrasi masing-masing program kerja.

### Panel admin

Masuk melalui `/admin/login`. Pengguna harus memiliki akun Supabase Auth dan terdaftar pada tabel `AdminUser`.

| Menu                     | Kemampuan                                                                                                                                                                         |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pendaftar** (`/admin`) | Buka/tutup penerimaan, pencarian, detail, edit, hapus dengan konfirmasi, ekspor Excel, serta cetak ulang formulir dan surat pernyataan                                            |
| **Fungsionaris**         | Tambah/edit/hapus nama, jabatan, kelompok, foto, urutan dan status publikasi                                                                                                      |
| **Galeri**               | Tab **Galeri** dan **Hero beranda** dalam satu halaman; CRUD foto, deskripsi, urutan dan publikasi                                                                                |
| **Program kerja**        | Tab periode, tambah periode, tampil/sembunyi seluruh periode, CRUD program, jadwal/lokasi, deskripsi, status/tautan registrasi, narasumber, benefit, biaya, kontak, ikon dan foto |
| **Akun admin**           | Ganti password dengan verifikasi password saat ini; setelah berhasil pengguna login kembali                                                                                       |

Form tambah/edit konten menggunakan popup dengan preview foto. Validasi gagal mempertahankan isian; popup ditutup setelah simpan berhasil. Pada mobile/tablet di bawah 1100 px, navigasi tersembunyi dan dibuka lewat tombol **Menu**. Desktop mempertahankan sidebar di kiri.

`/admin/hero` mengarah ke `/admin/galeri?tab=hero`. Membatalkan popup membuang perubahan yang belum disimpan; tutup popup sebelum berganti tab.

### Pendaftaran dan cetak ulang

- **Admin → Pendaftar → Buka/Tutup pendaftaran** menyimpan status di Supabase tanpa deploy ulang. Saat ditutup, API menolak request pendaftaran baru dengan 403, termasuk kiriman dari tab formulir lama. Data yang sudah ada tetap dapat dikelola.
- Banner dan formulir mengikuti status saat halaman dimuat. Pengumuman mengambang memeriksa ulang status saat navigasi atau browser kembali fokus.
- Data tersimpan pada `Registration`, dengan kombinasi **NIM + periode** yang unik. Pengeditan admin mempertahankan waktu daftar, sumber data dan lampiran.
- PDF pendaftaran maksimal **3 MB**, disimpan di bucket privat. Unduhan lampiran memerlukan admin dan memakai signed URL sementara.
- Pas foto opsional JPG/PNG/WebP maksimal **5 MB** saat ini digunakan untuk preview dan cetak di browser; **belum disimpan ke Storage**.
- **Detail → Cetak ulang surat / Simpan PDF** memakai template formulir dan surat pernyataan yang sama dengan halaman publik, ukuran A4. Browser menyediakan pilihan printer atau Simpan sebagai PDF. Foto/tanda tangan yang tidak tersimpan perlu dilengkapi.
- Impor data lama sudah dihapus dari UI dan API aplikasi. Migrasi spreadsheet dilakukan melalui CLI pengembang, tanpa menimpa NIM/periode yang sudah ada.

## Teknologi

| Bagian      | Implementasi                                                                    |
| ----------- | ------------------------------------------------------------------------------- |
| Framework   | Next.js **16.4.5**, App Router, Turbopack                                       |
| UI          | React **19.2.8**, TypeScript, Tailwind CSS **4**, Motion **13**, Phosphor Icons |
| Database    | PostgreSQL Supabase, Prisma **7.10.1**, adapter `@prisma/adapter-pg`            |
| Autentikasi | Supabase Auth dan `@supabase/ssr`, cookie HttpOnly                              |
| Berkas      | Supabase Storage; Sharp untuk validasi, pembatasan resolusi dan konversi WebP   |
| Spreadsheet | SheetJS **0.20.3**, paket resmi yang dikunci pada lockfile                      |
| Pengujian   | Node test runner melalui `tsx`; PGlite untuk migration dan RLS                  |

Gunakan **npm** sesuai `package-lock.json`. Verifikasi lokal memakai Node.js **24.11.1**. Prisma yang terpasang mensyaratkan Node `^20.19`, `^22.12`, atau `>=24.0`; Next.js mensyaratkan minimal `20.9.0`.

## Menjalankan proyek

### 1. Dependensi dan environment

```sh
npm ci
```

Buat `.env.local` berdasarkan [.env.example](.env.example), lalu isi nilai project Supabase yang sebenarnya. Pertahankan file environment yang sudah ada.

| Variabel                               | Fungsi                                                                        |
| -------------------------------------- | ----------------------------------------------------------------------------- |
| `DATABASE_URL`                         | Koneksi PostgreSQL runtime, biasanya transaction pooler port 6543             |
| `DIRECT_URL`                           | Koneksi Prisma CLI/migration; direct connection atau session pooler port 5432 |
| `NEXT_PUBLIC_SUPABASE_URL`             | URL project Supabase                                                          |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key untuk autentikasi                                             |
| `SUPABASE_SECRET_KEY`                  | Secret key server, atau legacy service_role key                               |
| `REGISTRATION_PERIOD`                  | Periode penerimaan fungsionaris, default `2026`                               |
| `NEXT_PUBLIC_SITE_URL`                 | Origin website untuk metadata dan URL publik                                  |

Salin hostname koneksi dari Supabase, URL-encode karakter khusus password database, dan gunakan TLS dengan verifikasi sertifikat sesuai contoh environment. Secret key hanya digunakan di server; file `.env.local` tidak disimpan di Git.

### 2. Database dan Storage

```sh
npm run db:generate
npm run db:validate
npm run db:migrate
```

Jalankan [supabase/storage.sql](supabase/storage.sql) melalui SQL Editor Supabase untuk menyiapkan bucket:

| Bucket               | Akses dan isi                                                                   |
| -------------------- | ------------------------------------------------------------------------------- |
| `website-media`      | Publik; WebP maksimal 3 MB, folder `members/`, `gallery/`, `hero/`, `programs/` |
| `registration-files` | Privat; PDF pendaftaran maksimal 3 MB                                           |

Foto admin menerima JPG/PNG/WebP maksimal 3 MB, lalu dikonversi menjadi WebP sebelum upload. Database menyimpan metadata dan path berkas. Seluruh mutasi Storage dilakukan server; bucket publik tidak berarti pengunjung mendapat izin upload/hapus.

### 3. Konten awal dan akun admin

Untuk inisialisasi database baru:

```sh
npm run db:seed
npm run db:seed-hero
npm run db:seed-programs
npm run db:create-admin -- --email admin@example.com
```

Ganti email contoh dengan email pengurus. Akun baru mendapat password acak yang ditampilkan saat pembuatan. Pengulangan perintah mempertahankan password akun yang sudah ada. Simpan kredensial secara privat dan gunakan menu Akun admin untuk menggantinya.

Seed menyediakan metadata fungsionaris/galeri serta foto hero dan program kerja awal. Metadata yang sudah ada tidak ditimpa, tetapi konten awal yang dihapus akan dibuat kembali jika seed dijalankan ulang. Galeri lama tetap menggunakan aset lokal; foto baru, hero awal dan foto program awal memakai Storage. Seed tidak mereset status pendaftaran atau publikasi periode yang sudah ada.

Migration pengaturan pendaftaran membuat status awal **dibuka**, mengikuti konfigurasi sebelumnya. Sesuaikan dari menu Pendaftar sebelum menerima pendaftaran.

### 4. Server development

```sh
npm run dev
```

Buka `http://localhost:3000` dan `/admin/login`. Di PowerShell yang memblokir `npm.ps1`, gunakan `npm.cmd` sebagai pengganti `npm`.

Tanpa konfigurasi database valid, konten publik memakai data awal lokal, penerimaan dianggap tertutup, dan POST pendaftaran mengembalikan 503. Setelah database dikonfigurasi, konten kosong atau tersembunyi tetap mengikuti database. Restart server dev setelah regenerasi Prisma untuk perubahan model.

## Operasional pengembang

| Perintah                                                       | Fungsi                                                                             |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `npm test`                                                     | Menjalankan tes domain/use case, konfigurasi dan migration/RLS                     |
| `npm run lint`                                                 | Pemeriksaan ESLint                                                                 |
| `npm run build`                                                | Menghasilkan Prisma Client dan build produksi Next.js                              |
| `npm start`                                                    | Menjalankan hasil build produksi                                                   |
| `npm run db:admin -- --auth-id UUID --email admin@example.com` | Memberi role admin kepada akun Supabase Auth yang sudah ada dan cocok identitasnya |

Pratinjau migrasi spreadsheet tanpa menyimpan:

```sh
npm run db:import-registrations -- --file "PATH/data.xlsx" --period 2026
```

Tambahkan `--commit` untuk menyimpan dan `--sheet "Nama Sheet"` bila sumber bukan sheet pertama. Periksa `issues`, `ignoredColumns` dan jumlah duplikat sebelum menyimpan. NIM/periode yang sudah ada dilewati. Nama lampiran historis tidak memindahkan isi PDF/foto secara otomatis. Pemetaan header dan tanggal WITA dijelaskan pada [skema database](docs/DATABASE_SCHEMA.md).

Untuk deployment, isi environment pada hosting, jalankan migration sebagai langkah terpisah, lalu build aplikasi. Server Node menjalankan hasilnya melalui `npm start`. Pengaturan domain dan release mengikuti hosting yang dipakai; repo belum memiliki pipeline GitHub Actions. Data preview/development sebaiknya memakai database terpisah dari produksi.

## Arsitektur dan akses data

Lapisan aplikasi dipisahkan menjadi **domain → use case → repository/data → presentation**. Domain tidak bergantung pada Next.js, Prisma atau Supabase. API menyusun implementasi server dan memeriksa akses sebelum memanggil use case.

```text
src/app/           Halaman publik, admin, route handlers dan server actions
src/components/    Komponen website, popup editor dan navigasi admin
src/domain/        Tipe, kontrak repository dan validasi
src/use-cases/     Aturan pendaftaran, konten, periode dan pengaturan
src/data/          Prisma, repository, Supabase Auth/Storage dan loader publik
src/lib/           Helper, konfigurasi tampilan dan sumber seed
src/proxy.ts       Refresh cookie autentikasi dan cache policy route terkait
prisma/            Schema, migration dan seed utama
scripts/           Seed tambahan, pengelolaan admin dan migrasi spreadsheet
supabase/          Konfigurasi bucket Storage
tests/             Tes otomatis
docs/              Panduan pengembangan, setup dan hasil QA
public/            Aset statis yang masih digunakan website
```

Delapan tabel aplikasi: `AdminUser`, `Member`, `GalleryPhoto`, `HeroSlide`, `Program`, `ProgramPeriod`, `Registration`, dan `RegistrationSettings`. RLS aktif dan akses SQL langsung role `anon`/`authenticated` dicabut; Prisma mengakses database dari server. Role admin berasal dari tabel server, bukan metadata yang dapat diedit pengguna. Mutasi API admin memeriksa sesi/role dan origin request; endpoint pendaftaran publik memeriksa status penerimaan, origin dan input.

Prisma Client dihasilkan ke `src/generated/prisma` dan tidak disimpan di Git. Pendaftaran memakai database; webhook, in-memory store dan kunci ekspor bawaan lama sudah tidak digunakan. Ekspor Excel memerlukan sesi admin.

## Verifikasi dan batas yang diketahui

Catatan QA terakhir, **5 November 2026**: **49 tes, lint dan build lolos**. Build juga diuji tanpa konfigurasi Supabase untuk mencegah regresi prerender halaman admin. Browser memverifikasi Auth, perubahan password, pengelolaan pendaftar, hero/program kerja, periode, buka/tutup penerimaan, popup editor dan navigasi mobile. Rincian skenario, penggunaan API mock dan batas pengujian ada pada [QA_ADMIN.md](docs/QA_ADMIN.md).

- CRUD fungsionaris/galeri sudah diuji dengan API mock; alur hero/program dan Storage publik diuji pada Supabase asli. Upload/unduh PDF privat cloud belum diuji menyeluruh.
- Foto calon pendaftar belum dipersistensikan. Cetak ulang admin tidak dapat memulihkan foto/tanda tangan yang tidak tersimpan.
- Validasi form/API menerima minimal satu divisi; beberapa petunjuk publik masih menyebut dua divisi.
- Pemeriksaan mobile memakai Chrome headless pada sejumlah viewport hingga 1920 px, termasuk landscape. Safari/iPhone fisik belum diuji.
- Graphify memperbarui AST kode; parser SQL belum terpasang. Migration SQL diuji terpisah melalui PGlite dan Supabase.

## Dokumentasi dan kontribusi

- [Setup Supabase, Storage dan deployment](docs/INFRASTRUCTURE_AND_CICD.md)
- [Skema database dan migrasi data lama](docs/DATABASE_SCHEMA.md)
- [Struktur dan arsitektur](docs/FOLDER_STRUCTURE_AND_ARCHITECTURE.md)
- [Arah UI admin](docs/ADMIN_DESIGN.md)
- [Workflow Git](docs/GITFLOW_AND_CONVENTIONS.md)
- [Indeks dokumentasi](docs/README.md)

Branch fitur dibuat dari `dev`, PR menargetkan `dev`, dan commit memakai Conventional Commits yang atomik. Jalankan tes, lint, validasi Prisma, build dan `graphify update .` sebelum integrasi. Jangan memasukkan kredensial atau data pribadi pendaftar ke repository.

© 2026 HIMA TI Undiknas.
