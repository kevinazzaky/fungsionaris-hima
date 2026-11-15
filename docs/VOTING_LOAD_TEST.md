# Pengujian voting dengan 200 NIM dummy

Gunakan project Supabase tersendiri, bukan project HIMA. Tidak perlu 200 akun Supabase Auth: setiap dummy adalah NIM delapan digit, `99000001`–`99000200`. Kandidat memakai logo lokal, tanpa unggahan foto atau data mahasiswa asli.

## Konfigurasi

Salin `docs/examples/voting-test.env.example` ke `.env.voting-test.local`. Isi project reference, URI Transaction pooler dan Session pooler dari menu Connect → Direct / Connection string pada project uji. Jika URI masih berisi `[YOUR-PASSWORD]`, isi `VOTING_TEST_DB_PASSWORD` secara lokal; script melakukan URL encoding. Pakai secret baru khusus uji, minimal 32 karakter. Jangan menyalin secret voting HIMA.

File `.env.voting-test.local` diabaikan Git. Script membaca `.env.local` HIMA hanya untuk memastikan project dan secret berbeda; tidak memuatnya ke environment proses uji, tidak mencetak nilainya, dan memeriksa hash file tersebut sesudah operasi. Koneksi dipaksa memakai TLS verify-full dengan CA publik Supabase dalam repository.

