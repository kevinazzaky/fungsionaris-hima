# Skema database dan migrasi data lama

Sumber skema: [prisma/schema.prisma](../prisma/schema.prisma).

| Tabel | Fungsi | Kunci dan aturan |
| --- | --- | --- |
| `AdminUser` | Daftar pengguna Supabase Auth yang diberi akses admin | UUID `authId` dan email unik; tidak ada akses browser langsung |
| `Member` | Nama, jabatan, kelompok, foto, urutan, publikasi fungsionaris | UUID; indeks publikasi/kelompok/urutan |
| `GalleryPhoto` | Judul, deskripsi aksesibel, lokasi foto, urutan, publikasi | UUID; indeks publikasi/urutan |
| `HeroSlide` | Judul internal, deskripsi aksesibel, path foto hero, urutan, publikasi | UUID; indeks publikasi/urutan; RLS dan akses server seperti konten lain |
| `Program` | Judul, ringkasan/deskripsi, periode, jadwal, lokasi, status, mode pendaftaran, kuota maksimal, tautan grup/registrasi, konfigurasi formulir pendaftaran (`registrationFormConfig`), narasumber/benefit, biaya/kontak, ikon, path foto dan publikasi | UUID; enum `ProgramStatus` dan `ProgramRegistrationMode`; CHECK `registrationMaxQuota >= 1` atau null; `registrationFormConfig` JSONB default `{}`; array teks; indeks publikasi/periode/urutan; RLS dan akses server |
| `ProgramPeriod` | Label periode dan status tampil satu periode | Primary key label kanonis; relasi Program.period, RLS aktif; hapus periode berisi program ditolak FK |
| `ProgramRegistration` | Data peserta yang mendaftar langsung melalui formulir website program kerja beserta jawaban pertanyaan tambahan (`customResponses`) | UUID; FK ke `Program(id)` dengan `ON DELETE RESTRICT`; kombinasi `(programId, nim)` unik; `customResponses` JSONB default `{}`; indeks `(programId, submittedAt)`; RLS aktif tanpa akses `anon`/`authenticated` |
| `RegistrationSettings` | Status buka/tutup penerimaan fungsionaris | Singleton `main` dengan CHECK; hanya flag boolean dan updatedAt; RLS dan akses server |
| `Registration` | Data pendaftaran dari website dan spreadsheet | Kombinasi NIM + periode unik; sumber `web` atau `spreadsheet` |

`Registration.submittedAt` boleh null untuk tanggal historis yang tidak diketahui. `createdAt` merekam waktu penyimpanan di database; keduanya memiliki arti berbeda. `berkas` adalah nama file, `berkasPath` adalah path object privat, `berkasSize` adalah byte. Impor lama hanya mengisi nama file jika tersedia. Data pribadi tidak diteruskan oleh endpoint publik.

RLS aktif pada seluruh tabel aplikasi. Tidak ada policy baca/tulis untuk `anon` atau `authenticated`, dan grant untuk kedua role serta `PUBLIC` dicabut. Prisma memakai koneksi server dengan role yang bisa mengakses tabel. Setiap handler admin melakukan pemeriksaan Supabase Auth dan `AdminUser` sebelum query. Tidak ada trigger aplikasi; UUID, timestamp, dan keunikan diatur schema Prisma/database.

## Pendaftaran peserta program kerja

Migration `prisma/migrations/20261117000000_program_registrations/migration.sql` menambahkan enum `ProgramRegistrationMode` (`external`, `internal`), kolom baru pada `Program`, serta tabel `ProgramRegistration`:

