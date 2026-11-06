# Verifikasi admin, 5 November 2026

Scope: kode dan setup Supabase + Prisma. Koneksi database, migration, seed, RLS, login/logout, perubahan password, pendaftar dan halaman publik dengan database cloud sudah diverifikasi. CRUD hero/program kerja dan Storage publik diuji pada Supabase asli; CRUD fungsionaris/galeri masih berdasarkan harness API mock. Storage PDF privat belum diuji. Tidak ada jalur bypass autentikasi pada route aplikasi.

## Pemeriksaan otomatis

| Pemeriksaan | Hasil | Bukti |
| --- | --- | --- |
| `npm test` | PASS | 48 tes; tambah validasi setting buka/tutup, copy status/periode dan singleton; SQL/RLS delapan tabel |
| `npm run lint` | PASS | Tidak ada error atau warning |
| `npm run db:validate` | PASS | Skema valid pada Prisma 7.10.1 |
| `npm run build` | PASS | Prisma Client dihasilkan; Next.js 16.4.5 berhasil mengompilasi, type-check, dan membangun seluruh route |
| `git diff --check` | PASS | Tidak ada whitespace error |
| `npm audit --omit=dev` | PASS | 0 advisory runtime pada saat pemeriksaan; audit penuh masih melaporkan 8 advisory moderate pada alat development |
| `graphify update .` | PASS untuk AST kode | Dijalankan kembali setelah pengaturan pendaftaran. Enam file SQL belum diekstrak karena parser `tree_sitter_sql` tidak tersedia; migration SQL diuji terpisah melalui PGlite dan diterapkan ke Supabase |

## Smoke test browser

Chrome headless menjalankan build Next.js sungguhan dan harness komponen terpisah:

- Route `/admin` mengarahkan pengunjung tanpa sesi ke `/admin/login`.
- Halaman aktivasi admin tampil pada 360, 768, dan 1440 px tanpa overflow halaman.
- Lima endpoint baca/ekspor menolak request tanpa sesi dengan 401, termasuk percobaan memakai kunci ekspor bawaan lama.
- Pendaftaran baru tanpa konfigurasi backend mengembalikan 503, bukan sukses palsu.
- Tab divisi di halaman fungsionaris dan tombol penambahan foto di galeri publik bekerja dengan konten awal.
- Dengan API mock: tambah/edit/sembunyikan/cari/hapus fungsionaris, keadaan kosong/error/muat ulang, unggah/edit/hapus galeri, pencarian/detail pendaftar dan Escape pada dialog bekerja. Alur impor UI pernah diuji sebelum dihapus sesuai permintaan pemilik.
- Layout daftar pendaftar pada 360, 768, dan 1440 px tidak meluber dari viewport; tabel yang lebar memakai area scroll sendiri.
- Tidak ada `pageerror` JavaScript selama skenario browser yang diuji.

## Gate antislop untuk UI lokal

Pilihan pengguna: antislop diterapkan selama pengerjaan. Arah dan alasan visual ada di [ADMIN_DESIGN.md](ADMIN_DESIGN.md). PASS di bawah berlaku untuk kode serta alur lokal yang disebutkan di atas, bukan klaim bahwa alur login dan upload Supabase cloud sudah diverifikasi.

| Hard gate | Hasil dan bukti |
| --- | --- |
| R-02 | PASS: teks UI baru memakai kalimat langsung, tanpa em dash |
| R-03 | PASS: layout diuji pada 360/768/1440 px; kontrol utama minimal 44 px |
| R-17 | PASS: jumlah berasal dari response data; tidak ada statistik promosi |
| R-18 | PASS: tidak ada testimonial atau identitas fiktif pada produk |
| R-23 | PASS: identitas dan aset mengikuti website yang ada; foto kosong memakai avatar bawaan |
| R-24 | PASS: lima menu admin memiliki halaman nyata; Galeri/Hero berada dalam tab satu halaman; tautan website publik tersedia |
| R-25 | PASS: checker kontras memberi 5.63:1 untuk teks sekunder, 9.35:1 untuk tombol utama, 7.93:1 untuk error, 8.05:1 untuk sukses; outline dan batas kontrol melampaui 3:1 |
| R-26 | PASS: mutasi memiliki handler, validasi, status proses dan error; alur CRUD diuji dengan API mock, migrasi pendaftar diuji ke database asli melalui CLI |
| R-27 | PASS: keadaan kosong, memuat dan gagal tersedia; keadaan kosong/error/retry diuji di browser |
| R-28 | PASS: tidak ada FAQ templat |
| R-32 | PASS: kontrol native, fokus terlihat, skip link, area tabel dapat difokuskan, dialog native ditutup dengan Escape |
| R-33 | PASS: perubahan produk ditulis langsung di source; harness QA hanya membuat artefak pengujian terpisah |
| R-34 | PASS: tema terang mengikuti website; tidak ada toggle tema yang rusak |
| R-35 | PASS: build dan click-through browser tercatat; login/password/logout diuji pada Auth cloud, sedangkan Storage cloud belum diuji |
| R-36 | PASS: tidak ada klaim performa/keamanan cloud yang tidak diverifikasi |
| R-37 | PASS: arah visual berasal dari website HIMA TI yang sudah ada; dials dinyatakan sebelum implementasi |
| R-38 | PASS: konten produk berasal dari source yang ada atau database; fixture QA tidak dikirim sebagai data produk |

