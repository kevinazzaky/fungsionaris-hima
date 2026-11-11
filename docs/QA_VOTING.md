# Verifikasi prototipe e-voting

Tanggal pemeriksaan: 10 November 2026. Branch: `feat/pemilihan-ketua`.

## Posisi foto di tengah profil, 11 November 2026

Klarifikasi pengguna menggantikan percobaan menyamakan tinggi kolom dengan scroll internal. Pada lebar 640px ke atas, area foto dalam profil terbuka memakai align-self:center, sehingga berada di tengah vertikal terhadap seluruh isi profil. Detail tidak lagi dibatasi tinggi atau diberi overflow:auto/contain:size. Pembacaan menggunakan scroll halaman biasa; rasio foto dan object-fit:contain tetap dipertahankan. Pada layar kecil urutan vertikal sebelumnya tetap berlaku.

Safari memperlihatkan foto kandidat nomor 4 berada di tengah kolom kiri, detail mengalir penuh di kanan, dan kandidat lain tetap di bawah profil aktif. Tidak mengirim suara. Suite 74 tes, lint, TypeScript, dan pemeriksaan whitespace lulus pada pekerjaan ini. Audit keamanan terpisah dicatat di SECURITY_REVIEW_2026-11-11.md; pemeriksaan Supabase hanya metadata baca-saja.

## Transisi buka dan tutup profil, 11 November 2026

Perpindahan profil kini memakai same-document View Transition bawaan browser bila tersedia. Update React dikomit dengan flushSync, kemudian posisi grid dipindahkan ke bawah navbar dalam callback snapshot yang sama. Ini mengganti scroll smooth terpisah yang sebelumnya berjalan bersamaan dengan perubahan urutan. Snapshot grid lama fade out 0,18 detik; grid baru fade dan translateY ringan 0,45 detik. Panel detail menyusul dengan jeda 0,08 detik. Group snapshot tidak menganimasikan ukuran, dan foto tetap contain tanpa transform scale. Penutupan memakai mekanisme transisi yang sama. Nomor, urutan resmi, dan data kandidat tidak diubah.

Browser tanpa API memakai perubahan state biasa dengan animasi masuk CSS. prefers-reduced-motion melewati View Transition dan menonaktifkan animasi CSS. Seluruh 74 tes, lint, TypeScript, dan git diff --check lulus. Safari masih tertahan pada Memuat informasi pemilihan sehingga kualitas gerakan belum diverifikasi langsung. Tidak ada perubahan database atau suara untuk revisi ini.

## Profil kandidat ke paling atas, 11 November 2026

Ketika profil dibuka, daftar render memindahkan kandidat aktif menjadi elemen pertama tanpa mengubah nomor, ID, maupun data kandidat. Kandidat lain mempertahankan urutannya; menutup profil mengembalikan urutan semula. Kartu terbuka melakukan scrollIntoView dengan scroll-margin-top 7rem agar awal profil berada di bawah navbar. Animasi scroll mengikuti prefers-reduced-motion. Tidak ada perubahan database.

Tes memeriksa profil nomor 2 menghasilkan urutan tampilan 2,1,3 tanpa memutasi sumber 1,2,3, serta profil kosong/tidak dikenal mempertahankan urutan awal. Seluruh 74 tes, lint, dan TypeScript lulus. Pemeriksaan Safari belum mencapai interaksi profil karena halaman masih menampilkan Memuat informasi pemilihan setelah dimuat ulang; scroll dan posisi visual belum diverifikasi langsung.

## Hasil berjalan di admin dan teks angkatan, 11 November 2026

Build produksi `npm run build -- --webpack` lulus setelah dilanjutkan kembali.

Sesuai arahan pengguna, dashboard admin membaca agregat kandidat ketika status scheduled maupun closed. Draft dan status tidak dikenali tidak membaca hasil. Tabel menampilkan Hasil sementara atau Hasil akhir; angka nol tetap ditampilkan untuk calon tanpa suara. Polling GET admin berjalan setiap 5 detik ketika halaman terlihat, tidak sedang menyimpan/memuat data atau membuka dialog; respons terlambat tidak boleh mengganti periode baru. Polling dibatalkan saat periode berganti, ditutup, atau komponen dilepas. Gagal refresh mempertahankan data sebelumnya dengan pesan error; Muat ulang dan refresh sukses membersihkannya. Endpoint tetap memerlukan requireAdmin, hasil publik tidak ditambahkan, dan ekspor JSON tetap menunggu penutupan resmi.

