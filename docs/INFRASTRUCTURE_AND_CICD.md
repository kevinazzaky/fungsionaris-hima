# Setup Supabase dan Prisma

## 1. Buat project dan isi konfigurasi

Buat project Supabase milik organisasi. Catat database password dan pilih region yang sesuai. Di dialog **Connect**, salin connection string yang disediakan project, jangan menebak hostname pooler.

Pertahankan `.env.local` yang sudah ada, lalu tambahkan variabel dari `.env.example`:

| Variabel | Isi |
| --- | --- |
| `DATABASE_URL` | Transaction pooler, biasanya port 6543, untuk Prisma runtime |
| `DIRECT_URL` | Direct connection atau session pooler port 5432 untuk migrasi; session pooler cocok untuk jaringan IPv4 |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key project |
| `SUPABASE_SECRET_KEY` | Secret key server, atau legacy `service_role` key |
| `REGISTRATION_PERIOD` | Periode pendaftaran aktif, misalnya `2026` atau `2025/2026` |
| `NEXT_PUBLIC_SITE_URL` | Origin website yang dideploy |

URL-encode karakter khusus database password. Gunakan koneksi TLS dengan verifikasi sertifikat, misalnya `?sslmode=verify-full`. Bila penyedia membutuhkan CA tambahan, pasang sertifikat CA yang benar; jangan gunakan `rejectUnauthorized: false`. Jangan menaruh secret key di variabel `NEXT_PUBLIC_*`, repository, atau chat.

Prisma 7.10.1 dipasang dengan adapter PostgreSQL. CLI dan client memakai versi yang sama. Konfigurasi CLI membaca `.env.local` lewat `@next/env`; `DIRECT_URL` dipakai CLI, sementara runtime memakai `DATABASE_URL`. Versi dependensi dikunci pada lockfile untuk instalasi yang dapat diulang.

## 2. Pasang dependensi dan migrasikan skema

```sh
npm ci
npm run db:generate
npm run db:validate
npm run db:migrate
```

Di PowerShell dengan execution policy yang memblokir `npm.ps1`, gunakan `npm.cmd`.

`db:migrate` hanya menerapkan migration yang sudah ditinjau. Jangan memakai `prisma db push` untuk database produksi. Migration awal membuat tabel aplikasi di schema `public`, menyalakan RLS, dan mencabut akses `anon` serta `authenticated`. Seluruh akses data website melalui server Prisma. Auth dan schema storage milik Supabase tidak dikelola Prisma.

## 3. Siapkan Storage

Jalankan isi [supabase/storage.sql](../supabase/storage.sql) melalui **SQL Editor** Supabase. Script membuat:

- `website-media`: publik, foto hasil konversi WebP, maksimal 3 MB.
- `registration-files`: privat, PDF pendaftaran, maksimal 3 MB.

Jangan menambahkan policy upload atau list untuk pengguna anonim. Upload menggunakan secret key dari server setelah pemeriksaan akses. Server membaca isi foto dengan Sharp, menghapus metadata, membatasi resolusi, dan mengubahnya ke WebP. PDF diperiksa ukuran, MIME, dan signature `%PDF-`.

## 4. Masukkan konten awal

```sh
npm run db:seed
```

Seed menyalin nama/jabatan fungsionaris serta daftar galeri yang sebelumnya ada di source code. Foto galeri lama tetap memakai aset lokal `public/gallery`; foto baru masuk Storage. ID seed deterministik dan data yang sudah ada tidak ditimpa. Gunakan seed saat inisialisasi: menjalankannya lagi setelah menghapus konten awal akan menambahkan kembali entri yang dihapus.

### Foto hero beranda

Setelah migration, jalankan `npm run db:seed-hero` untuk menyiapkan bucket publik `website-media` jika belum ada, mengonversi tiga foto hero awal ke WebP, dan menyimpan metadata pada `HeroSlide`. Script memakai secret key hanya dari environment server. Data yang sudah ada tidak ditimpa; pengulangan setelah menghapus slide awal akan membuat slide awal itu kembali. File lokal dipertahankan karena sebagian dipakai galeri.

Pengurus membuka **Admin → Galeri → tab Hero beranda** untuk upload, mengganti, menghapus, mengubah urutan dan status tampil. Tab Galeri dan Hero berada pada satu halaman. Tambah/Edit membuka popup; tutup popup sebelum berganti tab. Batal/Tutup/Escape membuang perubahan yang belum disimpan, sedangkan validasi gagal mempertahankan isian. Foto hero berada pada folder `hero/`, terpisah dari folder `members/` dan `gallery/`. Batas upload 3 MB, format JPG/PNG/WebP. Foto hero tidak otomatis masuk galeri. Nol slide aktif menampilkan teks dengan latar gelap; satu slide statis; beberapa slide menjadi slideshow. Reduced motion mematikan pergantian otomatis dan animasi hero.