| Purpose gate | Hasil dan bukti |
| --- | --- |
| R-01 | PASS: amber dipakai untuk aksi utama/tab aktif, tanpa latar gradient dekoratif pada admin |
| R-04 | PASS: label teks menerangkan pekerjaan pengurus, tanpa ikon generik |
| R-06 | PASS: Figtree/Rubik mengikuti tipografi website dan membedakan heading/isi |
| R-07 | PASS: tidak ada pola grid/dot sebagai latar admin |
| R-08 | PASS: tombol aksi tidak diberi panah dekoratif |
| R-09 | PASS: label status hanya menyatakan publikasi konten |
| R-10 | PASS: tidak ada glassmorphism pada admin |
| R-12 | PASS: daftar dan form berada pada permukaan datar, tanpa shadow berulang |
| R-13 | PASS: tidak ada glow dekoratif pada admin |
| R-14 | PASS: baris foto dan tabel dipakai sesuai data, tanpa kartu fitur templat |
| R-19 | PASS: gerak dibatasi pada feedback kontrol; tidak ada animasi dekoratif admin |
| R-22 | PASS: tidak ada ilustrasi baru yang tidak berhubungan dengan produk |

| Liveliness | Hasil dan bukti |
| --- | --- |
| Dials | PASS: ENERGY 1 / RHYTHM 1 / MOTION 1; panel tenang dan konsisten |
| Fokus | PASS: setiap halaman mempunyai judul tugas dan aksi utama yang sesuai |
| Whitespace | PASS: jarak memisahkan header, pencarian, daftar, dan formulir |
| Aksen | PASS: amber dipakai untuk aksi simpan dan navigasi aktif |
| Identitas | PASS: nama HIMA TI, istilah fungsionaris/divisi, konteks periode/WITA dan tipografi website dipertahankan |
| Design read | PASS: arah dan dials dinyatakan sebelum UI ditulis dan dicatat di ADMIN_DESIGN.md |

| Craftsmanship dan quality locks | Hasil dan bukti |
| --- | --- |
| C-1, R-31 | PASS: alasan warna, bentuk daftar, font, jarak dan gerak tercatat pada arah desain |
| C-2 | PASS: kontrol mengikuti skenario browser; Auth diuji nyata, sedangkan upload/CRUD media cloud masih menunggu setup bucket |
| C-3, R-05 | PASS: halaman mengikuti pekerjaan pengurus, tanpa bagian promosi templat |
| C-4 | PASS untuk scope lokal: state gagal/kosong/loading dan ukuran viewport diperiksa |
| C-5 | PASS: tidak ada statistik, testimonial atau profil buatan pada data produk |
| R-11 | PASS: radius kecil digunakan konsisten pada form/kontrol, bukan seluruhnya pill |
| R-15 | PASS: CTA menyebut aksi, seperti Tambah fungsionaris, Periksa data, Simpan perubahan |
| R-16 | PASS: teks tidak memakai buzzword promosi |
| R-20, R-21 | PASS: panel mengikuti identitas dan tema terang website untuk membaca data serta menilai foto |
| R-29 | PASS: netral hangat + amber; warna status hanya untuk feedback |
| R-30 | PASS: susunan mengikuti kebutuhan HIMA TI, tidak menyalin identitas produk lain |

## Verifikasi Supabase dan pekerjaan tersisa