Teks bantuan NIM kini menyebut mahasiswa aktif TI angkatan 2024, 2025, dan 2026. Periode pemilihan tidak diubah. Seluruh 73 tes, ESLint, dan TypeScript lulus. Safari memperlihatkan status pemilihan dibuka, tabel Hasil sementara periode 2026/2027 berisi enam kandidat dengan 0 suara, label pembaruan setiap 5 detik, dan teks angkatan baru. Tidak mengirim suara atau menutup periode untuk menguji perubahan angka.

## Hapus NIM dummy dan batasi 8 angka, 11 November 2026

Atas permintaan pengguna, 10 NIM dummy lama dengan format 9 angka (000000001 sampai 000000010) dihapus dari periode 2026/2027 berdasarkan HMAC masing-masing. Periode sudah dijadwalkan kembali; transaksi operator mengunci periode, memastikan seluruh dummy belum consumed, menghapus hanya sepuluh record tersebut, dan mengaktifkan kembali trigger voters_frozen sebelum commit. Satu NIM manual tetap tersimpan. Assert memastikan record selain dummy identik, profil dan nomor kandidat identik, jadwal/status tidak berubah, serta jumlah suara tidak berubah. Audit penghapusan disimpan dan cadangan record yang dihapus disimpan lokal mode 0600. Tidak ada NIM dummy baru yang diimpor.

Validasi normalizeNim sekarang wajib tepat 8 angka. Form publik dan input manual admin memakai pattern, minLength, dan maxLength 8; tombol tambah manual nonaktif bila panjang bukan 8. Impor CSV memakai validasi server yang sama. Berkas contoh CSV disesuaikan ke 8 angka. Tes memastikan 7/9 angka ditolak, NIM 8 angka diterima dengan nol awal tetap ada, dan baris CSV yang tidak sesuai dilaporkan. Seluruh 73 tes, lint, dan TypeScript lulus. Tampilan browser belum diperiksa ulang untuk revisi ini.

## Reset dan nomor kandidat, 11 November 2026

Setelah pengguna menutup periode 2026/2027 dan meminta reset, pemeriksaan Supabase menunjukkan status closed dengan 3 surat suara. Transaksi operator menghapus 3 suara, memulihkan 3 hak pilih, mengembalikan periode ke draft dengan jadwal kosong, serta mengurutkan kandidat: Bayu 1, Dandi 2, Yoga 3, Ardelia Naenda Ahmadi 4, Dika 5, Gede Bagus Indra Tanaya 6.

Assert sebelum commit memastikan seluruh field profil selain nomor urut identik, 11 NIM terdaftar tetap ada dengan consumed=false, jumlah surat suara nol, nomor 1 sampai 6 sesuai ID kandidat, audit lama tetap ada dengan tujuh entri tambahan, dan ketiga trigger proteksi tetap aktif. Reset tidak mengganti nama resmi, foto, visi, misi, atau proker. Cadangan sebelum reset tersimpan lokal dengan mode 0600. Commit berhasil; jadwal baru harus dikonfirmasi melalui admin sebelum pemilihan dibuka kembali. Tidak ada perubahan kode aplikasi untuk operasi data ini.

## Pesan pemeriksaan NIM, 11 November 2026

Revisi pengguna membedakan pesan NIM belum terdaftar, sudah digunakan, dan terdaftar tetapi tidak memiliki hak pilih. Pemeriksaan membaca eligible dan consumed dari record periode yang sama; hanya eligible=true dan consumed=false menerima token. Batas request dan transaksi submit tetap berlaku. Tes memeriksa ketiga penolakan dengan pesan masing-masing serta penerbitan token hanya untuk hak tersedia. Seluruh 73 tes, lint, dan TypeScript lulus. Belum dicoba ulang melalui browser; tidak ada perubahan data atau skema database.

## Kartu pilihan dan banner, 11 November 2026

Revisi terakhir pengguna membatalkan desain pilihan sementara di bawah ini. Tampilan kembali ke tombol kuning Pilih kandidat pada tiap kartu yang langsung membuka konfirmasi, tanpa radio, centang, penanda terpilih, ringkasan sticky, atau Lanjutkan. Banner OPREC tetap disembunyikan pada halaman voting. Uraian berikut mencatat pengujian desain yang sempat dicoba.

Arahan visual: halaman pemilihan mahasiswa dengan identitas putih, hitam, dan kuning HIMA. ENERGY 1 / RHYTHM 1 / MOTION 1. Grid seragam menjaga perlakuan setara kepada kandidat; kuning menandai pilihan; gradasi foto mempertahankan keterbacaan nama; bayangan hanya pada ringkasan sticky untuk membedakannya dari kartu yang lewat di belakang.