Saat Prisma Client mendapat model baru, restart server dev setelah `npm run db:generate`. Proses yang sudah berjalan dapat masih menyimpan client lama. Setelah migrasi, seed hero dan restart, beranda membaca slide aktif dari database; slide yang disembunyikan tidak diganti kembali dengan foto awal.

### Program kerja

Sesudah `npm run db:migrate`, jalankan `npm run db:seed-programs`. Script memasukkan sembilan program lama (dua periode) dan menyalin tujuh foto ke `website-media/programs/` sebagai WebP. ID awal deterministik; pengulangan tidak menimpa program yang sudah dikelola admin. Seperti seed konten lain, program awal yang dihapus akan dibuat kembali saat seed dijalankan ulang. File lokal tetap dipertahankan karena dipakai bagian website lainnya.

Buka **Admin → Program kerja** dan pilih tab periode untuk tambah/edit/hapus, pencarian, urutan dan publikasi program. **Tambah periode** membuka popup untuk menyiapkan tahun baru, termasuk periode kosong atau tersembunyi. Program baru memakai periode tab aktif secara default; setelah program dipindahkan ke periode lain, tab mengikuti hasil simpan. Foto opsional memiliki preview, batal pilihan dan hapus foto. Narasumber serta benefit diisi satu per baris (maksimal 50 item, masing-masing 300 karakter). Status Dibuka memerlukan tautan HTTP/HTTPS. Jadwal/waktu berupa teks agar tanggal tunggal, rentang dan semester yang sudah ada tetap didukung.

Periode ditulis `2025/2026` atau `2026`; tanda hubung dinormalisasi menjadi garis miring. Tombol **Sembunyikan periode/Tampilkan periode** mengatur seluruh periode tanpa mengubah flag tiap program. Program publik harus memiliki `Program.isPublished` dan `ProgramPeriod.isPublished` yang sama-sama true; periode kosong atau tanpa program terbit tidak membuat tab publik kosong. Beranda dan halaman `/program-kerja` membaca filter yang sama, periode terbaru dahulu, lalu urutan program. Database kosong menampilkan keadaan kosong tanpa memunculkan ulang seed. Konten lokal hanya dipakai saat konfigurasi database belum tersedia.

Migration periode mengisi metadata dari seluruh periode lama dengan status tampil true, mempertahankan status tiap program. Pembuatan/pemindahan program membuat metadata periode yang belum ada dalam transaksi; metadata yang sudah disembunyikan tetap tersembunyi. Seed program juga mempertahankan status periode yang sudah ada. Tidak ada aksi hapus periode pada admin.

## 5. Buat akun pengurus


Untuk membuat akun Supabase Auth sekaligus memberi akses admin:

```sh
npm run db:create-admin -- --email himaprodi.ti.undiknas@gmail.com
```

Script membuat password acak dan menampilkannya sekali pada terminal operator. Akun baru dikonfirmasi melalui Admin API, lalu ditautkan ke `AdminUser` menggunakan Prisma. Jika akun sudah ada, passwordnya dipertahankan. Script menolak akun lama yang emailnya belum dikonfirmasi. Jangan menyalin password ke source code, dokumentasi, atau memori agen.

Jika akun sudah dibuat melalui **Authentication → Users**, konfirmasikan email dan gunakan alur pemberian akses berikut. Matikan pendaftaran akun publik pada pengaturan Auth jika website hanya menggunakan akun yang dibuat pengelola. Tidak ada halaman daftar akun pada aplikasi.

Salin UUID akun, lalu jalankan:

```sh
npm run db:admin -- --auth-id UUID_DARI_SUPABASE_AUTH --email EMAIL_PENGURUS
```

Perintah memverifikasi kecocokan UUID/email ke Supabase Auth sebelum memasukkan akses ke tabel `AdminUser`. Login Supabase saja tidak memberi akses admin. Untuk mencabut akses, hapus entri `AdminUser` yang bersangkutan menggunakan Prisma Studio atau SQL Editor; pemeriksaan server berikutnya akan menolak akun tersebut.

Jalankan aplikasi dan buka `/admin/login`:

```sh
npm run dev
```