Perbaikan runtime berikutnya memverifikasi server dev port 3000 yang sebelumnya masih menjalankan Next.js 16.3.5. Proses lama dihentikan, cache `.next/dev` dicadangkan ke `.qa`, lalu server dijalankan dengan 16.4.5. Nilai contoh `DATABASE_URL` kini dianggap belum dikonfigurasi, sehingga halaman publik tidak mencoba koneksi ke hostname contoh. Browser memeriksa `/`, `/admin`, `/admin/login`, `/fungsionaris`, dan `/gallery`: seluruh response akhir 200, `/admin` diarahkan ke login, tanpa error JavaScript atau instrumentation. Tes, lint, build, dan Graphify dijalankan ulang setelah perbaikan.

Setelah `DATABASE_URL` asli diisi, ditemukan singleton Prisma masih menyimpan koneksi URL contoh dari sebelum hot reload. Factory kini mencocokkan URL cache dengan konfigurasi aktif, membuat client pengganti, dan menutup pool lama. Tes regresi memverifikasi migrasi singleton lama tanpa metadata, pemakaian ulang pada URL yang sama, pergantian URL, dan penolakan URL contoh.

Dengan persetujuan pemilik, migration awal diterapkan melalui session pooler Supabase port 5432 karena endpoint direct tidak terjangkau. `DIRECT_URL` lokal diperbarui ke jalur yang bekerja, sementara runtime tetap memakai port 6543. Seed berhasil menambahkan 28 fungsionaris dan 36 foto. Pembacaan jumlah tabel melalui koneksi runtime serta pemeriksaan `pg_class`/`has_table_privilege` menunjukkan empat tabel memiliki RLS aktif, tanpa hak SELECT langsung untuk `anon` dan `authenticated`. Kelima halaman dev kembali merespons 200 tanpa error JavaScript dengan database aktif. Build, lint, dan 20 tes lolos.

Akun institusi HIMA dibuat melalui Supabase Admin API dan ditautkan ke `AdminUser` dengan persetujuan pemilik. Browser menguji login nyata, halaman akun pada 360/768/1440 px, konfirmasi password yang tidak cocok, password saat ini yang salah, penggantian password yang benar, pembersihan sesi, penolakan password lama, login dengan password baru, dan logout. Seed dijalankan ulang tanpa mengganti password. Kredensial tidak dimasukkan ke source, screenshot, laporan tes, atau memori agen.

Penolakan akun non-admin yang sudah login, penyimpanan foto/PDF cloud dan signed URL belum diuji. Empat pendaftar dari XLSX asli sudah disimpan untuk periode 2026 dengan izin pemilik. Verifikasi baca ulang mencocokkan seluruh field: 4 baris cocok, semua 15 kolom dikenali, tanpa perbedaan nilai. Nama lampiran tidak disamakan dengan isi file yang tersimpan. Ikuti [panduan setup](INFRASTRUCTURE_AND_CICD.md) untuk menyiapkan bucket dan melakukan uji penerimaan upload dengan berkas asli.

## Gate antislop halaman akun

- R-03 PASS: form dan menu akun diverifikasi pada 360/768/1440 px tanpa overflow.
- R-23/R-24 PASS: akun memakai email institusi yang diberikan pemilik; menu Akun admin menuju route nyata yang dilindungi login.
- R-25 PASS: form mewarisi palet dan focus ring yang telah diperiksa pada gate utama.
- R-26/R-27 PASS: validasi gagal dan penyimpanan sukses diuji pada Supabase; proses berjalan menonaktifkan fieldset dan menampilkan status.
- R-32/R-35 PASS: kontrol native dengan label dan autocomplete tersedia; urutan Tab, outline fokus 3px, validasi form kosong, dan pembesaran teks 200% diuji; browser menjalankan alur login/password/logout nyata tanpa pageerror.
- C-1/R-31 PASS: form satu kolom, tipografi, jarak dan warna mengikuti alasan di ADMIN_DESIGN.md; tidak ada dekorasi atau klaim baru yang tidak didukung.

## Migrasi asli dan cetak ulang surat

