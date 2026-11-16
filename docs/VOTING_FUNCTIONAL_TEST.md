# Pengujian fungsional voting lokal

Tanggal: 12 November 2026. Aplikasi memakai build produksi lokal dan project Supabase khusus `hima-voting-test`. Tidak memakai data mahasiswa atau kandidat HIMA, tidak mengubah `.env.local`, dan tidak melakukan deployment Vercel.

## Mengulang pengujian

Gunakan konfigurasi dalam [VOTING_LOAD_TEST.md](VOTING_LOAD_TEST.md), kemudian:

```sh
npm run voting:test:functional
```

Runner memverifikasi project, marker database, migration dan build sebelum mengirim request. Build lama hanya digunakan jika sumber aplikasi cocok. Periode dummy lama ditutup dan disimpan; ballot tidak dihapus. Setiap skenario menggunakan periode baru dan 200 NIM dummy. Kuota asli aplikasi dipertahankan.

Untuk pemeriksaan browser manual:

```sh
npm run voting:test:functional -- --ui
```

Jika 13 kelompok tes otomatis sudah selesai dan hanya ingin melanjutkan pemeriksaan browser, gunakan `npm run voting:test:functional -- --ui-only`. Jalankan pada terminal interaktif agar perintah skenario tetap bisa dikirim.

Server hanya mendengarkan loopback: aplikasi pada port 3003 dan proxy gangguan pada port 3004. Perintah terminal `normal`, `slow`, `drop-before`, `drop-after`, `offline-after`, `expired`, `upcoming`, `ended`, dan `closed` membuat periode baru. Buka ulang `/voting` setelah mengganti skenario. `state` mencatat jumlah ballot/hak terpakai dan jejak endpoint, `restore` memulihkan koneksi tanpa mengganti periode, `quit` menghentikan server.

## Cakupan otomatis

Run akhir: **13/13 kelompok skenario lulus**. Laporan: `.qa/voting-load-test/report-functional-fbd72386-69ee-47cb-80ec-abd3f7053e9d.json`. Laporan sesi browser sebelumnya: `.qa/voting-load-test/report-functional-293083c4-9b1c-4c16-99c6-167e1437f8f2.json`. Keduanya memverifikasi hash `.env.local` tetap sama ketika runner selesai. Validasi sumber: 91 tes lokal, lint dan TypeScript lulus; build produksi lokal berhasil. Server runner dihentikan setelah pengujian.

- Alur cek NIM, kirim, status recorded, serta penolakan NIM yang sudah digunakan.
- Sepuluh kiriman bersamaan menggunakan NIM yang sama: hanya satu berhasil disimpan.
- Token kedaluwarsa, tanda tangan token diubah, kandidat dari periode lain, kandidat tidak ada, NIM salah format dan NIM tidak terdaftar.
- Jadwal belum dimulai, sudah berakhir dan ditutup: pemeriksaan NIM maupun pengiriman ditolak.
- Status suara yang sudah disimpan tetap terbaca setelah pemilihan ditutup.
- Origin asing ditolak dan API admin tanpa login mengembalikan 401.
- Fungsi pemulihan yang digunakan UI (`submitVotingChoice` dan `checkVotingSubmission`) berkomunikasi dengan API nyata melalui proxy yang memutus soket. Hasil kemudian dibandingkan dengan database Supabase uji.

| Gangguan | Hasil awal yang diharapkan | Suara sebelum pemulihan | Tindakan pemulihan |
|---|---|---|---|
| Respons diperlambat 2,5 detik | recorded | 1 | Tidak perlu kirim ulang |
| Putus sebelum request diteruskan | not_recorded | 0 | Kirim ulang pilihan yang sama |
| Putus setelah transaksi berhasil | recorded melalui endpoint status | 1 | Tidak mengirim suara ulang otomatis |
| Respons kirim hilang dan endpoint status tidak terjangkau | unknown | 1 | Pulihkan koneksi, periksa status |
| Token diterbitkan 16 menit lalu | unknown; server menolak token | 0 | Periksa NIM lagi untuk sesi baru |

Setelah pemulihan, setiap skenario wajib mempunyai tepat satu ballot dan satu hak terpakai. Pengujian token lama tidak mengubah jam komputer atau menunggu 15 menit sungguhan. Gangguan jaringan disimulasikan pada endpoint voting; bukan mematikan Wi-Fi atau Supabase.