- `Program.registrationMode`: default `external` agar program lama tetap kompatibel; mode `internal` mengarahkan pendaftar ke halaman `/program-kerja/[id]/daftar`.
- `Program.registrationGroupLink`: string URL grup peserta (default `""`); disaring pada pembacaan publik pra-pendaftaran (`loadPrograms`, `loadProgramRegistrationPage`) dan hanya dikembalikan setelah submit pendaftaran berhasil.
- `Program.registrationMaxQuota`: integer opsional (`null` berarti tanpa batas); constraint `Program_registrationMaxQuota_check` memastikan nilainya minimal `1` bila diisi.
- `ProgramRegistration`: menyimpan `id`, `programId`, `nama`, `nim`, `angkatan`, `noHp`, `idLine`, `email`, `catatan`, `submittedAt`, dan `createdAt`. Kombinasi `(programId, nim)` unik sehingga satu NIM dapat mendaftar pada beberapa program berbeda tetapi hanya satu kali per program. Relasi `programId` memakai `ON DELETE RESTRICT` sehingga program yang sudah memiliki pendaftar tidak dapat dihapus sebelum data pesertanya ditangani.
- Transaksi atomik: saat pendaftaran dikirim, repository mengunci baris `Program` memakai `SELECT ... FOR UPDATE OF p` untuk memastikan status publikasi program/periode, mode `internal`, status `open`, dan batas `registrationMaxQuota` tetap konsisten terhadap permintaan bersamaan.
- Keamanan SQL: RLS diaktifkan pada `ProgramRegistration` dan seluruh hak akses `anon`, `authenticated`, serta `PUBLIC` dicabut (`REVOKE ALL`).

Migration `prisma/migrations/20261118000000_program_custom_form/migration.sql` menambahkan konfigurasi formulir per program dan penyimpanan jawaban pertanyaan tambahan:

- `Program.registrationFormConfig`: kolom `JSONB NOT NULL DEFAULT '{}'::jsonb`. Nilai `{}` dari data lama tetap kompatibel mundur melalui `normalizeProgramFormConfig` yang mengisinya menjadi `DEFAULT_PROGRAM_FORM_CONFIG` (`angkatan`, `noHp`, `idLine` bernilai `required`; `email` dan `catatan` bernilai `optional`; `customFields` berupa array kosong `[]`).
- Aturan kolom formulir: `nama` dan `nim` selalu wajib sebagai identitas unik pendaftar per program. Lima kolom bawaan (`angkatan`, `noHp`, `idLine`, `email`, `catatan`) dapat disetel per program ke `required`, `optional`, atau `hidden`. Setiap program juga dapat memiliki hingga 20 pertanyaan tambahan (`customFields`) dengan 6 tipe input (`text`, `textarea`, `number`, `select` dengan 1-30 opsi unik, `checkbox`, dan `date`).
- `ProgramRegistration.customResponses`: kolom `JSONB NOT NULL DEFAULT '{}'::jsonb` untuk menyimpan jawaban pertanyaan tambahan berdasarkan ID kolom custom.
- Pelestarian data historis dan validasi ulang: saat admin mengedit peserta lewat `updateProgramRegistration`, kunci pada `customResponses` yang sudah tidak ada di `customFields` aktif tetap dipertahankan. Pada pendaftaran publik baru (`programRegistrationRepository.create`), baris `Program` dikunci dengan `SELECT ... FOR UPDATE OF p`, lalu `registrationFormConfig` dinormalisasi dan seluruh input divalidasi ulang terhadap konfigurasi terbaru sebelum kuota dihitung dan baris baru disimpan.

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

Field camelCase API lama juga dikenali. Header yang berbeda perlu disesuaikan sebelum impor; CLI melaporkan nomor baris yang gagal tanpa menebak data wajib. NIM berisi 5-30 digit, angkatan berupa tahun empat digit. Jangan mengekspor NIM sebagai notasi ilmiah.

Tanggal numerik `DD/MM/YYYY HH:mm:ss` dan `DD/MM/YYYY, HH.mm.ss` dibaca dalam `Asia/Makassar` (UTC+8). Timestamp ISO wajib menyertakan zona, misalnya `2026-11-05T09:30:00+08:00`. Nilai kosong tidak diisi tanggal buatan. Duplikat dalam satu berkas harus diselesaikan terlebih dahulu; duplikat yang sudah ada di database dilewati. Insert menggunakan `createMany` dengan `skipDuplicates`, sehingga kendala unik database juga melindungi impor bersamaan.

Skema Supabase dan konten awal website sudah diisi dengan persetujuan pemilik. Migrasi XLSX asli pada 5 November 2026 menyimpan 4 pendaftar periode 2026; semua 15 kolom dikenali dan nilai seluruh field cocok dengan sumber. Lampiran historis hanya berupa nama berkas, tanpa isi file atau pas foto.