- XLSX asli dimigrasikan setelah instruksi pemilik: 4 baris, 15 kolom dikenali, nol perbedaan saat seluruh field dibaca ulang dari Supabase dan dibandingkan dengan sumber.
- Browser memakai sesi admin Supabase sementara tanpa mengubah password atau mengirim email. Sesi uji dicabut secara lokal setelah selesai.
- Daftar admin menampilkan 4 pendaftar. Semua detail membuka surat dengan identitas, nomor HP, skill dan alasan dari record yang dipilih, termasuk saat berganti pendaftar.
- Keempat dokumen diuji melalui emulasi media cetak dan PDF Chromium dalam memori: masing-masing tepat dua halaman A4, formulir pada halaman pertama dan surat pernyataan pada halaman kedua. Panel admin tidak ikut tercetak. Fungsi `window.print` diganti penghitung hanya pada pengujian agar tidak membuka dialog sistem; printer fisik belum diuji.
- Ekspor Excel berisi 4 data. Halaman `/admin/impor`, API `/api/admin/import` dan template CSV lama mengembalikan 404; menu/tombol impor sudah dihapus. Akses detail tanpa sesi ditolak dengan 401.
- R-03/R-27/R-32/R-35 PASS: daftar dan detail diuji pada 360/768/1440 px tanpa overflow halaman/dialog, tombol cetak tersedia, dialog ditutup sebelum cetak, dokumen tersembunyi pada layar normal, dan tidak ada error JavaScript.
- R-23/R-26/R-38/C-1 PASS: template resmi dipakai ulang, data berasal dari database, periode/tanggal mengikuti record, dan foto/tanda tangan yang tidak tersimpan tidak direkayasa. Padding dan jarak cetak disesuaikan agar tanda tangan tetap muat pada data asli.

Isi PDF/foto lampiran historis tidak ada dalam XLSX dan belum dipindahkan ke Storage. Cetak ulang membuat dokumen baru dari data terstruktur; berkas unggahan asli tetap memiliki aksi unduh terpisah jika tersedia.

## Hero beranda dan Storage publik

- Migration `HeroSlide` diterapkan ke Supabase. RLS aktif; role `anon` dan `authenticated` tidak memiliki SELECT langsung. Bucket `website-media` publik dibuat dengan batas WebP 3 MB; tiga foto hero awal dikonversi dan disalin ke folder `hero/`. File lokal yang juga dipakai galeri tetap ada.
- `npm run db:seed-hero` dijalankan ulang: nol migrasi baru, tetap tiga slide. Foto dan metadata yang sudah dikelola admin tidak ditimpa.
- Browser dengan sesi admin sementara menguji create, ganti foto, sembunyikan, dan hapus melalui UI serta Storage asli. Object lama dan object uji terhapus berdasarkan list metadata Storage; URL publik bisa masih terlayani cache CDN. Jumlah galeri tidak berubah. Sesi uji dicabut lokal tanpa mengganti password atau mengirim email.
- Nol slide aktif tetap menampilkan heading tanpa foto fallback; satu slide statis tanpa tombol; tiga slide menampilkan slideshow. Reduced motion menghentikan timer, navigasi manual tetap bekerja. Tombol slide ditempatkan di atas lapisan teks agar bisa diklik.
- Pada 360/768/1440 px, halaman admin hero tidak overflow. Empat metode API koleksi hero menolak akses tanpa sesi dengan 401. Kedua alur browser selesai tanpa pageerror.
- Pemeriksaan setelah tes: tiga slide aktif, tiga object hero, empat pendaftar; tidak ada data uji tertinggal.
- Next.js menormalisasi URL loopback pada request melalui proxy. Pemeriksaan origin kini mencocokkan Host browser dan skema request; tes menolak origin kosong/lintas host/lintas port/lintas skema serta Host tidak valid. Seluruh API mutasi memakai helper yang sama.
- Inisialisasi Reveal mengikuti nilai server yang tetap; reduced motion memakai CSS agar tidak menimbulkan perbedaan hydration. Animasi dan transisi hero juga dihentikan melalui media preference.
- Gate antislop R-03/R-24/R-26/R-27/R-32/R-35/C-1/C-2 PASS: navigasi menuju halaman nyata (Hero kini menjadi tab di Galeri), editor memakai pola galeri yang sudah ada, state proses/error tersedia, kontrol slide memiliki area 44 px, focus ring dan aria-pressed. Dials admin tetap ENERGY 1 / RHYTHM 1 / MOTION 1.

Foto opsional calon pendaftar masih hanya dipakai untuk preview/cetak browser. Penyimpanan foto pendaftar ke bucket privat memerlukan implementasi tersendiri.

## Preview foto editor admin