Panduan koneksi: [Supabase — Connect to your database](https://supabase.com/docs/guides/database/connecting-to-postgres).

## Perintah

```sh
npm run voting:test -- check
npm run voting:test -- prepare
npm run voting:test -- run --mode capacity
npm run voting:test -- run --mode limiter
```

`check` hanya menguji koneksi runtime dan migrasi. `prepare` menolak project HIMA/URI campuran dan database existing yang belum ditandai khusus uji, memasang migration, membuat marker privat serta periode awal berisi 200 NIM dan enam kandidat dummy. Tidak menghapus data existing agar database bisa dipaksa kosong.

`run` membangun salinan aplikasi dalam `.qa/voting-load-test/app-*`, memakai environment khusus uji dan menjalankannya hanya pada `127.0.0.1:3003`. Font Google diganti fallback hanya pada layout salinan agar benchmark API tidak bergantung unduhan font eksternal. Health endpoint hanya ada di salinan tersebut dan memverifikasi marker database serta ID run sebelum simulasi dimulai. Server uji dihentikan setelah selesai. Server HIMA pada port 3000 tidak diganti.

## Dua jenis pengujian

- **Capacity:** kuota jaringan dilonggarkan menjadi 1.000 hanya pada salinan sumber di `.qa`. Limiter per NIM, validasi sesi, transaksi voting dan kunci database tetap berjalan. Setiap tahap menguji 200 pemilih dengan concurrency 10, 25, 50, lalu 200. Semua request berasal dari satu jaringan bersama. Tiap tahap memakai periode dummy baru agar hak pilih tidak digunakan ulang. Tahap berikutnya berhenti jika hasil belum sesuai.
- **Limiter:** kuota produksi saat ini 50 pemeriksaan NIM dan 50 pengiriman suara per jaringan per 5 menit dipertahankan. Untuk menguji kuota cast secara independen dari kuota check, runner menerbitkan sesi uji dengan fungsi penandatangan yang sama untuk 200 pemilih dummy. Targetnya 50 diterima dan 150 ditolak dengan 429 pada masing-masing aksi, bukan menganggap 429 sebagai server down. Laporan historis di bawah memakai batas lama 50 per 10 menit.

Penghitung rate limit hanya di project uji dibersihkan pada awal tiap tahap. Periode uji lama ditutup dan dipertahankan; tidak menghapus ballot atau menonaktifkan trigger. NIM dummy yang sama digunakan pada periode-periode berbeda. Data HIMA tidak diekspor, disalin, atau disetel ulang.

## Hasil dan batas pengujian

Laporan JSON berisi jumlah respons, p50/p95/maksimum durasi, penolakan 429, error HTTP lain, timeout/jaringan, hasil pemeriksaan status, dan kecocokan consumed dengan jumlah ballot. Token sesi, secret dan password tidak dimasukkan dalam laporan. Dua request pengiriman ulang memeriksa jumlah ballot tetap sama. Semua artefak berada di `.qa`, diabaikan Git.

Timeout HTTP 15 detik mengikuti pengalaman client voting; abort pada browser tidak membatalkan transaksi server. Runner memberi waktu tambahan sampai 30 detik sebelum merekam jumlah akhir, tetapi request yang sangat lama masih perlu ditinjau. Hasil `passed=false` bukan alasan mengirim ulang semua suara atau menganggap kapasitas sudah memadai.

Ini pengujian API pada build produksi lokal dengan database Supabase uji, bukan 200 browser, pengujian rendering foto/halaman, ataupun bukti kapasitas deployment Vercel. Ukuran compute, lokasi database, jaringan laptop dan resource hosting memengaruhi hasil. Jalankan tes Vercel preview secara terpisah sebelum menyatakan kapasitas produksi.

## Hasil kapasitas 12 November 2026

Lingkungan: build produksi lokal, Node 24, database project uji Supabase di Mumbai, pool Prisma aplikasi maksimum lima koneksi. Masing-masing tahap mencoba 200 NIM, lalu burst pengiriman dengan concurrency yang sama. Pemeriksaan status dilakukan sesudah pengiriman dengan concurrency maksimum 25. Kuota jaringan hanya pada salinan capacity adalah 1.000; kuota aplikasi asli tidak berubah.

| Pengguna bersamaan | Cek NIM diterima | p95 cek NIM | Kirim suara diterima | p95 kirim | Suara / hak terpakai |
|---|---|---|---|---|---|
| 10 | 200/200 | 1,96 detik | 200/200 | 1,18 detik | 200/200 |
| 25 | 200/200 | 5,86 detik | 200/200 | 2,96 detik | 200/200 |
| 50 | 200/200 | 9,87 detik | 200/200 | 6,19 detik | 200/200 |
| 200 | 0/200 | Deadline 15 detik | Tidak dikirim | Tidak diukur | 0/0 |

Tahap 10/25/50 juga mengonfirmasi 200 status recorded dan dua pengiriman ulang yang ditolak tanpa menambah ballot. Tahap 200 berhenti pada pemeriksaan NIM: seluruh request klien berakhir sekitar batas 15 detik; tidak ada sesi diterima sehingga pengiriman suara tidak dimulai. Ini menunjukkan alur 200 serentak belum lulus pada konfigurasi uji, bukan bukti database kehilangan suara ataupun server crash. Perlu investigasi antrean/round-trip/pool serta pengujian Vercel sebelum menyimpulkan kapasitas produksi.

Laporan rinci: `.qa/voting-load-test/report-capacity-d6d51138-6c33-4352-a99f-84b4a0eb3def.json`. Source/artefak setup pernah diperbaiki karena endpoint kesehatan memakai awalan folder privat Next.js; hasil gagal startup itu tidak dimasukkan sebagai hasil kapasitas. Seluruh data dalam project uji adalah dummy dan environment HIMA tidak diganti.

## Hasil limiter 12 November 2026

Build salinan mode limiter memakai batas asli. Pada concurrency 10, 200 request cek NIM menghasilkan tepat 50 respons sukses dan 150 respons 429, tanpa error HTTP lain atau jaringan. Pengujian 200 request cast secara independen juga menghasilkan 50 sukses dan 150 respons 429. Database mencatat 50 ballot dan 50 hak terpakai; seluruh 50 pemeriksaan status mengonfirmasi recorded. Dua pengiriman ulang ditolak limiter dan tidak menambah ballot.

Laporan: `.qa/voting-load-test/report-limiter-e001a4eb-b716-46bf-8b33-6dfa3d88bd43.json`. Ini membuktikan pembatasan jaringan bersama bekerja sesuai konfigurasi, sekaligus menunjukkan 200 mahasiswa pada satu Wi-Fi dapat berbagi kuota 50/10 menit. Jangan menyamakan penolakan 429 dengan kehabisan kapasitas server.

Pada akhir uji kapasitas: 88 tes lokal, lint dan TypeScript lulus; build produksi kedua mode berhasil. Kedua server uji dihentikan setelah simulasi. Tidak ada perubahan pada limiter, pool Prisma ataupun environment aplikasi HIMA selama setup kapasitas. Hasil ini belum memverifikasi deployment Vercel dan belum menyelesaikan bottleneck 200 pengguna serentak. Pengujian fungsional berikutnya beserta perbaikan CSP untuk localhost dicatat pada [VOTING_FUNCTIONAL_TEST.md](VOTING_FUNCTIONAL_TEST.md).