Sesi menggunakan cookie HttpOnly, Secure pada production, SameSite=Lax. `src/proxy.ts` memperbarui sesi dan memberi header `private, no-store` pada admin/API. API memverifikasi pengguna ke Supabase Auth dan akses pada `AdminUser`; proxy bukan satu-satunya pengaman. Mutasi API memeriksa Origin, sedangkan form login/logout memakai proteksi Origin Server Actions Next.js.

### Ganti password

Buka **Akun admin** (`/admin/akun`) setelah login. Isi kata sandi saat ini, kata sandi baru, dan konfirmasinya. Password baru minimal 12 karakter, berbeda dari password saat ini, dan dibatasi 72 byte pada validasi server. Password tidak di-trim atau dikembalikan dalam state form.

Server memeriksa akses admin, memverifikasi password saat ini terhadap identitas sesi, lalu memanggil `auth.updateUser` dengan `password` dan `current_password`. Sesudah berhasil, aplikasi meminta pencabutan sesi, menghapus cookie autentikasi, dan mengarahkan pengguna ke login dengan pemberitahuan sukses. Password hanya dikelola Supabase Auth; tabel aplikasi tidak menyimpan password.

## 6. Migrasikan spreadsheet lama

Migrasi dilakukan pengembang melalui CLI dengan `DATABASE_URL` server. Menu, API impor dan template CSV telah dihapus dari aplikasi sesuai permintaan pemilik.

```sh
# Periksa tanpa menyimpan
npm run db:import-registrations -- --file "PATH/data.xlsx" --period 2026
# Simpan setelah seluruh kesalahan diperbaiki
npm run db:import-registrations -- --file "PATH/data.xlsx" --period 2026 --commit
```

Gunakan `--sheet "Nama Sheet"` jika sheet sumber bukan yang pertama. Maksimal 2000 baris per batch. Periksa `issues` dan `ignoredColumns`, lalu cocokkan hasil dengan sumber. Impor ulang melewati NIM yang sudah ada pada periode yang sama tanpa menimpa data. Timestamp kosong tetap `null`; nama lampiran tidak dianggap sebagai berkas yang sudah tersimpan. Log hanya memuat ringkasan dan pesan validasi. Lihat [pemetaan kolom](DATABASE_SCHEMA.md).

Pada 5 November 2026, file XLSX yang diberikan pemilik berhasil dimigrasikan: 4 dari 4 baris tersimpan untuk periode 2026, semua 15 kolom dikenali, dan seluruh field dicocokkan kembali dengan database. Format waktu lokal dengan pemisah titik juga dikenali.

### Buka/tutup pendaftaran

Buka **Admin → Pendaftar**, lalu gunakan kontrol **Pendaftaran fungsionaris** untuk membuka atau menutup penerimaan. Tunggu pesan sukses sebelum meninggalkan halaman. Status disimpan di `RegistrationSettings`, tanpa mengubah data pendaftar atau memerlukan deploy ulang. Migration awal mempertahankan kondisi lama yang terbuka; tidak ada seed yang mereset flag ini.

Beranda dan halaman pendaftaran membaca database pada request. Muat ulang halaman yang sudah terbuka untuk memperbarui banner/form. Pengumuman mengambang memakai endpoint status tanpa cache dan memeriksa ulang saat navigasi/fokus browser. API POST memeriksa status sebelum membaca multipart, validasi formulir dan upload; ketika tutup, request baru ditolak 403 meskipun dikirim dari tab lama. Backend belum dikonfigurasi tetap menghasilkan 503. Setting yang hilang atau konfigurasi database yang belum tersedia dianggap tertutup.

Periode penerimaan tetap mengikuti `REGISTRATION_PERIOD` pada environment (default 2026); kontrol ini hanya buka/tutup. Admin masih dapat membaca, mengedit, menghapus dan mencetak ulang data yang sudah ada saat penerimaan ditutup.

### Edit, hapus dan cetak ulang pendaftar

Daftar **Pendaftar** menyediakan **Edit** dan **Hapus**, juga tersedia di dialog Detail. Edit mengubah data formulir dan periode, tanpa mengganti waktu daftar, sumber, atau lampiran. Data yang diperbarui langsung dipakai oleh cetak ulang dan ekspor Excel. Isian dipertahankan jika validasi server gagal. Kombinasi NIM/periode harus unik.

Hapus meminta konfirmasi sebelum menghapus permanen. Lampiran privat dibersihkan setelah record berhasil dihapus; nama berkas historis yang tidak ada di Storage tidak dihapus sebagai object. Jika cleanup Storage gagal, UI memberi pemberitahuan untuk pembersihan oleh pengelola teknis, tanpa mengklaim penghapusan data gagal.