- Preview tersedia pada tambah/edit Hero, Galeri, dan Fungsionaris. Foto yang sudah tersimpan tampil saat edit; memilih file mengganti preview secara lokal, dan Batal pilih foto mengembalikan foto lama serta mengosongkan input file.
- Browser memverifikasi tiga editor dengan API baca mock dan sesi admin nyata: gambar lokal terbaca, ganti berulang, batal pilihan, batal editor, file terlalu besar, gambar rusak, serta interaksi hapus foto fungsionaris dengan pilihan baru. Tidak ada request mutasi atau pageerror selama pengujian.
- Object URL dilepas saat pilihan berubah, dibatalkan, atau editor ditutup. File kosong/format tidak didukung/lebih dari 3 MB ditolak di UI, gambar gagal dibaca menampilkan alert dan menonaktifkan Simpan. Validasi server tetap berlaku saat upload.
- Gate R-03/R-26/R-27/R-32/R-35 PASS: halaman tidak overflow pada 360/768/1440 px, kontrol native dan label tersedia, status foto belum disimpan jelas, preview utuh tanpa crop, dan error dapat dipulihkan dengan batal/pilih ulang.
- Pemeriksaan akhir: 33 tes, lint, build, diff whitespace, dan Graphify AST lolos. Tidak ada perubahan schema/API atau data Storage pada fitur preview ini.

## Tab Galeri dan Hero dalam satu halaman

- Sidebar kini memiliki empat tautan; Hero beranda dipindahkan ke tab di `/admin/galeri`. Galeri adalah tab default; `?tab=hero` membuka Hero, parameter lain memakai Galeri. `/admin/hero` tetap tersedia sebagai redirect ke tab Hero.
- Browser menguji klik dan keyboard panah/Home/End, aria-selected/fokus, panel tersembunyi, reload pada tab Hero, redirect lama, dan parameter tidak dikenal. Pada implementasi inline terdahulu, draft/preview bertahan saat berganti tab; editor sekarang berupa popup yang harus ditutup dahulu. Penyimpanan tiap panel tetap menuju endpoint koleksi yang benar.
- Pengujian memakai sesi nyata dan API mock, tanpa mutasi Supabase. Tidak ada pageerror; halaman tidak overflow pada 360/768/1440 px. Kedua editor tetap dipasang selama halaman terbuka sehingga berganti tab tidak membuang pilihan file atau mengganggu request yang sedang berlangsung.
- Antislop R-03/R-24/R-26/R-32/R-35 PASS: satu menu foto, dua tab dengan kontrol native dan label panel, aksen amber mengikuti pola admin, seluruh interaksi yang berubah diuji. 33 tes, lint, build, diff whitespace dan Graphify AST lolos.

## Edit dan hapus pendaftar

- Daftar dan dialog detail menyediakan Edit/Hapus. Form edit mengubah identitas, kontak, periode/angkatan, divisi dan jawaban. Perubahan nama/NIM/periode tetap mengikuti validasi serta keunikan database. Sumber, tanggal daftar dan metadata lampiran tidak dapat ditimpa lewat payload edit.
- API `PATCH /api/admin/registrations/[id]` menerima seluruh field formulir yang dapat diedit dan `period`, lalu mengembalikan detail serta data surat terbaru tanpa path lampiran privat. `DELETE` menghapus record dan membersihkan lampiran privat jika ada. Keduanya memeriksa admin, origin dan UUID. Tidak ada migration baru.
- Konfirmasi hapus menyebut nama/NIM dan bahwa penghapusan permanen. Record dihapus dahulu; jika database gagal, lampiran tetap ada. Jika pembersihan Storage gagal setelah record dihapus, API mengembalikan `fileCleanupPending: true` dan UI menjelaskan perlunya pembersihan teknis. Nama file historis tanpa path tidak dikirim untuk penghapusan Storage.
- Browser memakai dua pendaftar uji sementara pada Supabase asli untuk edit/batal edit, validasi, keunikan NIM (409), input salah (400), record tidak ada (404), origin dan sesi tidak sah (401), cetak memakai hasil edit, pembatalan konfirmasi hapus dan penghapusan sukses. Cleanup akhir menghapus hanya ID data uji dan memeriksa jumlah kembali ke baseline.
- Tidak ada pageerror dan tidak ada overflow halaman/dialog pada 360/768/1440 px. Penyimpanan menonaktifkan kontrol form/penutupan dialog/pagination, sementara error edit tetap menampilkan form agar isian tidak hilang. R-03/R-26/R-27/R-32/R-35/C-2 PASS; pola dialog, form dan warna admin dipakai ulang.
- Lima tes use case baru memeriksa whitelist data edit, penolakan input sebelum query, urutan hapus, file historis, kegagalan database dan kegagalan cleanup. Total 38 tes, lint dan build lolos; Graphify AST diperbarui. Penghapusan lampiran PDF cloud asli belum diuji; perilaku kegagalannya diperiksa melalui unit test.

## CRUD program kerja

