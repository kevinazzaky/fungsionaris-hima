# E-voting HIMA TI (prototipe NIM-only)

## Lingkup dan tampilan

Implementasi mengikuti Next.js App Router, lapisan domain/use case/repository, Prisma PostgreSQL, Supabase Auth dan Storage existing. Tidak ada framework atau database baru. `/voting` memakai navbar/footer publik; `/admin/voting` memakai layout dan autentikasi admin existing. Sesuai arahan pengguna, akses voting tidak ditambahkan ke navbar: section khusus setelah Tentang Kami menjadi pintu masuk utama di beranda, dengan tautan tambahan di footer. Ikon CheckSquare menandai tindakan memilih; panel kanan memisahkan informasi dan CTA dari pengantar tanpa mengubah hero existing.

Design Read: halaman pemilihan mahasiswa dengan bahasa visual landing page HIMA TI. ENERGY 2 / RHYTHM 2 / MOTION 1. Amber menjadi aksen tindakan dan nomor urut, zinc gelap untuk hero, putih untuk bacaan panjang. Figtree dan Rubik memakai font existing. Kartu berbobot sama menjaga perlakuan kandidat setara, dengan jumlah mengikuti calon yang ditambahkan panitia. Grid 1/2/3 kolom mengikuti layar. Avatar existing dipakai saat foto belum diunggah, tanpa identitas/foto mahasiswa rekaan. Dialog native menjaga fokus dan Escape; gerak sebatas feedback kontrol dan menghormati reduced motion. Panel admin mengikuti `ADMIN_DESIGN.md`.

## Batas keamanan

**NIM bukan autentikasi identitas. Orang yang mengetahui NIM orang lain dapat menyalahgunakan hak pilihnya.** Rate limit, token bertanda tangan dan transaksi membatasi request serta penggunaan hak pilih berulang; semuanya tidak membuktikan siapa pemilihnya. Turnstile dihapus sesuai permintaan pengguna, sehingga tidak ada pemeriksaan CAPTCHA dan perlindungan terhadap bot berkurang. Gunakan hanya untuk uji prototipe dengan data dummy. Jangan gunakan sebagai pemilihan resmi sebelum tersedia verifikasi identitas terpercaya, review keamanan independen dan persetujuan panitia.

Panitia bertanggung jawab memverifikasi sumber DPT benar-benar mahasiswa aktif TI pada periode tersebut. Sistem memeriksa format, kolom prodi/aktif/periode dan keanggotaan DPT, bukan mengakses sumber akademik universitas.

Tabel `eligible_voters` menyimpan HMAC NIM yang terikat ID pemilihan dan flag kelayakan/pemakaian; tidak menyimpan NIM mentah. `ballots` hanya menyimpan ID acak, ID pemilihan dan ID kandidat, tanpa NIM, IP, email, waktu maupun relasi pemilih. Tidak ada pencatatan pilihan individu pada audit aplikasi. Pemisahan ini tidak menjamin anonimitas terhadap administrator database: WAL, backup, waktu request, akses server, trafik jaringan dan urutan transaksi dapat dikorelasikan. Operator harus menonaktifkan pencatatan body request/token pada hosting, APM, proxy dan database, membatasi akses, serta menetapkan retensi dan penghapusan data. Backup dan restore harus mencakup seluruh transaksi; jangan mengembalikan DPT terpisah dari surat suara.

Pengecekan NIM dilakukan sebelum daftar kandidat ditampilkan. Hanya NIM yang layak dan belum digunakan yang menerima token sesi. Sesuai permintaan pengguna, pesan penolakan membedakan NIM belum terdaftar, sudah digunakan, dan belum memiliki hak pilih pada periode ini. Respons ini mengungkap status hak pilih; rate limit membatasi percobaan tetapi tidak menghilangkan risiko enumerasi. Pemeriksaan DPT ulang tetap dilakukan dalam transaksi submit untuk mencegah dua sesi memakai hak yang sama. Token sesi bukan bukti identitas.

## Koneksi terputus dan batas request voting

Saat pengiriman suara gagal mendapat respons (termasuk timeout 15 detik), browser memeriksa POST `/api/voting/status` memakai token sesi yang sama. Endpoint memvalidasi signature dan kedaluwarsa, lalu membaca flag consumed dari transaksi voting; tidak membaca/mengembalikan kandidat pilihan, tidak menulis ballot, dan tidak membuat relasi pemilih ke ballot. Token hanya berlaku 15 menit. Respons status tidak di-cache dan memerlukan origin yang sesuai.