Buka **Pendaftar → Detail → Cetak ulang surat / Simpan PDF**. Browser membuka dialog cetak; pilih printer atau **Simpan sebagai PDF**. Dokumen memakai template yang sama dengan formulir publik: formulir pendaftaran dan surat pernyataan, ukuran A4. Waktu daftar memakai WITA dan periode mengikuti record. Foto serta tanda tangan yang tidak tersimpan perlu dilengkapi. Tombol unduh berkas asli hanya tersedia jika lampiran benar-benar tersimpan di Storage.

## 7. QA dan deployment

```sh
npm test
npm run lint
npm run db:validate
npm run build
graphify update .
```

Tambahkan konfigurasi yang sama ke environment deployment. `npm run build` menghasilkan Prisma Client sebelum Next.js dikompilasi. Jalankan `npm run db:migrate` sebagai langkah deployment terpisah sebelum merilis kode; jangan menjalankan migrasi dari request pengguna. Environment preview menggunakan database terpisah dari produksi. Pada Vercel, upload 3 MB dipilih agar payload multipart tetap di bawah batas request fungsi 4.5 MB.

Pada Vercel, isi variabel dari `.env.example` melalui pengaturan Environment Variables dan pilih cakupan **Preview** untuk deployment PR serta **Production** untuk rilis. `.env.local` tidak dikirim melalui Git. Setelah mengubah environment, deploy ulang agar build memakai konfigurasi terbaru. Sesuaikan URL situs dengan environment yang digunakan.

Helper autentikasi menunggu request menggunakan `connection()` sebelum memeriksa konfigurasi atau sesi. Halaman admin tidak diprerender saat build, termasuk ketika konfigurasi backend belum lengkap. Build tetap dapat selesai tanpa Supabase; akses admin diarahkan ke login dan login menampilkan petunjuk setup. Konfigurasi Supabase yang valid tetap diperlukan untuk menggunakan backend.

Tes lokal mencakup pemetaan spreadsheet, duplikasi per periode, penyusunan surat, validasi input, kompensasi upload saat database gagal, dan migration/RLS pada PGlite. Login dan migrasi data asli sudah diuji pada Supabase. Setelah setup bucket, lanjutkan uji akun non-admin, CRUD foto, publikasi di halaman publik, kirim pendaftaran dan restart server, serta unduh lampiran privat. Hasil dan batas verifikasi ada di [QA_ADMIN.md](QA_ADMIN.md).

## Jika server masih memakai versi lama

Jika sesudah pembaruan paket muncul `routeModule.ensureInstrumentation is not a function` dan overlay masih menyebut versi Next.js lama, hentikan proses `npm run dev` lama, pindahkan cache `.next/dev`, lalu jalankan kembali `npm run dev`. Hot reload tidak mengganti versi framework yang sudah dimuat proses Node.

Isi `DATABASE_URL` dengan connection string asli dari Supabase. Nilai contoh seperti `PROJECT_REF`, `ENCODED_PASSWORD`, dan `aws-REGION` dianggap belum dikonfigurasi: halaman publik memakai konten awal dan login admin menampilkan petunjuk setup sampai nilainya valid. Variabel environment pengguna tidak diubah oleh pemeriksaan ini.

Prisma menyimpan URL yang digunakan client dalam cache server. Ketika `DATABASE_URL` berubah, client diganti dan pool lama ditutup. Jika perubahan environment belum terbaca oleh Next.js, restart server development.

Pada setup development yang sudah diverifikasi, koneksi direct tidak terjangkau sehingga `DIRECT_URL` memakai session pooler port 5432. Runtime tetap memakai transaction pooler port 6543. Migration awal sudah diterapkan dan seed menambahkan 28 fungsionaris serta 36 foto galeri. Akun `himaprodi.ti.undiknas@gmail.com` sudah terkonfirmasi dan memiliki akses admin. Login, ganti password, penolakan password lama, serta pengulangan seed tanpa reset password telah diuji pada Supabase. Empat pendaftar lama sudah dimigrasikan. Setup bucket dan pengujian upload cloud masih perlu dilakukan.

## Referensi

- [Prisma ORM 7 client setup](https://github.com/prisma/skills/blob/main/prisma-orm-setup/references/v7-client-setup.md)
- [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase dan Prisma](https://supabase.com/docs/guides/database/prisma)
- [SheetJS: paket resmi](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/)