Kontrol pemilihan memakai radio native bernama sama. Sesuai revisi berikutnya, tampilannya berupa tombol putih kecil Pilih kandidat yang berubah kuning dengan teks Terpilih, tanpa lingkaran atau centang. Kartu terpilih memiliki tepi kuning. Pilihan sementara terpisah dari kandidat pada dialog konfirmasi. Satu tombol Lanjutkan membuka konfirmasi existing; membatalkan mempertahankan pilihan, mengganti NIM membersihkannya. Profil tetap dibuka melalui tombol terpisah. Banner OPREC tidak dipasang oleh SiteChrome pada /voting beserta subpath-nya.

- PASS perilaku: Safari dengan NIM dummy menerima sesi, tombol Lanjutkan awalnya nonaktif, pemilihan memperbarui ringkasan tanpa dialog, tombol panah mengganti radio secara eksklusif, profil terbuka tanpa mengganti pilihan, Lanjutkan membuka kandidat yang sesuai, dan Kembali memilih mempertahankannya. Tidak menekan Kirim suara saya.
- PASS tampilan desktop: screenshot memperlihatkan tiga kolom, batas pilihan kuning, ringkasan sticky, dan banner OPREC tidak ada. Foto tetap memakai contain; nama dan tombol profil tetap berdampingan sesuai arahan sebelumnya.
- PASS pemeriksaan kode: 74 tes, ESLint, TypeScript, dan build produksi Webpack lulus. Build Turbopack terkendala izin membuka port lokal; Webpack berhasil setelah akses jaringan untuk Google Fonts tersedia.
- Batas verifikasi: belum meninjau perangkat seluler nyata dan belum mengirim suara end-to-end untuk perubahan ini. Muat ulang Safari terakhir tertahan pada loading data, setelah alur interaksi di atas selesai diperiksa.

## Program opsional dan kalender jadwal, 11 November 2026

Arahan terbaru memperbolehkan program kosong saat konfirmasi jadwal; pemeriksaan foto, nama, visi, misi, waktu dan NIM tetap berlaku. Tes penjadwalan tanpa program terlihat gagal sebelum perbaikan dan lulus sesudahnya. Tidak menambahkan program rekaan untuk meloloskan jadwal.

Pemilih datetime bawaan diganti kalender bulan bahasa Indonesia, penanda hari ini/tanggal dipilih, navigasi bulan dan tombol hari ini. Jam serta menit dipilih terpisah; nilai yang dikirim tetap format lokal WITA existing dan divalidasi server. Tombol arah pada tanggal mendukung perpindahan hari/minggu dan Escape menutup kalender. Kalender memakai helper UTC untuk menghindari pergeseran tanggal browser. Dua tes memeriksa awal bulan, kabisat, pergantian tahun dan penolakan bulan invalid.

73 tes, lint dan build lulus. Safari memperlihatkan form dan kalender terbuka dengan tanggal terpilih sesuai nilai existing. Tidak menekan konfirmasi jadwal; tidak ada perubahan periode/data. Semua navigasi keyboard, pilihan jam dan viewport mobile belum diuji menyeluruh sehingga gate runtime penuh belum dinyatakan lulus.

## Penggantian kandidat dari spreadsheet panitia, 11 November 2026

Pengguna meminta seluruh nama lama diganti dengan semua baris spreadsheet, bukan mencocokkan profil lama. Berkas dibaca tanpa mengubah sumber. Tujuh baris kandidat divalidasi; urutan nomor mengikuti baris sumber. Visi dipertahankan, penanda daftar misi dinormalisasi, program diambil judulnya saja. Dua kolom program kosong/tanda strip disimpan sebagai daftar kosong, tanpa mengarang judul. Foto lama tidak dipindahkan ke identitas baru; seluruh foto baru perlu diunggah panitia.

Sebelum impor, periode 2026/2027 diverifikasi draft, 0 surat suara dan 6 record kandidat. Keenam record diganti tujuh record baru dalam satu transaksi dengan kunci periode dan audit administratif. Snapshot kandidat lama disimpan privat di direktori sementara untuk pemulihan. Data NIM pada spreadsheet tidak diimpor ke tabel kandidat atau daftar pemilih. Tidak mengubah NIM terdaftar, surat suara, jadwal, atau status draft. Isi nama/visi/misi/program sesudah simpan dibandingkan dengan data yang dipersiapkan dan cocok.

Validasi dan editor kini menerima program judul saja. Draft dapat menyimpan program kosong, sedangkan konfirmasi jadwal tetap mewajibkan program lengkap dan foto tiap calon. Tes program judul saja serta draft kosong terlihat gagal sebelum perbaikan; seluruh 71 tes, lint dan build lulus. Tampilan browser setelah impor belum diverifikasi ulang.

## Kartu kandidat 9:16 dan profil menyamping, 11 November 2026