- Migration `Program`/`ProgramStatus` diterapkan ke Supabase dengan RLS. Role `anon` dan `authenticated` tidak memiliki SELECT langsung. Sembilan program dari dua periode dimasukkan beserta tujuh foto WebP di `website-media/programs/`. Seed ulang menambah nol record/foto dan mempertahankan data yang sudah ada.
- `/admin/program-kerja` menyediakan tambah/edit/hapus, pencarian, filter periode, urutan, publikasi, status/tautan, jadwal/lokasi, deskripsi, biaya/kontak, narasumber/benefit dan foto opsional dengan preview. Status Dibuka memerlukan URL HTTP/HTTPS. Narasumber/benefit menerima maksimal 50 item; periode tanda hubung dinormalisasi ke garis miring.
- API admin `/api/admin/programs` memakai GET/POST/PATCH/DELETE, pemeriksaan admin dan origin/UUID pada mutasi. Payload simpan berupa multipart `data` JSON, `file` opsional, `id` saat edit dan `removeImage`; DELETE menerima JSON `id`. Upload memakai validasi/kompresi WebP yang sudah ada. Kegagalan database membersihkan upload baru; foto lama baru dibersihkan sesudah metadata berhasil disimpan.
- Beranda dan `/program-kerja` membaca program yang dipublikasikan dari sumber sama. Sumber kanonis ringkasan/deskripsi panjang berasal dari data modal beranda lama; duplikasi teks pada halaman detail dihapus. Periode terbaru didahulukan; kartu ber-ID stabil; detail tambahan kosong tidak membuat kotak kosong. Data database kosong menampilkan pesan kosong dan tidak memulihkan seed.
- Browser dengan Auth/database/Storage asli menguji tambah tanpa foto, penolakan status terbuka tanpa link (400) dengan isian tetap ada, edit, preview/upload, modal/tautan, pencarian, sembunyikan di kedua halaman publik, hapus foto dan konfirmasi hapus program. Keempat metode API menolak sesi anonim (401), mutasi lintas origin ditolak.
- Pengujian terpisah mencakup dua halaman publik kosong, satu program, perpindahan ke periode 2024/2025 dan layout admin/publik pada 360/768/1440 px. Tidak ada pageerror atau overflow halaman. Status publikasi program awal dipulihkan setelah tes.
- Akhir tes: sembilan program awal, tujuh object program dan empat pendaftar; tidak ada program/foto uji tertinggal. Foto lokal tetap ada karena juga dipakai bagian lain.
- Gate antislop R-03/R-23/R-24/R-26/R-27/R-32/R-35/R-38/C-1/C-2 PASS: editor/daftar mengikuti pola admin dan kontrol native, preview utuh, data awal dari sumber nyata, tanpa elemen statistik buatan; dials tetap ENERGY 1 / RHYTHM 1 / MOTION 1. Lima menu mewakili tugas berbeda; Galeri/Hero tetap satu menu dengan tab.
- Total 43 tes, lint dan build lolos; enam tabel diperiksa melalui migration PGlite, RLS Program diverifikasi di cloud, Graphify AST diperbarui. Parser SQL Graphify belum tersedia.

## Popup editor admin

- Sesuai koreksi pemilik, tambah/edit Fungsionaris, Galeri, Hero dan Program Kerja kini memakai dialog native bersama. Editor inline dihapus beserta CSS yang tidak terpakai. Edit Pendaftar sudah memakai dialog dan dipertahankan.
- Browser menguji empat editor dengan API mock dan sesi admin nyata: modal terbuka, Escape/Tutup/Batal, fokus awal dan kembali ke pemicu setelah batal/simpan, navigasi Tab native, latar tidak bisa dioperasikan/digulir, serta klik backdrop tidak membuang draft.
- Pengujian pending response memastikan Escape dan Tutup tidak menutup saat simpan. Validasi 400 mempertahankan popup serta isian; setelah sukses popup menutup dan daftar diperbarui. Fokus dikembalikan sesudah kontrol pemicu aktif lagi.
- Regresi preview pada Hero/Galeri/Fungsionaris menguji foto lama/baru, ganti/batal, ukuran berlebih/gambar rusak, hapus foto fungsionaris dan pelepasan object URL. Tidak ada mutasi Supabase atau pageerror pada kedua skenario browser.
- Layout popup/halaman tidak overflow pada 360/768/1440 px. Dialog panjang memiliki scroll internal dan tombol Batal di akhir form. Popup harus ditutup sebelum berpindah tab Galeri/Hero; pembatalan membuang draft yang belum disimpan.
- Gate antislop R-03/R-26/R-27/R-32/R-35/C-1/C-2 PASS: judul popup menyebut jenis konten, kontrol native, pemulihan error/keyboard diuji, preview tetap bekerja dan gaya mengikuti palet admin ENERGY 1 / RHYTHM 1 / MOTION 1. 43 tes, lint, build, diff whitespace dan Graphify AST lolos; tidak ada perubahan API, schema atau data cloud.