## Pemeriksaan browser dan batasnya

Safari: cek NIM, buka profil kandidat, konfirmasi dan kirim berhasil. Layar terima kasih terlihat dan database berisi satu ballot/hak terpakai. Chrome: klik ganda pada kirim dengan penundaan 2,5 detik menghasilkan satu request kirim dan satu ballot. Pada gangguan sebelum penyimpanan, teks kirim ulang pilihan yang sama terlihat; database awal nol dan menjadi satu setelah koneksi dipulihkan dan retry. Pada gangguan setelah penyimpanan, jejak jaringan menunjukkan pemeriksaan status dan database tetap satu.

Pada pemeriksaan browser awal, skenario endpoint status ikut terputus berhasil diperiksa melalui database dan jejak jaringan, tetapi pembacaan UI melalui alat komputer tidak konsisten dan kemudian gagal dengan error capture `SCStreamErrorDomain -3811`. Saat itu tampilan unknown, pemulihan lewat tombol, indikator loading sesaat, serta seluruh tampilan jadwal/token kedaluwarsa belum dinyatakan lulus secara visual. Pemeriksaan lanjutan di bawah melengkapi bukti yang tertunda tersebut. Tidak menyimpulkan ada bug Safari hanya dari snapshot yang tertahan.

### Pemeriksaan lanjutan 12 November 2026

Tes otomatis dijalankan ulang dan kembali lulus 13/13: `.qa/voting-load-test/report-functional-a0d60990-65ab-40b1-9bd0-9b9d425879d1.json`.

- Periode 9960/9961: Safari menampilkan “Belum dimulai”, jadwal mulai dalam WITA dan tautan kembali, tanpa form NIM atau pilihan kandidat.
- Periode 9961/9962: Chrome menampilkan “Waktu pemungutan berakhir”, tanpa akses memilih.
- Periode 9962/9963: Chrome menampilkan “Pemilihan telah ditutup”, tanpa akses memilih. Console pada pemeriksaan ini tidak menunjukkan pesan error JavaScript.
- Periode 9963/9964: kolom NIM dan tombol terkunci dengan teks “Memeriksa NIM…”. Saat kirim, tombol “Mengirim suara…” beserta spinner terlihat dan tombol tutup/kembali nonaktif. Request kirim dan status ditolak dengan 400; database tetap 0 ballot/0 hak terpakai. Pengguna mengonfirmasi pesan sesi kedaluwarsa/periksa NIM kembali terlihat. Konfirmasi pengguna dibedakan dari snapshot alat yang sempat tertahan.

Alat capture kembali mengalami error dan pembacaan yang tertahan. Pengujian selanjutnya dilakukan bersama pengguna dengan mencocokkan laporan tampilan dengan jejak endpoint dan database uji.

- Periode 9964/9965: setelah cek NIM pada periode baru dan kirim kandidat 1, proxy meneruskan transaksi yang berhasil (200), memutus respons, lalu menolak koneksi endpoint status. Chrome menampilkan pesan “Status suara belum dapat dipastikan”, tombol kirim/tutup/kembali nonaktif, serta tombol “Periksa status suara”. Database berisi tepat 1 ballot dan 1 hak terpakai.
- Koneksi dipulihkan tanpa mengganti periode atau data. Menekan “Periksa status suara” menghasilkan halaman terima kasih dan kembali ke beranda. Jejak request hanya menambahkan POST status (200), tanpa POST ballot kedua. Database tetap 1 ballot/1 hak terpakai. Pemulihan manual lewat tombol sudah terverifikasi, bukan hanya melalui fungsi yang diuji otomatis.

Jawaban pengguna pertama tentang status belum pasti ternyata belum bisa dicocokkan dengan request pada periode baru (database masih nol dan jejak endpoint kosong). Jawaban itu tidak digunakan sebagai bukti kelulusan skenario koneksi putus. Pengujian diulang pada periode 9964/9965 hingga tampilan, jejak request dan database cocok. Seluruh tampilan jadwal yang disebut di atas, indikator proses, penolakan sesi kedaluwarsa, serta pemulihan status manual sekarang mempunyai bukti pemeriksaan. Event `online` otomatis setelah Wi-Fi fisik tersambung kembali dan deployment Vercel belum diuji.