Mengikuti referensi dan arahan terakhir pengguna, kartu kandidat memakai bidang foto 9:16 dengan tiga kolom desktop, dua tablet dan satu mobile. Nama, ringkasan visi, tombol profil dan pilihan ditumpangkan pada foto. Gradasi gelap hanya menjaga keterbacaan caption; foto memakai `contain` agar tidak dipotong atau diregangkan. Foto yang rasionya berbeda menyisakan ruang netral gelap. Profil terbuka memenuhi satu baris dengan foto di kiri dan rincian di kanan; di mobile rincian berada di bawah. Pemilihan masih memerlukan modal konfirmasi existing. Tidak ada data referensi rekaan yang dimasukkan sebagai kandidat.

Animasi CSS memunculkan panel dengan translasi/opacity selama 300 ms, dinonaktifkan untuk reduced motion. Percobaan animasi layout sebelumnya terlihat mendistorsi foto/teks dalam Safari dan diganti dengan CSS tanpa scaling. Screenshot berikutnya menunjukkan profil utuh dan rincian terlihat. Buka profil dan tutup profil diuji di Safari desktop; mobile, reduced-motion runtime dan semua kandidat belum diuji menyeluruh. 71 tes, lint dan build lulus. Dua tes baru memeriksa konten kartu tertutup/terbuka serta pilihan disembunyikan ketika voting tidak tersedia. Database dan surat suara tidak diubah.

## Pembaruan styling admin, 11 November 2026

Atas arahan pengguna, tampilan admin memakai latar putih dan sidebar netral terang, aksen kuning HIMA serta font existing. Panel voting berulang diganti section terbuka dengan garis pemisah ringan; ruang dan ukuran angka membedakan ringkasan dari daftar kandidat. Tombol, input, foto dan dialog diberi radius berbeda sesuai fungsi. Tujuannya mengurangi kepadatan bingkai tanpa mengubah hierarki, label, fokus keyboard atau kontrol existing. ENERGY 2 / RHYTHM 2 / MOTION 1; transisi hanya pada hover kontrol.

Lint, build dan diff whitespace lulus. Screenshot Safari desktop sebelum/sesudah memperlihatkan perubahan; rincian misi/program kandidat dibuka dan isinya teramati. Styling dibatasi namespace `.admin`, tidak mengubah backend, data, status periode atau hak akses. Semua halaman admin dan viewport mobile belum melalui click-through lengkap; gate runtime penuh belum dinyatakan lulus. Suite unit tidak diulang untuk perubahan CSS ini.

## Pemisahan langkah NIM dan kandidat

Setelah sesi NIM diterima, hero dan panel NIM dilepas dari tampilan; daftar kandidat menjadi isi utama dengan tombol Ganti NIM. Dua kartu menggunakan dua kolom terpusat di desktop, satu kartu dibatasi lebarnya, dan tiga atau lebih mengikuti grid tiga kolom. Kartu menggunakan body fleksibel tanpa tinggi ringkasan buatan dan kedua tombol sejajar. Heading menerima fokus programatis tanpa bingkai dekoratif; fokus kontrol interaktif tetap terlihat. Tujuan susunan ini adalah memusatkan perhatian pada perbandingan calon setelah langkah NIM selesai, dengan palet putih/hitam/kuning existing dan ENERGY 2 / RHYTHM 2 / MOTION 1.

69 tes, lint dan build lulus. Safari dapat dibaca tetapi periode uji telah ditutup (11 pemilih, 1 surat suara teramati di admin); tidak dibuka ulang atau direset. Karena sesi kandidat tidak tersedia, visual kartu terbaru dan click-through tahap tersebut belum diverifikasi langsung. Pemeriksaan runtime lengkap tetap tertunda; tidak ada klaim gate UI penuh lulus.

## Pembaruan visual halaman voting

Area utama menyatukan judul/jadwal di kiri dan panel NIM/status di kanan pada desktop, lalu menjadi satu kolom di layar kecil. Hitam, amber, font dan tombol mengikuti landing page. Satu panel putih menandai tugas utama; tidak menambah ilustrasi, framework atau data buatan. ENERGY 2 / RHYTHM 2 / MOTION 1 dipertahankan. Saat ditutup, CTA memasukkan NIM dihapus dan tersedia tautan kembali ke beranda.

68 tes, lint dan build lulus. Tes status ditutup terlihat gagal sebelum perubahan dan lulus setelahnya. Safari desktop menampilkan komposisi baru tanpa teks bertumpuk; tombol Kembali ke beranda diklik dan navigasi ke localhost:3000/ teramati. Form terbuka diuji melalui render otomatis; click-through alur terbuka dan tampilan mobile belum diverifikasi ulang. Gate UI runtime lengkap masih terbuka. Tidak mengubah status periode, DPT atau surat suara.

## Pembaruan alur NIM terlebih dahulu