## Tab dan publikasi periode Program Kerja

- Dropdown filter diganti tab periode terbaru dahulu. Tab memiliki aria-selected, panel berlabel dan keyboard panah/Home/End. Jumlah program merujuk periode aktif; pencarian berada di dalam periode. Tambah/Edit tetap popup, program baru memakai periode aktif, dan tab mengikuti periode hasil simpan.
- Metadata `ProgramPeriod` disimpan terpisah dari `Program.isPublished`. Migration menormalisasi periode, mengisi periode lama dengan true tanpa mengubah flag program, membuat FK dan RLS. FK menolak penghapusan periode yang masih memiliki program. Role anon/authenticated tidak mendapat SELECT langsung.
- Tombol Tampilkan/Sembunyikan periode memengaruhi kedua halaman publik melalui filter AND periode/program. Status tiap program tetap tersimpan. Periode kosong atau tanpa program terbit tidak membuat tab publik kosong. Save program membuat periode yang belum ada dalam transaksi tanpa mengaktifkan kembali periode tersembunyi.
- API GET program kini mengembalikan `{items,periods}`. API `/api/admin/program-periods` menerima POST untuk periode baru dan PATCH status tampil, JSON `{period,isPublished}`. Keduanya memeriksa admin, origin dan validasi; bentuk label dinormalisasi; nilai flag selain boolean ditolak. Tidak tersedia penghapusan periode pada UI.
- Browser Supabase asli menguji tab 2024/2025 berisi empat program, sembunyikan/tampilkan tahun di beranda dan halaman detail, periode baru tersembunyi, prefill tahun, tambah program yang tidak mengaktifkan periode tersembunyi, serta program individual tetap tersembunyi setelah toggle tahun. Keyboard dan viewport 360/768/1440 lolos tanpa overflow/pageerror. POST/PATCH tanpa sesi ditolak 401; flag salah ditolak 400.
- Cleanup menghapus hanya program/periode uji dan memulihkan status periode asli; sembilan program awal beserta flag masing-masing dan empat pendaftar tetap ada. RLS diverifikasi di cloud. Seed ulang menambah nol program/foto dan mempertahankan metadata yang sudah ada.
- Total 45 tes, lint dan build lolos. PGlite memeriksa backfill dua periode, normalisasi label, pelestarian flag individual, gabungan filter publikasi, FK dan tujuh tabel dengan RLS. Graphify AST diperbarui; parser SQL tetap belum tersedia.
- Antislop R-03/R-24/R-26/R-27/R-32/R-35/C-1/C-2 PASS: tanpa sidebar baru, tab/aksi periode mengikuti palet admin dan dials ENERGY 1 / RHYTHM 1 / MOTION 1; cakupan publikasi dijelaskan di UI dan alur baru diuji.

## Navigasi admin mobile yang dapat ditutup

- Di bawah 1100 px, header ringkas berisi identitas dan tombol Menu menggantikan susunan sidebar panjang. Dialog navigasi kiri tertutup secara default, memuat lima tautan serta akun/logout; di desktop sidebar 244 px tetap tersedia. Keduanya memakai konten/navigasi aktif yang sama.
- Browser Chrome headless memeriksa mobile/tablet 320/360/390/430/768/1024 px, desktop 1100/1440/1920 px, dan landscape 844x390. Tidak ada overflow halaman/dialog; header mobile maksimal 100 px dan judul konten langsung berada di bagian atas. Email panjang tetap dapat membungkus baris.
- Buka/Tutup, Escape, backdrop, pemilihan tautan ke halaman lain maupun halaman aktif, aria-expanded dan aria-current terverifikasi. Menu menutup otomatis setelah navigasi. Resize dari menu terbuka ke desktop menghapus backdrop/inert/scroll lock dan mengembalikan fokus ke tautan desktop yang aktif.
- Dialog native mengelola modal/keyboard; latar terkunci saat terbuka. Focus kembali ke Menu saat tutup pada mobile. Kontrol bawah dapat dijangkau melalui scroll internal pada landscape. Safe area dan unit dvh dipakai untuk tinggi menu; kontrol sentuh minimal 44 px.
- Pendaftar, Galeri, Akun serta Program Kerja diperiksa pada mobile/desktop. Popup tambah program tetap bekerja, input mobile 16 px, dan tidak ada pageerror. Screenshot 390x844 setelah data selesai dimuat disimpan pada artefak QA lokal; Safari/iPhone fisik belum diuji.
- Gate antislop R-03/R-24/R-25/R-32/R-35/C-1/C-2 PASS: palet/kontras dan tipografi admin dipertahankan, ikon menu menunjukkan fungsi navigasi, tanpa animasi dekoratif; dials ENERGY 1 / RHYTHM 1 / MOTION 1. 45 tes, lint, build dan Graphify AST lolos; tidak ada perubahan API, schema, atau data cloud.