Status recorded menampilkan konfirmasi sukses. Status not_recorded hanya berarti hak pilih belum terlihat terpakai saat dibaca, bukan jaminan request sebelumnya sudah berhenti. Karena itu pilihan tetap dikunci; pengguna dapat memeriksa lagi atau mengirim ulang kandidat yang sama. Transaksi satu hak pilih tetap mencegah dua ballot. Jika pemeriksaan tidak terjangkau, ditolak, token kedaluwarsa atau respons tidak dikenal, status tetap unknown: tidak otomatis mengirim suara lagi. Tombol cek manual tersedia; event online mencoba pemeriksaan status ketika jaringan kembali. Setelah reload halaman, state sesi tidak dipulihkan dari storage; pengguna perlu memasukkan NIM kembali.

Atas permintaan pengguna, batas jaringan menjadi 50 pemeriksaan NIM dan 50 pengiriman suara per bucket 10 menit, dihitung terpisah. Batas per NIM untuk pemeriksaan/pengiriman tetap 5 masing-masing. Endpoint status memiliki bucket tersendiri: 60 per jaringan dan 10 per sesi hak pilih dalam 10 menit, sehingga tidak menghabiskan kuota cast. Di Vercel jaringan memakai x-vercel-forwarded-for yang di-HMAC; di luar Vercel memakai bucket shared. IP bersama tetap dapat membuat beberapa pengguna berbagi kuota. Tidak ada perubahan skema atau penghapusan limiter.

## Konfigurasi dan menjalankan

Gunakan environment database/Auth/Storage existing dari `.env.example`. Tambahkan `VOTING_SECRET` acak minimal 32 karakter (server-only; buat dengan `openssl rand -hex 32`) dan `VOTING_PROTOTYPE_ENABLED=true` hanya di lingkungan uji. Tidak ada key pihak ketiga yang diperlukan untuk alur voting. Jangan mengganti `VOTING_SECRET` selama periode berjalan: HMAC DPT dan token lama akan tidak cocok. Mode prototipe lokal telah diaktifkan sesuai arahan untuk pengujian, tetapi perubahan ini tidak menjadwalkan atau membuka periode pemilihan di database.

Untuk Supabase yang memakai CA khusus, gunakan `sslmode=verify-full` dan `sslrootcert` pada URL koneksi. CA publik resmi tersedia pada `supabase/certs/prod-ca-2021.crt`; catatan sumber dan fingerprint ada di folder tersebut. Konfigurasi lokal HIMA telah dipasang dan migration voting diterapkan atas permintaan pengguna pada 10 November 2026; voting tetap nonaktif. Detail pemeriksaan tersedia di `QA_VOTING.md`.

1. `npm ci`
2. `npm run db:generate`
3. Tinjau migration `20261110000000_voting` pada database uji dahulu, lalu jalankan `npm run db:migrate` di lingkungan yang disetujui. Migration tidak dijalankan otomatis oleh aplikasi.
4. `npm run dev`, buka `/voting` dan login admin existing di `/admin/login`.
5. Pada `/admin/voting`, pilih tahun pemilihan. Periode existing langsung dibuka; tahun baru otomatis disiapkan sebagai draft tanpa menghapus data periode lain. Tekan **Tambah kandidat**, isi profil/foto/visi/misi/program kerja, lalu simpan. Jumlah calon tidak dibatasi enam; setidaknya satu calon dengan profil lengkap diperlukan sebelum konfirmasi jadwal. Impor DPT, atur awal/akhir, lalu konfirmasi jadwal uji. Jadwal dikunci setelah dikonfirmasi. Tidak ada pemilihan yang otomatis dibuka oleh migration atau pemilihan tahun.

Alur mahasiswa: masukkan NIM, pilih kandidat dan konfirmasi pengiriman. Server memeriksa DPT dan menghabiskan hak pilih hanya pada transaksi penyimpanan suara. Setelah sukses, identitas/pilihan dihapus dari state halaman; ucapan terima kasih tampil selama tiga detik lalu browser mengganti halaman dengan beranda. Tombol kembali manual juga tersedia. Halaman tidak mengalihkan pengguna ketika pengiriman gagal.

## CSV DPT

