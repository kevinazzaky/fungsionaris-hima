# Pemeriksaan input — 16 November 2026

Pemeriksaan kode lokal dan tes otomatis, tanpa mengirim payload serangan ke produksi atau mengubah data Supabase. Ini bukan pengujian penetrasi menyeluruh maupun pemeriksaan konfigurasi dashboard Vercel/Supabase.

## Perbaikan

- Kolom nama pemilih menyaring ketikan dan tempelan: hanya huruf Unicode, tanda pembentuk huruf Unicode, spasi biasa, dan titik yang dipertahankan. Angka, emoji, operator, tanda kutip, tag HTML, dan karakter tak terlihat dibuang.
- Server tetap menolak input nama ilegal secara utuh, bukan membersihkannya lalu menganggap valid. Tab, baris baru, dan spasi nonstandar di awal/akhir kini ikut ditolak sebelum pencarian pemilih. Nama sah dinormalisasi NFC dan spasi berulang dirapikan; panjang tetap 2–100 karakter.
- Regresi menguji payload SQL/HTML, objek sebagai nama/NIM, karakter kontrol, nama bertitik, dan huruf beraksen. Input ilegal tidak mencapai pencarian pemilih dan tidak menghasilkan token.

## Input yang diperiksa

| Jalur | Perlindungan yang ditemukan | Batas pemeriksaan |
| --- | --- | --- |
| Nama dan NIM voting | Validasi di domain/server; NIM tepat 8 angka; pasangan harus cocok; rate limit jaringan dan NIM | Nama dan NIM bukan bukti kepemilikan identitas |
| Token, kandidat, status voting | Tanda tangan dan masa berlaku token, UUID kandidat, rate limit; transaksi database menjaga satu suara per hak pilih | Tidak mengulang uji beban pada produksi |
| CSV pemilih, periode, jadwal, profil kandidat | Admin wajib; origin diperiksa; CSV, enum, tanggal, panjang teks, daftar dan UUID divalidasi | Pengubahan pemilihan tetap mengikuti penguncian draft di database |
| Pendaftaran publik dan edit pendaftar | Tipe dan panjang teks, NIM angka, tahun, daftar divisi publik, periode; origin diperiksa | Belum ada rate limit aplikasi pada POST pendaftaran publik |
| Program kerja, fungsionaris, galeri, hero | Admin wajib; origin; tipe, batas panjang, enum, urutan, status publikasi dan UUID | Teks deskripsi tetap menerima tanda baca sesuai kebutuhan konten |
| Tautan pendaftaran program | Hanya URL HTTP/HTTPS, bukan javascript/data | Tujuan URL eksternal bukan jaminan situs tepercaya |
| Pencarian admin dan pagination | Admin wajib; panjang pencarian dibatasi; nomor halaman dibatasi; Prisma memakai parameter | Tidak ada interpolasi input menjadi perintah SQL yang ditemukan |
| Login dan ubah kata sandi | Validasi tipe/panjang; autentikasi Supabase dan pemeriksaan hak admin; sandi lama diverifikasi saat mengganti | Rate limit layanan Auth tidak diperiksa di dashboard; simbol sandi sengaja tetap diizinkan |
| Foto admin | Maksimal 3 MB, MIME gambar tertentu, decode dan encode ulang WebP, batas jumlah piksel, nama berkas acak | Bukan pemindai malware |
| PDF pendaftaran | Maksimal 3 MB, MIME PDF dan penanda awal PDF, nama acak, akses unduh admin melalui URL sementara | Penanda awal PDF bukan pemeriksaan isi PDF secara menyeluruh; belum ada pemindai malware |
| JSON dan multipart | Pembacaan body dibatasi; JSON harus objek, bukan array; data diteruskan melalui field yang dipilih validator | Pembatasan ukuran tidak menggantikan rate limit |

## Jalur penyimpanan dan tampilan

- Repository memakai Prisma atau tagged template `$queryRaw`/`$executeRaw` dengan parameter. Tidak ditemukan pemakaian varian `Unsafe` maupun penyusunan perintah SQL dari input pengguna di `src`.
- Komponen menampilkan isian sebagai teks melalui React. Pemakaian `dangerouslySetInnerHTML` yang ditemukan hanya JSON terstruktur di layout, dengan karakter `<` di-escape oleh `serializeJsonForHtml`.
- CSP produksi membatasi script dengan nonce, menolak handler script inline dan framing. Membatasi simbol di semua kolom bukan pengganti query berparameter dan escaping keluaran; alamat, deskripsi, URL, serta password memang memerlukan karakter berbeda.

## Verifikasi

- `npm test`: 110 tes lulus, termasuk tes database terisolasi, token, rate limit, origin, CSP, dan payload nama/NIM.
- `npm run lint`, `npx tsc --noEmit`, `git diff --check`: lulus.
- Tidak menjalankan pengujian serangan terhadap website aktif. Perubahan perlu di-deploy agar penyaringan baru berlaku di website publik.