## Buka/tutup pendaftaran fungsionaris

- Migration singleton `RegistrationSettings` diterapkan dengan status awal true sesuai konfigurasi sebelumnya, constraint id `main` dan RLS. Role anon/authenticated tidak memiliki SELECT langsung. Setting hilang atau database belum dikonfigurasi dibaca sebagai tertutup; konstanta REGISTRATION_OPEN di source tidak lagi dipakai.
- GET/PATCH `/api/admin/registration-settings` memerlukan admin; PATCH memeriksa origin dan boolean ketat. GET publik `/api/pendaftaran/status` hanya mengembalikan `{isOpen}` tanpa cache. Kontrol switch pada halaman Pendaftar menyimpan setelah respons sukses, menampilkan proses, error dan retry tanpa menambah sidebar.
- Beranda/halaman pendaftaran mengambil setting server setiap request; form serta banner mengikuti status. Pengumuman mengambang memeriksa endpoint ketika mount, pindah halaman dan browser kembali fokus. API POST memeriksa status sebelum parse/upload; request masuk ketika tertutup ditolak 403. Data pendaftar lama dan pengelolaan admin tetap tersedia.
- Browser dengan Supabase asli menguji buka/tutup dari switch, persistensi setelah reload, sinkronisasi beranda/form, pengumuman menghilang setelah refresh fokus, penolakan kiriman dari form lama (403), serta membuka kembali. Request tidak valid saat terbuka mencapai validasi (400), tanpa menulis pendaftar. GET/PATCH tanpa sesi dan origin salah ditolak 401; flag string ditolak 400.
- Mock kegagalan PATCH 503 mempertahankan nilai switch sebelumnya, menampilkan error dan pulih melalui Muat ulang status. Layout pada 360/768/1440 px tidak overflow; tidak ada pageerror. Semua pengujian memulihkan status awal dan mempertahankan empat pendaftar.
- RLS/privilege diverifikasi cloud; PGlite menguji row awal, larangan singleton lain, perubahan flag dan delapan tabel RLS. Tiga tes baru memeriksa boolean eksplisit, penolakan input ambigu, kegagalan simpan serta copy periode/status.
- Antislop R-03/R-24/R-26/R-27/R-32/R-35/C-1/C-2 PASS: switch native berlabel/aria-checked, teks status langsung, tap target 44 px, palet/dials admin dipertahankan. Total 48 tes, lint, build dan Graphify AST lolos; parser SQL Graphify masih belum tersedia.

## Regresi build Preview tanpa konfigurasi Supabase

- Error Vercel pada `/admin/akun` direproduksi dengan mengosongkan lima variabel koneksi/Auth/Storage hanya pada proses build, tanpa mengubah `.env.local`. Build lama gagal pada `requireAdmin()` karena guard konfigurasi mengembalikan null sebelum Next.js membaca cookie request.
- `getAdmin()` kini menunggu `connection()` sebelum guard konfigurasi, sehingga seluruh pemanggil memakai autentikasi saat request. Pemeriksaan sesi dan allowlist tetap berlaku.
- Tes regresi gagal pada implementasi lama dan lulus setelah perbaikan: tidak ada pembacaan konfigurasi sebelum request, backend yang belum dikonfigurasi tidak memanggil Auth/database, dan `requireAdmin()` tetap menolak akses.
- Build tanpa konfigurasi Supabase lulus. Server produksi hasil build mengarahkan `/admin`, `/admin/akun`, `/admin/galeri` dan `/admin/program-kerja` ke login (307); API pendaftar/ekspor tetap menolak akses (401), dan login menampilkan petunjuk setup (200).
- Total 49 tes, lint dan build dengan konfigurasi lokal lulus. Graphify AST diperbarui; parser SQL masih belum tersedia. Hasil ini merupakan verifikasi lokal, bukan konfirmasi deployment Vercel berhasil.