Program kerja boleh kosong, termasuk saat konfirmasi jadwal. Untuk program yang sudah ada, hanya judul wajib diisi. Deskripsi dan sasaran opsional, disembunyikan dari tampilan ketika kosong. Foto, nama, visi dan misi kandidat tetap wajib lengkap; aturan waktu dan kelayakan NIM tetap berlaku. Form jadwal memakai kalender bahasa Indonesia dengan pilihan jam/menit WITA yang terpisah.

Untuk memasukkan satu pemilih, gunakan form **Tambah satu NIM** pada bagian daftar mahasiswa yang boleh memilih di admin, lalu tekan **Tambahkan NIM**. Panitia memastikan mahasiswa aktif TI dan memenuhi aturan periode yang dipilih. Input manual memakai jalur impor server yang sama: validasi, HMAC, deduplikasi, audit dan kunci draft tetap berlaku. Tidak memerlukan berkas CSV untuk penambahan satu NIM.

Gunakan UTF-8, header `nim,prodi,aktif,periode`, satu pemilih per baris. NIM wajib string tepat 8 angka; nol awal dipertahankan. Prodi wajib `TI`, aktif wajib `true`, periode harus sama persis dengan periode draft. Contoh format dummy 8 angka tersedia di `docs/examples/dpt-dummy.csv`; berkas contoh tidak otomatis diimpor. Preview tidak menyimpan data; konfirmasi memvalidasi ulang di server. Berkas dengan baris bermasalah tidak dapat dikonfirmasi sampai dibenahi. Impor berikutnya menambahkan NIM baru tanpa menggandakan hak pilih. Tidak ada endpoint publik untuk mengunduh DPT.

## Transaksi dan operasional

`cast_hima_ballot` mengunci baris pemilihan, memeriksa status/waktu berdasarkan jam database, memvalidasi kandidat pada pemilihan yang sama, mengubah hak pilih yang belum dipakai secara kondisional, lalu menambahkan surat suara. Kegagalan insert membatalkan perubahan hak pilih. Request bersamaan pada pemilihan yang sama diserialkan; kapasitas ini memadai untuk prototipe HIMA, perlu load test sebelum skala lebih besar. `ballots` tidak dapat diubah/dihapus lewat DML biasa. Trigger mengunci kandidat/DPT setelah jadwal dikonfirmasi dan melarang membuka ulang pemilihan yang ditutup. Pemilik database tetap mempunyai kewenangan menonaktifkan trigger, sehingga ini bukan audit tahan manipulasi oleh pemilik database.

Rate limit tersimpan di PostgreSQL, bukan memory proses. Identitas jaringan memakai header platform yang dipercaya hanya ketika `VERCEL=1`; di luar Vercel semua request berbagi bucket jaringan konservatif. Tambahkan pembatasan ingress yang tepercaya sebelum memakai deployment lain. Bucket per NIM menggunakan HMAC, berumur pendek dan tidak masuk ballots. IP mentah tidak disimpan. Statistik penolakan adalah agregat tanpa kandidat atau NIM. Tidak ada audit submit per pemilih.

Referensi header ingress Vercel: https://vercel.com/docs/headers/request-headers#x-vercel-forwarded-for . Semua mahasiswa di balik satu IP kampus dapat berbagi batas jaringan; sesuaikan batas pada staging berdasarkan load test dan jumlah pemilih sebelum penggunaan yang disetujui.

Waktu disimpan UTC dan form panitia memakai WITA (UTC+08:00). Akhir jadwal menghentikan submit otomatis. Admin dapat melihat hasil sementara per kandidat sejak periode dijadwalkan, dengan pembaruan setiap 5 detik selama halaman aktif. Hasil tetap tersedia setelah penutupan resmi dan diberi label hasil akhir. Ekspor rekap JSON tetap tersedia setelah ditutup. Agregat hanya disajikan melalui endpoint yang memerlukan autentikasi admin. Jika respons sukses terputus, jangan memilih ulang secara membabi buta: hak yang sudah dipakai tetap terkunci, hubungi panitia. Tidak tersedia pelacakan pilihan atau penggantian suara.

Panel admin menampilkan hanya calon yang profilnya sudah ditambahkan, bukan slot kosong. Gunakan **Tambah kandidat** untuk mengisi nama, unggahan foto, visi, misi dan program kerja calon berikutnya; nomor urut diberikan server saat simpan. Calon tersimpan dapat diedit selama draft. Visi tampak di daftar, sedangkan misi/program kerja dapat diperluas dengan kontrol native. Rekap suara akhir berada tepat di bawah daftar calon, bukan pada masing-masing kartu. Sebelum penutupan resmi, rekap tetap disembunyikan. Rekap hanya memuat nomor, nama calon, dan total suara, tanpa identitas pemilih.