Laporan sesi browser lanjutan: `.qa/voting-load-test/report-functional-8a94a1ee-d0e4-4c9e-997c-663a165679fc.json`. Mode `--ui-only` tidak menjalankan ulang kelompok API; kolom `api` kosong pada laporan ini memang diharapkan dan tidak dihitung sebagai 13 tes tambahan.

### Pemeriksaan otomatis setelah gangguan koneksi

Alur tampilan kemudian disederhanakan atas permintaan pengguna. Setelah respons kirim hilang, UI tetap menampilkan “Mengirim suara…” dan memeriksa status di belakang layar, maksimal tiga kali dengan jeda 1 dan 2 detik. Pemeriksaan berhenti segera jika suara tercatat, sesi ditolak, atau permintaan dibatasi. Deadline request status di browser adalah 5 detik; deadline kirim tetap 15 detik. Tidak ada pengiriman ballot ulang otomatis.

Jika pemeriksaan terakhir belum mendeteksi suara, UI menampilkan pesan “Suara belum terkonfirmasi” dan satu tombol “Coba lagi” untuk pilihan yang sama. Ini bukan pernyataan bahwa transaksi yang terlambat pasti gagal. Jika server tidak dapat dihubungi, UI menyebut status belum pasti; tombol “Coba lagi” hanya memeriksa status, dan event `online` juga memicu pemeriksaan otomatis. Tautan memasukkan NIM kembali hanya tampil ketika endpoint status menolak sesi (400). Jadwal berakhir tidak menghalangi pemeriksaan status suara yang sudah dikirim.

97 tes lokal, lint dan TypeScript lulus untuk perubahan ini. Tes tambahan membuktikan transaksi terlambat dapat ditemukan pada pemeriksaan ketiga, gangguan jaringan tetap menghasilkan status unknown, serta tidak ada ballot kedua yang dikirim otomatis. Tes markup memeriksa tidak ada ajakan retry selama proses dan hanya satu tindakan pemulihan sesuai kondisi. Hasil browser di bagian sebelumnya menjelaskan tampilan sebelum penyederhanaan ini.

Build produksi dengan perubahan baru berhasil. Pengujian API dan pemulihan melalui Supabase uji kembali lulus 13/13: `.qa/voting-load-test/report-functional-f5e7472b-597f-4292-ad9d-cca468ac05e6.json`. Pada run ini sesi ditolak menghasilkan status frontend `expired`, sehingga hanya tindakan memasukkan NIM kembali yang ditampilkan.

Pemeriksaan Chrome pada periode dummy 9978/9979 memutus kiriman sebelum diteruskan: jejak menunjukkan satu upaya kirim yang tidak diteruskan, kemudian tiga POST status otomatis (200). Database masih 0 ballot/0 hak terpakai. Dialog menampilkan “Suara belum terkonfirmasi…” dengan satu tombol aktif “Coba lagi”, tanpa pilihan periksa status atau NIM tambahan. Setelah koneksi dipulihkan dan tombol itu ditekan, halaman terima kasih tampil; database menjadi 1 ballot/1 hak terpakai. Tidak ada retry ballot otomatis selama tiga pemeriksaan tersebut. Satu error console ERR_EMPTY_RESPONSE berasal dari pemutusan soket yang sengaja dibuat oleh proxy uji. Server uji dihentikan sesudah run, hash environment HIMA tetap sama. Vercel dan event online setelah Wi-Fi fisik terputus belum diuji pada perubahan ini.

## Perbaikan selama pengujian

- CSP sebelumnya memaksa HTTPS juga pada HTTP loopback sehingga aset localhost gagal dimuat di Safari. `upgrade-insecure-requests` kini dikecualikan hanya untuk HTTP `localhost`, `127.0.0.1`, dan `[::1]`. Domain publik tetap mendapatkan directive tersebut; nonce, pembatasan script dan perlindungan lain dipertahankan.
- Form NIM dan konfirmasi memakai `method="post"` agar fallback saat JavaScript tidak berjalan tidak menempatkan NIM dalam query URL.

Laporan JSON berada di `.qa/voting-load-test/report-functional-*.json`, diabaikan Git dan tidak memuat password, secret, token atau payload pilihan. Pengujian ini tidak membuktikan kapasitas Vercel atau keamanan terhadap semua jenis serangan. Hasil kapasitas dan batas 200 pengguna serentak dicatat terpisah pada laporan load test.