Form NIM dipindahkan sebelum daftar kandidat. Kandidat baru dirender setelah sesi diterima; input membuang karakter selain angka dan mempertahankan nol awal. Server kini menolak hak pilih tidak tersedia pada langkah awal dengan pesan umum, tanpa membedakan NIM tidak terdaftar, tidak layak atau sudah digunakan. Keberhasilan cek tetap memberikan sinyal kelayakan; batas request tetap berlaku. Validasi atomik ketika submit dipertahankan untuk menghadapi perubahan waktu dan request bersamaan.

Tes regresi penolakan sesi awal terlihat gagal sebelum perbaikan dan lulus sesudahnya. Tes render memverifikasi form NIM tersedia tanpa kartu kandidat pada tampilan awal. Seluruh 67 tes, lint dan build lulus. Tema, tipografi dan komponen existing dipertahankan; form didahulukan agar mahasiswa menyelesaikan satu langkah sebelum melihat pilihan (ENERGY 2 / RHYTHM 2 / MOTION 1). Click-through browser penuh belum diverifikasi; gate UI R-35 masih terbuka. Tidak ada suara percobaan atau perubahan data HIMA dalam pekerjaan ini.

## Hasil pemeriksaan

| Pemeriksaan | Hasil | Bukti/cakupan |
| --- | --- | --- |
| `npm test` | PASS | 66 tes, termasuk seluruh suite existing, transaksi voting, kandidat dinamis, penyembunyian hasil dan pemilihan periode existing/baru |
| `npm run lint` | PASS | Tidak ada error/warning ESLint |
| `npm run build` | PASS | Build Next.js 16.4.5 dan TypeScript; route `/voting`, `/admin/voting`, dan API tercantum |
| `npm run db:validate` | PASS | Schema Prisma valid; client berhasil dihasilkan |
| `node scripts/check-voting-access.mjs http://localhost:3001` | PASS | API admin GET, ekspor dan POST tanpa login = 401; dashboard = 307 ke login; API publik menolak origin asing dengan 403 dan `no-store` |
| Transaksi dan rollback | PASS | SQL migration dijalankan dalam PGlite: tiga request bersamaan untuk hak yang sama menerima satu suara; kegagalan insert tidak menghabiskan hak pilih |
| Pembatasan periode/kandidat | PASS | Draft, belum mulai, lewat akhir, ditutup, kandidat asing/tidak ada ditolak; profil dan DPT terjadwal tidak dapat diubah; DPT tidak dapat dipindah ke draft lain |
| Kerahasiaan | PASS | Kolom ballots hanya `id`, `election_id`, `candidate_id`; role `anon` dan `authenticated` tidak dapat membaca ballots/DPT atau memanggil fungsi cast |
| Pemeriksaan hak pilih | PASS | Sesi hanya diterbitkan untuk hak pilih tersedia; penolakan awal tidak membedakan tidak terdaftar/tidak layak/sudah dipakai. Token rusak/kedaluwarsa ditolak. Respons sukses tetap merupakan sinyal kelayakan |
| Hasil pemilihan | PASS | Callback pembacaan hasil tidak dipanggil sebelum status resmi `closed`, termasuk ketika waktu sudah habis |
| Kontras UI baru | PASS | Checker skill: zinc di amber 10,61:1; teks sekunder di putih 7,73:1; amber gelap di latar terang 6,79:1; teks terang di hero 13,46:1 |
| `git diff --check` | PASS | Tidak ada whitespace error pada diff tracked |

## UI yang diamati langsung

- Safari desktop: hero, grid tiga kolom, enam kandidat placeholder, dialog profil berisi visi/misi/program/sasaran, tutup melalui Escape.
- Chrome viewport 375 × 812 setelah reload: navbar mobile, hero, CTA dan metadata pemilihan terlihat tanpa teks keluar dari viewport. Console yang diamati tidak menampilkan error aplikasi.
- Accessibility tree beranda memastikan section pemilihan muncul setelah Tentang Kami dan sebelum Susunan Fungsionaris. Tautan CTA menuju `/voting`. Navbar tetap lima tautan existing; voting tersedia di section beranda dan footer.
- Peninjauan browser lanjutan terhenti karena layanan Computer Use mengembalikan `noWindowsAvailable`. Pemeriksaan visual tablet, seluruh kontrol panitia, serta alur kirim suara melalui browser belum lengkap.

## Gate UI dan batas verifikasi

