# Skema database dan migrasi data lama

Sumber skema: [prisma/schema.prisma](../prisma/schema.prisma).

| Tabel | Fungsi | Kunci dan aturan |
| --- | --- | --- |
| `AdminUser` | Daftar pengguna Supabase Auth yang diberi akses admin | UUID `authId` dan email unik; tidak ada akses browser langsung |
| `Member` | Nama, jabatan, kelompok, foto, urutan, publikasi fungsionaris | UUID; indeks publikasi/kelompok/urutan |
| `GalleryPhoto` | Judul, deskripsi aksesibel, lokasi foto, urutan, publikasi | UUID; indeks publikasi/urutan |
| `HeroSlide` | Judul internal, deskripsi aksesibel, path foto hero, urutan, publikasi | UUID; indeks publikasi/urutan; RLS dan akses server seperti konten lain |
| `Program` | Judul, ringkasan/deskripsi, periode, jadwal, lokasi, status, tautan registrasi, narasumber/benefit, biaya/kontak, ikon, path foto dan publikasi | UUID; enum status; array teks; indeks publikasi/periode/urutan; RLS dan akses server |
| `ProgramPeriod` | Label periode dan status tampil satu periode | Primary key label kanonis; relasi Program.period, RLS aktif; hapus periode berisi program ditolak FK |
| `RegistrationSettings` | Status buka/tutup penerimaan fungsionaris | Singleton `main` dengan CHECK; hanya flag boolean dan updatedAt; RLS dan akses server |
| `Registration` | Data pendaftaran dari website dan spreadsheet | Kombinasi NIM + periode unik; sumber `web` atau `spreadsheet` |

`Registration.submittedAt` boleh null untuk tanggal historis yang tidak diketahui. `createdAt` merekam waktu penyimpanan di database; keduanya memiliki arti berbeda. `berkas` adalah nama file, `berkasPath` adalah path object privat, `berkasSize` adalah byte. Impor lama hanya mengisi nama file jika tersedia. Data pribadi tidak diteruskan oleh endpoint publik.

RLS aktif pada seluruh tabel aplikasi. Tidak ada policy baca/tulis untuk `anon` atau `authenticated`, dan grant untuk kedua role serta `PUBLIC` dicabut. Prisma memakai koneksi server dengan role yang bisa mengakses tabel. Setiap handler admin melakukan pemeriksaan Supabase Auth dan `AdminUser` sebelum query. Tidak ada trigger aplikasi; UUID, timestamp, dan keunikan diatur schema Prisma/database.

## Pemetaan header spreadsheet

Header mengabaikan kapitalisasi, spasi, dan tanda baca. Migrasi tersedia melalui CLI pengembang; fitur impor di aplikasi telah dihapus.

| Field | Contoh header yang dikenali |
| --- | --- |
| nama (wajib) | Nama, Nama Lengkap, name |
| nim (wajib) | NIM, Nomor Induk Mahasiswa |
| angkatan (wajib) | Angkatan, Tahun Angkatan |
| divisi (wajib) | Divisi, Pilihan Divisi, Divisi yang Diminati |
| tempatTanggalLahir | Tempat Tanggal Lahir, Tempat Tgl Lahir, TTL |
| jenisKelamin | Jenis Kelamin |
| alamat | Alamat, Alamat Domisili |
| noHp | No HP, No HP / WA, Nomor HP, Nomor Telepon, No. WhatsApp / HP |
| idLine | ID LINE, LINE |
| pengalamanOrganisasi | Pengalaman Organisasi |
| minatSkill | Minat dan Skill, Minat Skill |
| alasanBergabung | Alasan Bergabung, Alasan Bergabung HIMA TI |
| alasanDivisi | Alasan Divisi, Alasan Memilih Divisi |
| submittedAt | Timestamp, Waktu Daftar, Tanggal Daftar, Waktu Submit |
| berkas | Berkas, Nama Berkas, File, Nama Berkas Lampiran |

Field camelCase API lama juga dikenali. Header yang berbeda perlu disesuaikan sebelum impor; CLI melaporkan nomor baris yang gagal tanpa menebak data wajib. NIM berisi 5–30 digit, angkatan berupa tahun empat digit. Jangan mengekspor NIM sebagai notasi ilmiah.

Tanggal numerik `DD/MM/YYYY HH:mm:ss` dan `DD/MM/YYYY, HH.mm.ss` dibaca dalam `Asia/Makassar` (UTC+8). Timestamp ISO wajib menyertakan zona, misalnya `2026-11-05T09:30:00+08:00`. Nilai kosong tidak diisi tanggal buatan. Duplikat dalam satu berkas harus diselesaikan terlebih dahulu; duplikat yang sudah ada di database dilewati. Insert menggunakan `createMany` dengan `skipDuplicates`, sehingga kendala unik database juga melindungi impor bersamaan.

Skema Supabase dan konten awal website sudah diisi dengan persetujuan pemilik. Migrasi XLSX asli pada 5 November 2026 menyimpan 4 pendaftar periode 2026; semua 15 kolom dikenali dan nilai seluruh field cocok dengan sumber. Lampiran historis hanya berupa nama berkas, tanpa isi file atau pas foto.
