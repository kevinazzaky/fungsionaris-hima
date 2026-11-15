# Validasi nama dan NIM pemilih

Pemilih wajib memasukkan nama lengkap dan NIM 8 angka. Server mencocokkan nama dengan data panitia sebelum menerbitkan sesi memilih. Huruf besar/kecil dan spasi berlebih diabaikan; nama berbeda tetap ditolak. Nama menerima huruf Unicode, spasi, dan titik, 2–100 karakter. Titik diizinkan karena enam nama resmi pada daftar panitia memakainya. Angka, emoji, markup, dan simbol lainnya ditolak di server.

Nama disimpan pada `eligible_voters.name`, terpisah dari surat suara anonim. NIM tetap disimpan sebagai penanda HMAC. Daftar nama hanya ditampilkan melalui endpoint admin yang memerlukan autentikasi; data publik tidak memuat daftar pemilih.

Tambahkan atau perbarui data saat periode masih draft, melalui formulir admin atau CSV UTF-8:

```csv
nim,nama,prodi,aktif,periode
00123456,I Made Dandi,TI,true,2026/2027
```

Impor ulang NIM yang sama memperbarui nama tanpa mengubah status hak pilih atau membuat NIM duplikat. Format CSV lama tanpa nama tetap dapat diimpor, tetapi pemilih tersebut belum bisa mendapat sesi sampai namanya dilengkapi. Penjadwalan ditolak jika masih ada pemilih aktif tanpa nama.

Migrasi `20261115000000_voter_names` menambahkan kolom nullable tanpa menghapus data lama dan mengunci perubahan nama setelah draft. Jalankan migrasi sebelum menjalankan kode baru di lingkungan lain.

Pesan validasi: NIM tidak terdaftar atau nama berbeda mendapat “Nama dan NIM tidak cocok. Periksa kembali.” Pasangan yang cocok tetapi haknya sudah terpakai mendapat “Nama dan NIM ini sudah digunakan untuk memilih pada periode ini.” Nama salah tidak mengungkap status penggunaan NIM.

Pencocokan ini bukan bukti kepemilikan identitas: orang yang mengetahui pasangan nama–NIM tetap dapat mencoba menggunakannya. Rate limit dan aturan satu suara per NIM tetap berlaku.

## Verifikasi 15 November 2026

- 100 tes lulus, termasuk normalisasi nama, pencocokan pasangan, penolakan nama kosong/salah/markup, impor CSV, dan penguncian nama setelah draft.
- TypeScript dan lint lulus; salinan build produksi lokal berhasil.
- Supabase uji periode 9980/9981: enam kasus input salah ditolak dengan HTTP 400 tanpa token, pasangan benar diterima, pengiriman ulang ditolak, hasil akhir satu surat suara dan satu hak terpakai. Semua 200 nama dummy tetap utuh. Bukti lokal: `.qa/voting-name-check-report.json`.
- Chrome pada port 3004: nama berangka ditolak oleh form, nama salah ditolak server, nama benar membuka kandidat. Pemeriksaan ini tidak mengirim suara ke database HIMA.
- Migrasi tambahan telah diterapkan pada Supabase HIMA dan Supabase uji. Belum di-deploy atau diuji di Vercel.

## Impor daftar mahasiswa 2023–2026

Daftar panitia berisi 226 pasangan nama–NIM unik: 79 angkatan 2023, 56 angkatan 2024, 54 angkatan 2025, dan 37 angkatan 2026. Angkatan dibaca dari awalan NIM 423/424/425/426; kolom ketiga Excel berisi program pagi/sore, bukan angkatan.

Seluruh data telah diimpor ke periode 2026/2027 pada Supabase HIMA, bukan project uji. Satu NIM lama dilengkapi nama dan 225 NIM ditambahkan. Sesuai persetujuan panitia, periode dikembalikan ke draft dan jadwal dikosongkan. Enam kandidat dan semua atributnya dipertahankan; jumlah surat suara dan hak terpakai tetap nol. Backup dan laporan lokal tersimpan di `.qa/voting-roster-import/` yang diabaikan Git dan dibatasi izin aksesnya.

Environment `.env.voting-test.local` dihapus atas permintaan pengguna; `.env.local` HIMA tidak berubah. Project Supabase uji dan laporan lama tidak dihapus. Pengujian terisolasi berikutnya memerlukan konfigurasi uji baru; jangan menggantinya dengan environment HIMA untuk menjalankan dummy atau fault test.

Verifikasi perubahan: 101 tes, TypeScript, dan lint lulus.

## Pesan setelah hak pilih digunakan

Pemeriksaan per NIM tetap dihitung dan dibatasi lima kali per 10 menit. Jika batas ini tercapai, pasangan nama–NIM yang benar dan sudah terpakai tetap mendapat pesan “Nama dan NIM ini sudah digunakan untuk memilih pada periode ini.” Pasangan lain tetap ditolak dengan HTTP 429 tanpa menerbitkan sesi atau mengungkap status pemilih. Batas jaringan tetap diperiksa sebelum membaca data pemilih.

Verifikasi: 105 tes, TypeScript, dan lint lulus. Enam pemeriksaan berulang melalui localhost terhadap hak yang sudah terpakai di Supabase HIMA semuanya menampilkan pesan sudah digunakan; jumlah surat suara dan hak terpakai tidak berubah.

## Batas jaringan terbaru

Per 15 November 2026, pemeriksaan nama–NIM, pengiriman suara, dan pemeriksaan status masing-masing dibatasi 50 permintaan per jaringan per 5 menit. Ketiganya memakai penghitung terpisah. Batas per NIM tetap lima pemeriksaan dan lima percobaan pengiriman per 10 menit; batas status per sesi tetap 10 per 10 menit. Aturan satu suara per NIM per periode tidak berubah.

Migrasi `20261115010000_voting_rate_windows` menambahkan fungsi empat argumen untuk memilih jendela 300 atau 600 detik, dengan akses publik tetap ditolak. Penghitung jaringan memakai namespace baru agar tidak mewarisi waktu kedaluwarsa 10 menit dari kebijakan sebelumnya. Fungsi tiga argumen lama dipertahankan untuk kompatibilitas. Tes PostgreSQL lokal mencakup batas ke-51, durasi masing-masing jendela, pembaruan setelah kedaluwarsa, dan penolakan peran publik.