Implementasi menggunakan direction existing dan Design Read di `EVOTING.md`: ENERGY 2 / RHYTHM 2 / MOTION 1. Tidak menambahkan identitas/foto mahasiswa rekaan, hasil sementara, angka partisipasi buatan, tema/font baru atau kontrol dekoratif. Grid kandidat setara karena semua kandidat harus mendapat perlakuan presentasi yang sama. CTA, input, error, dialog, loading dan empty state memiliki perilaku eksplisit; dialog menggunakan focus trap native dan focus return, kontrol mengunci submit melalui ref saat request berjalan. Global reduced-motion existing berlaku.

Gate antislop belum dapat dinyatakan lulus penuh untuk rilis: R-35 memerlukan click-through seluruh kontrol dan alur runtime. Pemeriksaan ini belum mencakup login panitia, unggah foto cloud, konfirmasi impor/schedule/close di database staging dan pengalihan setelah submit berhasil. Ini adalah hasil implementasi prototipe lokal beserta batas pemeriksaannya, bukan persetujuan pelaksanaan pemilihan resmi.

## Belum dijalankan

- Uji end-to-end memakai Supabase Auth/Storage dan alur voting tanpa Turnstile.
- Uji dua koneksi PostgreSQL independen dan load test. PGlite menjalankan permintaan bersamaan dalam satu engine; jangan menganggapnya bukti benchmark atau uji multi-koneksi produksi.
- Verifikasi akademik sumber DPT, audit keamanan independen dan persetujuan panitia.
- Deployment, commit, push, atau aktivasi voting resmi.

Gunakan prosedur konfigurasi dan batas keamanan di `EVOTING.md`. Tidak ada data mahasiswa asli dalam fixture atau pengujian voting.

## Pembaruan koneksi dan migration HIMA, 10 November 2026

Atas permintaan eksplisit pengguna, konfigurasi dari file lokal miliknya dipasang pada `.env.local` (diabaikan Git, permission 0600). `NEXT_PUBLIC_SITE_URL` diarahkan ke localhost:3001 dan `VOTING_PROTOTYPE_ENABLED=false`. Nilai credential tidak dicetak, dimasukkan dokumentasi, atau disimpan di Git.

Koneksi membutuhkan CA Supabase. CA resmi diunduh dari alamat yang digunakan source dashboard Supabase ke `supabase/certs/prod-ca-2021.crt`; runtime dan CLI menggunakan `sslmode=verify-full` beserta `sslrootcert`. Koneksi Node pg dan runtime Prisma berhasil tanpa mematikan verifikasi sertifikat.

Lima migration lama telah selesai dan checksum cocok dengan repository. Hanya `20261110000000_voting` yang pending. Tes SQL lokal diulang dan lulus setelah migration dibungkus `BEGIN/COMMIT`. `npm run db:migrate` berhasil menerapkan migration tersebut pada Supabase HIMA; record selesai dan checksum sesudah penerapan diverifikasi.

Verifikasi read-only sesudah migration:

- Ketujuh tabel voting tersedia dengan RLS aktif.
- Role `anon` dan `authenticated` tidak dapat memanggil fungsi cast; akses baca publik ke ballots/DPT tidak diberikan.
- Jumlah periode, kandidat, DPT dan surat suara masih nol. Tidak ada seed dummy atau pengiriman suara pada database HIMA.
- Setting pendaftaran existing adalah `isOpen=true`; status tersebut tidak diubah.
- Satu akun admin existing tersedia; tidak ada akun/password/izin baru dibuat.
- Secret key berhasil mengakses Storage; bucket publik `website-media` tersedia untuk foto kandidat. Bucket privat `registration-files` belum ditemukan. Ini temuan konfigurasi existing, bukan perubahan migration voting; unggah PDF pendaftaran belum dapat dinyatakan siap.
- Voting tetap nonaktif dan server development tidak dijalankan kembali. Tidak ada deployment atau aktivasi pemilihan resmi.

Pengujian login dengan password, upload foto, alur panitia penuh, Turnstile, serta pemungutan suara end-to-end masih belum dijalankan. Penerapan migration ini bukan persetujuan keamanan untuk pemilihan resmi.

## Pembaruan kartu calon admin

Jumlah suara akhir ditampilkan langsung pada kartu setiap calon, sesudah status `closed`, selain tabel rekap. Dua tes rendering memeriksa hasil sebelum penutupan tetap tersembunyi walaupun input jumlah tersedia, serta hasil akhir nol/non-nol ditampilkan dengan benar. Seluruh 61 tes, lint dan pemeriksaan TypeScript lulus. Tidak ada data calon atau suara yang dimasukkan ke database HIMA dalam perubahan UI ini.

## Penyederhanaan alur admin sesuai arahan terbaru

Form Periode baru/Buat draft dihapus. Selector tahun membuka periode existing atau menyiapkan draft untuk tahun baru ketika dipilih pengguna; tidak ada penulisan saat halaman hanya dimuat. Pemilihan periode memvalidasi format dan menggunakan kembali periode yang sama ketika request bersamaan menemui unique constraint. Empat tes tambahan memeriksa pembukaan existing tanpa create, create tahun baru, recovery konflik, dan propagasi kegagalan database.

