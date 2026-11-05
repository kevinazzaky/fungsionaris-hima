# Arah tampilan admin

Membaca kebutuhan sebagai panel pengelola HIMA TI Undiknas dengan bahasa visual website yang ada: amber, putih hangat, dan Figtree/Rubik. ENERGY 1 / RHYTHM 1 / MOTION 1.

- Amber menandai tab aktif dan tindakan simpan; warna mengikuti identitas website.
- Latar terang mengikuti halaman publik dan membantu membaca tabel serta menilai foto tanpa tint gelap.
- Rubik untuk heading dan Figtree untuk isi mempertahankan tipografi yang sudah terpasang.
- Sidebar menunjukkan pekerjaan pengurus: pendaftar, fungsionaris, galeri, program kerja, serta pengaturan akun. Galeri memuat tab Galeri dan Hero beranda agar pengurus bisa berganti pengelolaan foto tanpa pindah halaman. Di bawah 1100 px, sidebar tersembunyi dan dibuka lewat tombol Menu pada header ringkas; desktop mempertahankan sidebar tetap.
- Tabel dipakai untuk perbandingan data pendaftar; baris foto dipakai untuk melihat konten sebelum edit. Tidak ada kartu statistik buatan.
- Form tambah/edit konten memakai popup native agar daftar tetap menjadi konteks di belakangnya. Pendaftar juga memakai dialog; fokus, keyboard dan Escape mengikuti perilaku native browser.
- Jarak rapat pada baris daftar, lebih longgar pada formulir; setiap kontrol utama minimal 44 px.
- Tidak ada ilustrasi, profil fiktif, atau aset baru. Avatar bawaan tetap digunakan jika foto belum diunggah.
- Gerak terbatas pada feedback bawaan kontrol; panel pengelola tidak memerlukan animasi dekoratif.
- Halaman akun memakai form satu kolom dengan label password yang jelas, petunjuk batas input, dan penjelasan bahwa pengguna perlu login kembali setelah perubahan.
- Cetak ulang ditempatkan pada detail pendaftar agar identitas diperiksa sebelum cetak. Kop, isi, ukuran A4 dan ruang tanda tangan memakai template publik yang ada; panel admin disembunyikan saat mencetak.
- Hero memakai daftar dan editor foto yang sama dengan galeri agar pengurus tidak perlu mempelajari pola baru. Konten terpisah karena foto hero tidak otomatis dipublikasikan di galeri. Dials tetap ENERGY 1 / RHYTHM 1 / MOTION 1 untuk admin; desain hero publik dipertahankan.
- Editor foto menampilkan foto tersimpan saat edit dan preview lokal ketika memilih file baru. Preview memakai contain agar gambar utuh dapat diperiksa; portrait untuk fungsionaris dan area lebar untuk hero/galeri. Batal pilih foto memulihkan gambar sebelumnya tanpa upload.
- Tab media mengikuti warna amber untuk pilihan aktif dan navigasi keyboard panah/Home/End. Tutup popup sebelum berganti tab; membatalkan popup membuang perubahan yang belum disimpan. Dials admin tetap ENERGY 1 / RHYTHM 1 / MOTION 1.
- Program kerja mengikuti popup editor dan daftar konten yang sudah ada. Ringkasan/deskripsi dipisahkan sesuai kartu dan modal publik; jadwal bebas teks mempertahankan rentang/semester. Preview utuh memakai contain dan publikasi dipisahkan dari status pendaftaran agar draft tidak tampil di website.
- Program kerja memakai tab periode, dengan periode terbaru sebagai pilihan awal. Kontrol tampil/sembunyi satu periode berada di atas daftar agar cakupannya jelas; label publikasi program dibedakan dari status periode. Tambah periode tetap melalui popup, tanpa menu sidebar baru. Tombol tab memakai aksen amber dan keyboard panah/Home/End.
- Navigasi mobile memakai dialog native di sisi kiri, dengan lima tautan satu kolom dan akun di bagian bawah. Tutup/Escape/backdrop dan pemilihan tautan menutup menu; resize desktop membersihkan modal serta mengembalikan fokus ke navigasi desktop. Safe area, scroll internal dan tinggi dinamis menjaga akses kontrol pada landscape. Dials tetap ENERGY 1 / RHYTHM 1 / MOTION 1.
- Buka/tutup penerimaan berada di halaman Pendaftar, berupa switch berlabel dan teks aksi yang menjelaskan status. Pembaruan menunggu respons server, menonaktifkan kontrol selama simpan, dan menyediakan error/retry; tidak menambah menu sidebar.
- Popup memiliki judul yang menyebut jenis konten, tombol Tutup, dan form dengan Batal. Penutupan dikunci saat menyimpan; validasi gagal mempertahankan popup/isian. Latar tidak bisa digulir selama popup terbuka, dan fokus kembali ke pemicu setelah tutup atau simpan berhasil.

Palet teks: `#272723` dan `#62625b` di `#f6f5f1`; tombol utama `#302715` di `#f1ca5d`; error `#8e231a` di `#fff1ee`; sukses `#30512c` di `#edf5e9`. Focus ring `#805400`. Pemeriksaan kontras dan verifikasi UI dicatat bersama hasil QA, tanpa mengklaim interaksi cloud yang belum diuji.
