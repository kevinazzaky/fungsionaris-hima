# Audit keamanan aplikasi HIMA TI

Tanggal: 11 November 2026. Cakupan: kode lokal saat audit, request terbatas ke localhost:3000, dan metadata Supabase melalui transaksi baca-saja. Tidak mengirim suara, mencoba login akun orang lain, membanjiri layanan, atau mengubah konfigurasi keamanan/data pemilihan. Ini review keamanan terbatas, bukan sertifikasi bebas celah atau pentest deployment Vercel.

## Kesimpulan

Kontrol akses admin dan pembatasan akses publik database bekerja pada pemeriksaan yang dilakukan. Namun voting NIM-only belum memberikan bukti identitas pemilih. Ada dua temuan berprioritas tinggi, tiga sedang, dan dua rendah. Temuan belum diperbaiki dalam audit ini; perubahan UI yang diminta terpisah tidak mengubah kontrol keamanan.

## Temuan

### S-01: Tinggi, hak pilih dapat dipakai orang yang mengetahui NIM

Bukti: [prepareVotingSession](../src/use-cases/voting.ts#L12) hanya memerlukan NIM, status eligible/consumed, dan secret server sebelum menerbitkan token. Tidak ada autentikasi mahasiswa, OTP ke kontak yang telah diverifikasi, atau SSO kampus. Tanda tangan token mencegah pemalsuan token; tidak membuktikan bahwa pemegangnya adalah pemilik NIM.

Saat periode terbuka, pihak yang mengetahui NIM terdaftar yang belum digunakan dapat memperoleh sesi melalui alur normal. Jika ia memilih lebih dahulu, pemilik asli kehilangan kesempatan karena satu hak pilih hanya boleh terpakai sekali. Batas 8 angka, HMAC, dan rate limit tidak menyelesaikan masalah identitas. Ini disimpulkan dari kode dan kontrak tes sesi, tanpa mencoba mengambil hak pilih siapa pun di Supabase.

Perbaikan: gunakan SSO kampus atau OTP ke email/kontak yang sebelumnya dipetakan dan diverifikasi untuk NIM tersebut. Jangan mengirim OTP ke alamat bebas yang baru diketik pengguna. Tetap pertahankan transaksi satu hak pilih dan validasi periode/kandidat.

### S-02: Tinggi, akses admin belum mewajibkan MFA

Bukti: [login](../src/app/admin/actions.ts#L13) menggunakan email/password; [getAdmin](../src/data/auth.ts#L8) memeriksa user Supabase dan keanggotaan AdminUser tanpa pemeriksaan AAL2/challenge MFA. Password admin yang dicuri atau terkena phishing menjadi satu faktor yang cukup untuk akses aplikasi. Ini bukan bukti password telah bocor, dan tidak ada percobaan menebak password.

Perbaikan: tambahkan enrollment/challenge TOTP atau faktor lain yang didukung, serta wajibkan AAL2 di server untuk setiap akses admin. Mengaktifkan faktor di akun saja tidak cukup bila server tetap menerima sesi AAL1. Tinjau pembatasan percobaan login di Supabase dan di ingress; konfigurasi dashboard Auth belum diaudit.

Rujukan: [Supabase MFA](https://supabase.com/docs/guides/auth/auth-mfa), [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).

### S-03: Sedang, runtime database memiliki hak owner dan BYPASSRLS

Bukti langsung melalui DATABASE_URL yang dipakai [getPrisma](../src/data/prisma.ts#L11): role koneksi memiliki BYPASSRLS dan CREATEROLE, serta merupakan pemilik seluruh 15 tabel aplikasi. Role bukan superuser, tetapi kepemilikan tabel tetap memungkinkan operasi administratif yang jauh melampaui kebutuhan request web.

Jika server, secret database, atau jalur eksekusi SQL disusupi, penyerang dapat melewati batas yang diharapkan dari RLS/trigger milik aplikasi. Ini memperbesar dampak kompromi lain, bukan bukti pengguna internet saat ini dapat mengeksekusi SQL. Trigger immutable tidak melindungi dari pemilik tabel yang dapat menonaktifkannya.

Perbaikan: pisahkan kredensial migrasi/owner dari role runtime. Role runtime tidak boleh memiliki CREATE/ALTER, CREATEROLE, BYPASSRLS, atau kepemilikan tabel. Tinjau grant fungsi dan tabel; operasi ballot sebaiknya dibatasi melalui jalur fungsi yang terkontrol. Uji hak minimum di lingkungan uji sebelum mengganti koneksi aktif.

Rujukan: [OWASP Database Security](https://cheatsheetseries.owasp.org/cheatsheets/Database_Security_Cheat_Sheet.html).

### S-04: Sedang, rate limit dapat menghalangi pemilih lain pada jaringan bersama

Bukti: [publicVotingRequest](../src/lib/voting-api.ts#L31) membatasi satu bucket jaringan menjadi 30 pemeriksaan atau 20 pengiriman selama 10 menit; [voting_take_rate](../prisma/migrations/20261110000000_voting/migration.sql#L110) menghitung setiap pemanggilan. Di luar Vercel seluruh pengguna memakai bucket shared. Di Vercel pengguna pada Wi-Fi/NAT kampus dapat memakai IP publik sama. Bucket jaringan dihitung sebelum validasi payload/token, sehingga permintaan gagal juga menghabiskan kuota.

Akibatnya, batas pengiriman dapat menghalangi pemilih berikutnya pada IP yang sama; percobaan per NIM juga dapat membuat pemilik NIM menunggu. Analisis ini berdasarkan implementasi dan tes limiter lokal, bukan percobaan menghabiskan kuota pemilihan aktif. Header client-IP tepercaya dan aturan edge produksi belum diuji.

Perbaikan: pisahkan perlindungan flood di ingress dari batas per identitas pemilih yang sudah diverifikasi. Kalibrasi batas jaringan melalui simulasi NAT kampus, dan hindari penguncian korban hanya dari input NIM yang belum diautentikasi.

### S-05: Sedang, pendaftaran publik belum memiliki pembatasan otomatisasi aplikasi

Bukti: [POST pendaftaran](../src/app/api/pendaftaran/route.ts#L11) memeriksa origin, status pendaftaran, dan input, tetapi tidak membatasi frekuensi per jaringan/sesi. NIM pendaftaran tidak dibuktikan kepemilikannya. Bot dapat memalsukan Origin pada request non-browser; same-origin guard adalah kontrol CSRF, bukan bukti pengguna manusia.

Jika pendaftaran terbuka, data palsu dapat memenuhi daftar dan menambah beban database. Unggahan PDF juga menjadi risiko kuota bila bucket diaktifkan. Saat audit, bucket registration-files belum ada; risiko konsumsi storage tersebut bersifat kondisional. Tidak ada percobaan spam atau unggahan yang dilakukan. Perlindungan Vercel/WAF di luar repository belum diaudit.

Perbaikan: tambahkan rate limit server/edge, batas volume, deteksi duplikat/otomatisasi, dan monitoring. Validasi kepemilikan kontak bila dibutuhkan. Jangan mengandalkan batas ukuran berkas saja.

Rujukan untuk S-04/S-05: [OWASP Denial of Service](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html).

### S-06: Rendah, pesan pemeriksaan NIM mengungkap status hak pilih

Bukti: [pesan pemeriksaan](../src/use-cases/voting.ts#L24) membedakan belum terdaftar, telah digunakan, dan tidak eligible. Ini sesuai perilaku yang diminta pengguna sebelumnya, tetapi memungkinkan penelusuran status suatu NIM. Rate limit memperlambat, bukan menghilangkan kemampuan tersebut.

Perbaikan: setelah autentikasi pemilik diterapkan, tampilkan rincian status hanya kepada pemilik; sebelum autentikasi gunakan respons yang lebih umum. Penyesuaian ini perlu keputusan produk karena memengaruhi pesan yang sekarang ditampilkan.

### S-07: Rendah, header pertahanan browser belum dikonfigurasi

Bukti: GET localhost /admin/login menghasilkan 200 dengan Cache-Control no-store, tetapi tanpa Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, dan Referrer-Policy. [next.config.ts](../next.config.ts) juga tidak mendefinisikan header tersebut. Temuan ini untuk sumber dan respons lokal; belum memeriksa header yang mungkin ditambahkan Vercel/domain produksi.

Perbaikan: terapkan nosniff, kebijakan referrer, dan pembatasan framing. Rencanakan CSP dengan nonce/hash yang cocok untuk Next.js dan uji report-only sebelum enforcement. Ini pertahanan tambahan; tidak membuktikan adanya XSS yang dapat dieksploitasi. HSTS harus diperiksa pada deployment HTTPS, bukan disimpulkan dari localhost HTTP.

Rujukan: [OWASP CSP](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html).

## Pemeriksaan yang berhasil

| Pemeriksaan | Bukti dan batasnya |
|---|---|
| Tes aplikasi | 74 tes lulus, termasuk token diubah/kedaluwarsa, validasi input, satu hak pilih, kegagalan transaksi, dan larangan akses role publik. Tes SQL berjalan di PGlite, bukan stress test PostgreSQL produksi. |
| Akses voting admin | Script check-voting-access lulus: API/dashboard/ekspor memerlukan login, mutasi tanpa login ditolak, dan dua endpoint voting menolak origin asing tanpa cache. Tidak menyimpan record atau suara. |
| Akses admin lainnya | GET registrations, alias /api/pendaftaran, content/members, programs, dan registration-settings menghasilkan 401 tanpa cookie. GET program-periods menghasilkan 405 karena tidak memiliki handler GET; ini bukan bypass autentikasi. |
| RLS aktual | Seluruh 15 tabel aplikasi memiliki RLS; role anon dan authenticated tidak memiliki SELECT/INSERT/UPDATE/DELETE langsung. Hak runtime owner tetap menjadi S-03. |
| Fungsi dan trigger aktual | anon/authenticated tidak dapat EXECUTE cast_hima_ballot/voting_take_rate. Lima trigger proteksi kandidat, pemilih, periode, ballot, dan audit aktif. |
| TLS aktual | Socket aplikasi ke pooler terenkripsi TLSv1.3, sertifikat authorized, sslmode verify-full dengan root CA. pg_stat_ssl backend pooler menunjukkan false; itu bukan bukti koneksi aplikasi ke pooler tidak terenkripsi. Sisi internal pooler tidak diverifikasi independen. |
| Dependency produksi | npm audit --omit=dev melaporkan 0 advisori pada dependency yang dikenali registry saat audit. Ini tidak menjamin tidak ada celah baru atau masalah logika aplikasi. Tidak memasang/memperbarui paket. |
| Pemeriksaan secret | Pemindaian pola pada 274 berkas yang terlacak/tidak diabaikan tidak menemukan bentuk secret Supabase, JWT service_role, private key, atau DSN berkredensial nyata. Tidak ada riwayat .env/.env.local pada log Git yang diperiksa. Nilai secret tidak dicetak. Pemindaian pola bukan pemeriksaan semua jenis secret. |
| Upload gambar | Ukuran dibatasi 3 MB, decode sharp membatasi pixel, hasil dikonversi ke WebP, nama storage acak. Ini review kode; tidak mengunggah payload berbahaya. |
| Storage aktual | website-media publik hanya mengizinkan WebP 3 MB, tanpa policy browser pada storage.objects. Foto kandidat memang ditujukan publik. Bucket registration-files belum tersedia, bukan bucket PDF publik. |

## Batas audit dan langkah berikutnya

Belum dilakukan load test/DDoS, pengujian kredensial, eksploitasi akun/SQL, pengujian pemulihan backup, audit akun Vercel/Supabase Auth, atau pemeriksaan deployment publik. Tidak menyimpulkan bebas SQL injection/XSS hanya karena pencarian kode dan tes lolos. Hasil admin yang diperbarui langsung juga memiliki risiko inferensi pilihan dari waktu pada kelompok kecil, meskipun tidak menyimpan identitas pada ballot.

Urutan tindakan yang disarankan: verifikasi identitas pemilih; MFA admin; pisahkan role database runtime; perbaiki limiter jaringan bersama dan pendaftaran; kemudian perkuat header browser serta tinjau pesan status NIM. Tidak ada perubahan kontrol keamanan yang diterapkan otomatis dalam review ini.

## Tindak lanjut: perlindungan XSS dan header browser

Setelah review, pengguna meminta penerapan perlindungan XSS. S-07 ditangani pada kode aplikasi melalui CSP dengan nonce acak per request, penolakan event handler inline, pembatasan framing dan object, serta header nosniff dan kebijakan referrer. Header nonce dari klien ditimpa. Script JSON-LD mengubah karakter `<` menjadi escape JSON agar isi tidak dapat menutup tag script. React tetap melakukan escaping teks biasa.

Script inline hanya diizinkan dengan nonce; produksi tidak mengizinkan unsafe-eval. Style inline tetap diizinkan untuk style React/Motion. Mode development mengizinkan eval dan WebSocket untuk tooling Next.js. Nonce memerlukan rendering HTML dinamis; respons memakai private, no-store sehingga HTML tidak lagi mendapat manfaat cache statis bersama.

Pemeriksaan HTTP pada development dan hasil build produksi lokal lulus: nonce berbeda pada request berikutnya, semua script SSR memiliki nonce yang cocok, nonce palsu dari request tidak dipakai, serta header pertahanan aktif. Pemeriksaan akses admin dan penolakan origin asing juga tetap lulus. Ini belum verifikasi deployment Vercel atau pengujian eksploitasi XSS menyeluruh. S-01 sampai S-06 tetap terbuka; indikator menunggu dan kunci tombol di browser bukan pengganti rate limit server. MFA dan role database runtime belum diubah.