Daftar calon hanya menampilkan profil yang sudah diisi. Tombol Tambah kandidat membuka form calon berikutnya, maksimum enam; profil existing tidak dihapus. Misi dan program panjang dapat dibaca dengan elemen details/summary native dan focus ring. Hasil dipindahkan ke rekap tepat setelah daftar calon, bukan lagi pada setiap kartu. Batas kerahasiaan/penutupan resmi pada backend tetap berlaku.

Seluruh 65 tes dan pemeriksaan TypeScript lulus. Tidak ada migration baru atau data percobaan yang ditulis ke Supabase HIMA untuk perubahan ini. Peninjauan browser tidak dapat diselesaikan karena Computer Use hanya mengembalikan tampilan Safari kosong; pengiriman form calon/periode ke database HIMA tidak diuji melalui browser.

## Jumlah calon dinamis dan penjelasan daftar pemilih

Arahan terbaru menggantikan batas enam calon. UI, API, penyimpanan kandidat, validasi sebelum penjadwalan, dan halaman publik mengikuti jumlah calon yang ditambahkan. Nomor baru ditentukan di transaksi dengan kunci pemilihan. Calon lama tidak dihapus; slot kosong lama dipakai kembali jika ada, sedangkan periode baru tidak membuat placeholder. Halaman publik hanya menampilkan calon yang sudah diisi dan memiliki empty state ketika belum ada calon.

Migration `20261110010000_dynamic_voting_candidates` diuji di PGlite: calon existing dipertahankan, nomor 7 diterima, nomor 0 ditolak, dan slot placeholder tidak dapat menerima suara. Tes domain menerima satu/delapan calon lengkap dan menolak daftar kosong, foto kosong atau misi kosong. Tes transaksi, race condition, rollback dan akses tetap lulus. Seluruh 66 tes, lint dan build lulus.

Migration diterapkan ke Supabase HIMA setelah pengguna meminta melanjutkan. Pemeriksaan read-only sebelum/sesudah menunjukkan dua profil terisi tetap ada (enam record lama termasuk empat slot kosong), constraint berubah menjadi `number > 0`, dan checksum migration cocok. Fungsi cast menolak placeholder serta tetap tidak dapat dipanggil oleh role publik. Tidak ada data percobaan atau suara ditambahkan.

Judul DPT disederhanakan menjadi Daftar mahasiswa yang boleh memilih. Penjelasan utama menerangkan siapa yang dapat memilih dan satu hak pilih per periode; rincian format CSV tersedia lewat details/summary. Validasi DPT, HMAC, batas request dan kerahasiaan ballots tidak dihapus.

## Impor DPT dummy atas permintaan pengguna

Sepuluh NIM dummy `000000001` sampai `000000010` dari `docs/examples/dpt-dummy.csv` diimpor ke DPT draft periode `2026/2027` di Supabase HIMA atas permintaan eksplisit pengguna. Repository impor normal digunakan, termasuk kunci draft, penanganan duplikat dan audit administratif. `VOTING_SECRET` acak dibuat di `.env.local` karena belum tersedia dan tidak ada DPT existing; nilai secret tidak dicetak atau disimpan dalam Git. Pertahankan secret yang sama bila DPT ini akan digunakan dari deployment lain.

Verifikasi sesudah impor: 10 hak pilih belum digunakan, 0 surat suara, status tetap draft dan voting prototipe tetap nonaktif. NIM dummy harus dikeluarkan dari DPT sebelum pemilihan resmi; jangan memakai hasil periode uji sebagai hasil pemilihan asli.

## Voting tanpa Turnstile dan kembali otomatis

Sesuai arahan pengguna, widget, verifikasi server-side dan kebutuhan environment Turnstile dihapus. Pemeriksaan DPT, HMAC token, rate limit PostgreSQL, same-origin guard, validasi waktu/kandidat dan transaksi satu hak pilih per periode dipertahankan. Tes konfigurasi memastikan key Turnstile tidak diperlukan, tetapi secret pendek/kosong serta mode prototipe nonaktif tetap ditolak. Tes CAPTCHA lama dihapus karena fitur tersebut tidak lagi digunakan. Total suite tetap 66 tes dan seluruhnya lulus, berikut lint dan TypeScript.

Mode prototipe lokal diaktifkan melalui `.env.local` dengan secret DPT existing dipertahankan. Tidak ada query yang menjadwalkan atau membuka pemilihan, dan tidak ada suara dikirim ke Supabase HIMA untuk perubahan ini. Penghapusan CAPTCHA mengurangi perlindungan anti-bot; NIM-only tetap bukan verifikasi identitas.