Migration `20261110010000_dynamic_voting_candidates` menghapus batas enam nomor urut, mempertahankan calon existing dan mencegah suara ke slot placeholder lama. Slot kosong existing digunakan kembali saat calon baru disimpan; periode baru tidak membuat slot placeholder. Penambahan calon mengunci baris pemilihan sebelum menentukan nomor urut, sehingga request bersamaan tidak mendapat nomor yang sama. Migration ini telah diterapkan ke Supabase HIMA atas arahan lanjutan pengguna; dua profil existing tetap tersedia dan tidak ada calon/suara percobaan ditambahkan.

Sebelum review/persetujuan, jangan deploy, jangan jalankan migration ke produksi dan jangan mengaktifkan pemungutan resmi. Pengujian cloud Auth, Storage dan dua koneksi PostgreSQL nyata perlu dilakukan panitia pada staging terisolasi. Test PGlite memeriksa SQL dan request bersamaan dalam satu engine; itu tidak menggantikan uji multi-koneksi/load test PostgreSQL produksi.

## Pengujian

`npm test`, `npm run lint`, `npm run build`, dan `npm run db:validate`. Dengan dev server pada port 3001, jalankan `node scripts/check-voting-access.mjs http://localhost:3001` untuk memeriksa penolakan akses admin dan origin asing. Hasil dan keterbatasan pemeriksaan tercatat di [QA_VOTING.md](QA_VOTING.md).

## Daftar berkas

Berkas yang ditambahkan:

- `src/app/voting/page.tsx`, `loading.tsx`, `error.tsx`, `voting.css`: halaman dan state publik.
- `src/components/voting/voting-page.tsx`, `voting-dialog.tsx`: alur mahasiswa, profil/konfirmasi dan ucapan terima kasih sebelum kembali ke beranda.
- `src/components/home/voting-section.tsx`: akses dari beranda setelah Tentang Kami.
- `src/app/admin/(panel)/voting/page.tsx`, `src/components/admin/voting-manager.tsx`: panel panitia.
- `src/app/api/voting/check/route.ts`, `src/app/api/voting/ballots/route.ts`: pemeriksaan dan submit publik.
- `src/app/api/admin/voting/route.ts`: pengelolaan, preview/impor, penjadwalan, penutupan, dan rekap.
- `src/domain/voting.ts`: DTO dan validasi NIM, CSV, kandidat, jadwal.
- `src/use-cases/voting.ts`, `src/use-cases/voting-token.ts`: sesi HMAC dan kebijakan hasil.
- `src/use-cases/manage-voting-period.ts`, `tests/voting-period.test.ts`: pemilihan periode existing/baru, penanganan pilihan bersamaan, dan kegagalan penyimpanan.
- `src/data/repositories/voting.ts`, `src/data/voting.ts`: penyimpanan dan pembacaan server-only.
- `src/lib/voting-api.ts`: pembatasan request dan transport publik.
- `prisma/migrations/20261110000000_voting/migration.sql`: tabel, fungsi transaksi, trigger penguncian dan RLS.
- `tests/voting.test.ts`, `tests/voting-security.test.ts`, `tests/voting-database.test.ts`: tes domain, keamanan, SQL.
- `scripts/check-voting-access.mjs`: smoke test HTTP lokal.
- `docs/examples/dpt-dummy.csv`: fixture DPT dummy.
- `docs/EVOTING.md`, `docs/QA_VOTING.md`: panduan dan hasil verifikasi.

Berkas yang diubah:

- `.env.example`: kebutuhan konfigurasi prototipe.
- `prisma/schema.prisma`: model tabel voting di database existing.
- `src/app/page.tsx`: menyisipkan section voting beranda.
- `src/app/admin/admin.css`: tampilan panel voting mengikuti token admin existing.
- `src/components/admin/admin-shell.tsx`: menu Pemilihan Ketua.
- `src/components/layout/footer.tsx`: tautan pemilihan tambahan.
- `src/data/supabase/storage.ts`: folder unggahan kandidat pada bucket existing.

Navbar desktop/mobile, hero dan seluruh fitur existing tetap menggunakan implementasi sebelumnya.