Setelah respons submit berhasil, halaman menampilkan terima kasih, membersihkan NIM/token/pilihan dari state dan otomatis mengganti halaman ke beranda setelah tiga detik. Tombol kembali manual tetap tersedia. Fokus dipindah ke judul sukses dan timer dibersihkan saat komponen dilepas. Pengalihan browser setelah pengiriman suara nyata belum diuji end-to-end di Supabase HIMA.

## Indikator proses dan perlindungan XSS

Tombol aksi voting, login/password, pendaftaran dan pengelolaan admin memakai label proses dengan spinner. Form terkait menandai aria-busy dan menonaktifkan input saat menyimpan. Guard ref pada handler mutasi mencegah pengiriman ganda sebelum render state berikutnya; guard dibuka kembali pada finally. Tidak ada jeda buatan. Navigasi lokal tetap responsif, dan preferensi reduced motion dihormati.

Di Safari, Muat ulang pada admin voting teramati berubah menjadi Memuat data… dengan tombol disabled selama request, kemudian aktif kembali. Tidak mengirim suara, menyimpan kandidat, atau mengubah data Supabase untuk pengujian UI ini; alur mutasi tersebut belum diuji seluruhnya lewat browser.

Tes helper CSP mencakup kebijakan produksi/development dan payload penutup tag script pada JSON-LD. Tes label pending memastikan teks di-escape. Script check-browser-security memeriksa nonce unik, penolakan nonce palsu, kecocokan nonce semua script SSR, header keamanan, dan larangan unsafe-eval pada mode produksi. Script check-voting-access menerima direktif cache tambahan selama no-store tetap ada. Kedua script lulus terhadap hasil build lokal pada port 3002. Build webpack lulus; deployment Vercel belum dilakukan.

### Perbaikan ukuran spinner dan navigasi

SVG spinner diberi ukuran intrinsik 18 × 18 agar tidak kembali ke ukuran default SVG jika stylesheet belum tersedia. Tes ukuran gagal sebelum atribut ditambahkan, lalu lulus setelah perbaikan. Di Safari tombol Muat ulang teramati tetap ringkas saat disabled dengan spinner sejajar teks, dan kembali aktif setelah request selesai.

Navigasi Link menggunakan useLinkStatus untuk indikator Membuka halaman…, sedangkan navigasi navbar ke beranda memakai useTransition. Status dipasang melalui portal ke body agar tidak terikat posisi header/sidebar. Loading boundary umum, voting, dan admin menampilkan spinner kecil dengan status aksesibel. Navigasi yang sudah tersedia di cache dan scroll lokal tidak diberi jeda buatan. Safari menunjukkan indikator saat berpindah admin voting ke Fungsionaris dan indikator hilang setelah halaman tujuan terbuka. Tidak menyimpan atau menghapus data untuk pemeriksaan ini. Lint, TypeScript dan 78 tes lulus.

## Pemulihan respons suara hilang dan batas 50/50

Empat tes baru memeriksa respons cast hilang setelah commit simulasi, status tidak terjangkau/tidak dikenal, sukses tanpa pemeriksaan tambahan, status not_recorded, dan validasi signature/kedaluwarsa token sebelum membaca repository. Pemeriksaan hanya mengembalikan status consumed, tanpa pilihan kandidat. Kegagalan kirim tidak otomatis mengulang cast; pengguna hanya dapat mencoba kandidat yang sama setelah pemeriksaan belum menemukan suara. UI menyimpan pilihan saat status tidak pasti dan menyediakan cek manual/cek saat event online. Timeout request 15 detik tidak membatalkan transaksi yang mungkin berjalan di server.

Seluruh 82 tes, lint, TypeScript dan build webpack lulus. Script akses lokal juga lulus untuk penolakan origin asing pada check, ballots dan status serta autentikasi admin. Tes redirect mendukung respons 307 maupun meta redirect streaming Next.js dan memastikan shell admin tidak ikut diberikan kepada pengguna tanpa login. Tidak mengirim suara nyata atau melakukan migration untuk pengujian ini. Alur koneksi putus diuji dengan fungsi request pengganti; belum diuji end-to-end dengan pemungutan suara nyata di browser/Vercel.

Batas jaringan check/cast berubah ke 50 masing-masing per 10 menit; bucket status terpisah 60 per jaringan/10 per sesi. Tidak dilakukan load test atau mengirim 50 request ke Supabase. Batas berlaku bersama untuk pengguna yang berbagi IP publik, atau semua request pada lingkungan non-Vercel. Setelah reload tidak menyimpan token/pilihan di browser storage; masukkan NIM kembali untuk memeriksa hak pilih.
