# Dokumentasi Sistem Perangkat Lunak: Portal Resmi HIMA TI Undiknas
**Standar Format: IEEE Std 830 / IEEE Std 1063 (Software Engineering Documentation)**  
**Identifikasi Dokumen:** IEEE-HIMATI-PORTAL-2026-V1.0  
**Afiliasi:** Himpunan Mahasiswa Teknologi Informasi, Universitas Pendidikan Nasional (Undiknas), Denpasar, Bali  
**Status Rilis:** Production-Ready (Stable)  
**Versi Sistem:** 0.1.0  

---

## Ringkasan Eksekutif (Abstract)

Dokumen ini mendefinisikan spesifikasi arsitektur, kebutuhan sistem, implementasi teknis, struktur direktori, serta panduan operasional dari portal web resmi Himpunan Mahasiswa Teknologi Informasi (HIMA TI) Universitas Pendidikan Nasional. Portal ini dikembangkan untuk menjadi platform digital representatif yang menyediakan akses informasi terpadu seputar profil kepengurusan, rekam jejak program kerja multi-periode, arsip dokumentasi kegiatan, serta sistem pra-pendaftaran fungsionaris baru secara digital.

Sistem dibangun menggunakan Next.js 16 (Turbopack, React 19), TypeScript, Tailwind CSS v4, Motion (Framer Motion v13), serta sistem pemrosesan berkas modern (Sharp dan SheetJS/xlsx).

---

## 1. Pendahuluan (Introduction)

### 1.1 Tujuan (Purpose)
Tujuan dari dokumen ini adalah memberikan panduan teknis komprehensif bagi pengembang, pengurus organisasi, dan tim pengelola sistem mengenai arsitektur, modul fungsional, tata kelola kode sumber, serta prosedur pemeliharaan dan penerapan (deployment) sistem.

### 1.2 Ruang Lingkup Sistem (System Scope)
Portal web HIMA TI Undiknas mencakup ruang lingkup fungsional sebagai berikut:
1. **Pusat Informasi & Profil Organisasi:** Mempublikasikan visi, misi, nilai budaya organisasi, serta sejarah HIMA TI.
2. **Direktori Struktur Kepengurusan:** Menampilkan bagan hierarki dan profil personalia fungsionaris aktif.
3. **Pusat Monitoring Program Kerja Multi-Periode:** Menampilkan katalog program kerja beserta rincian jadwal pelaksanaan, poster kegiatan resmi (e-flyer), status pembukaan registrasi, serta tautan formulir pendaftaran peserta melalui antarmuka modal interaktif.
4. **Galeri Dokumentasi Digital:** Mengarsipkan rekam jejak visual aktivitas mahasiswa TI dalam tata letak kisi (grid) responsif dengan fitur optimasi aset gambar webp.
5. **Portal Pendaftaran Fungsionaris:** Menyediakan sarana registrasi online dengan validasi form ketat, upload berkas persyaratan (PDF), mekanisme kontrol status buka/tutup sentral, serta ekspor rekapitulasi data pendaftar ke berkas spreadsheet (.xlsx).

### 1.3 Definisi, Akronim, dan Singkatan (Definitions & Acronyms)
* **HIMA TI:** Himpunan Mahasiswa Teknologi Informasi.
* **Undiknas:** Universitas Pendidikan Nasional.
* **Proker:** Program Kerja.
* **Kersos:** Kerja Sosial (program pengabdian masyarakat).
* **SSR / SSG:** Server-Side Rendering / Static Site Generation.
* **UI/UX:** User Interface / User Experience.
* **WCAG:** Web Content Accessibility Guidelines.
* **MIME:** Multipurpose Internet Mail Extensions.
* **CI/CD:** Continuous Integration / Continuous Deployment.

### 1.4 Referensi (References)
* IEEE Std 830-1998: *Recommended Practice for Software Requirements Specifications*.
* IEEE Std 1063-2001: *Standard for Software User Documentation*.
* ISO/IEC/IEEE 26511: *Systems and software engineering: Requirements for managers of user documentation*.
* W3C Web Content Accessibility Guidelines (WCAG) 2.1 Level AA.
* Next.js Documentation (Vercel, Next.js 16 with App Router Architecture).

---

## 2. Arsitektur Perangkat Lunak & Spesifikasi Teknologi (System Architecture)

### 2.1 Paradigma Arsitektur
Aplikasi mengadopsi pola arsitektur **Next.js App Router (React Server Components + Client Boundary Components)** yang dipisahkan secara deklaratif:
* **Server Components:** Bertanggung jawab atas pre-rendering konten statis, SEO meta-tag generation, dan optimasi rute.
* **Client Components (`"use client"`):** Bertanggung jawab atas interaksi dinamis seperti perpindahan tab periode, modal pop-up, navigasi tanpa hash URL, animasi transisi, dan validasi form pendaftaran.
* **API Route Handlers:** Memproses transaksi data pendaftaran melalui rute RESTful (`/api/pendaftaran` dan `/api/pendaftaran/export`).

### 2.2 Matriks Tumpukan Teknologi (Technology Stack)

| Komponen | Spesifikasi / Pustaka | Peran & Justifikasi Teknis |
| :--- | :--- | :--- |
| **Framework Utama** | Next.js 16.3.5 (Turbopack) | Fondasi aplikasi web modern dengan build turbo dan rendering hybrid (SSG/SSR) |
| **Pustaka UI** | React 19.2.8 | Pemrosesan komponen antarmuka reaktif dan pengelolaan status terpadu |
| **Bahasa Pemrograman** | TypeScript 5 | Menyediakan pengetikan statis ketat (static typing) untuk meminimalkan error runtime |
| **CSS Engine** | Tailwind CSS v4 (@tailwindcss/postcss) | Utilitas tata letak modern berkinerja tinggi berbasis PostCSS |
| **Mesin Animasi** | Motion v13.3.0 (motion/react) | Transisi mikro, efek layout morphing, dan kontrol animasi dialog modal |
| **Set Ikonografi** | @phosphor-icons/react v2.1.10 | Ikon grafis konsisten berstandar industri dengan dukungan SSR penuh |
| **Optimasi Gambar** | Sharp v0.35.4 & Next/Image | Kompresi dan konversi otomatis gambar lokal/eksternal ke format WebP/AVIF |
| **Pemrosesan Data** | SheetJS (xlsx v0.18.5) | Pembangkitan berkas workbook spreadsheet otomatis untuk rekap pendaftar |
| **Platform Hosting** | Vercel Edge Platform | Infrastruktur serverless global dengan dukungan integrasi domain kustom |

---

## 3. Spesifikasi Modul Fungsional (Functional Requirements)

### 3.1 Modul Navigasi & Beranda (`/`)
* **Hero Section:** Menampilkan pesan utama, slogan organisasi, serta tombol ajakan bertindak (Call to Action) terarah.
* **Section Scroller Tanpa Hash:** Mekanisme navigasi halus (`scrollToSection`) yang mengarahkan pengguna ke target ID section tanpa menyisakan parameter hash (`#`) pada URL peramban untuk menjaga kebersihan riwayat penelusuran.
* **Struktur Ringkas Terpadu:** Menghubungkan pengunjung ke pratinjau visi-misi, daftar divisi fungsionaris, program kerja unggulan, galeri pilihan, serta formulir kontak resmi.

### 3.2 Modul Profil Organisasi (`/about`)
* Memberikan pemaparan mendalam perihal identitas HIMA TI, nilai inti (integritas, inovasi, solidaritas), serta tab visualisasi visi dan misi organisasi.
* Menampilkan ornamen identitas budaya Bali yang diintegrasikan secara proporsional ke dalam estetika modern.

### 3.3 Modul Fungsionaris & Struktur Organisasi (`/fungsionaris`)
* Menggambarkan diagram tangga hierarki kepengurusan mulai dari Ketua Himpunan, Wakil Ketua, Badan Pengurus Harian (Sekretaris dan Bendahara), hingga koordinator serta anggota tiap divisi.
* Komponen `MemberNode` dan `HierarchyLadder` memetakan profil fungsionaris dengan penanda peran visual.

### 3.4 Modul Program Kerja & Modal Pop-Up Interaktif (`/program-kerja`)
* **Pengalih Periode Kepengurusan (Period Tabs):** Memisahkan program kerja aktif periode 2025/2026 dan arsip sukses 2024/2025.
* **Interaktivitas Kartu Program Kerja:** Seluruh kartu dapat diklik langsung (mouse click) maupun diakses via keyboard (fokus tombol Tab dan picu via Enter/Space).
* **Komponen Modal Rinci (`ProgramModal`):**
  * Menampilkan poster kegiatan asli (seperti e-flyer resmi Webinar Nasional 2026).
  * Status pendaftaran dinamis: "Pendaftaran Masih Dibuka" (badge hijau dengan dot berkedip), "Pendaftaran Ditutup" (badge abu-abu netral), atau "Segera Hadir" (badge kuning amber).
  * Menampilkan informasi terverifikasi: Tanggal pelaksanaan kegiatan, jam/waktu, lokasi/media kegiatan (Zoom Meeting / Auditorium Kampus).
  * Rincian tambahan terverifikasi: Daftar narasumber & moderator, biaya pendaftaran (HTM), daftar benefit peserta (E-Sertifikat, SKP A, relasi), narahubung (Contact Person), serta tombol langsung menuju Google Form pendaftaran.
  * Standar aksesibilitas dialog: Dapat ditutup menggunakan tombol Escape, klik backdrop luar, maupun tombol Close berlabel aria.

### 3.5 Modul Galeri Dokumentasi (`/gallery`)
* Menampilkan arsip foto kegiatan berformat WebP beresolusi tinggi dengan kompresi teroptimasi.
* Dilengkapi filter kategori visual dan mode grid adaptif terhadap ukuran layar ponsel, tablet, hingga desktop.

### 3.6 Modul Pendaftaran Fungsionaris (`/pendaftaran`)
* **Konfigurasi Sentral (`src/lib/pendaftaran-config.ts`):** Mengatur variabel `REGISTRATION_OPEN` (boolean). Nilai ini otomatis menyinkronkan tampilan di Beranda, halaman `/pendaftaran`, serta memproteksi rute backend `/api/pendaftaran`.
* **Kondisi Tertutup (Registration Closed):**
  * Halaman pendaftaran menampilkan pemberitahuan bahwa proses perekrutan belum dibuka karena belum memasuki periode registrasi baru.
  * Mengarahkan calon pendaftar untuk memantau pengumuman melalui kanal Instagram resmi `@hima_ti_undiknas`.
  * Rute API `/api/pendaftaran` mengembalikan HTTP status 403 (Forbidden) secara otomatis.
* **Kondisi Terbuka (Registration Open):**
  * Menampilkan formulir pendaftaran interaktif (`RegistrationForm`) dengan validasi nama, NIM, angkatan, pilihan divisi (minimal 2 divisi), dan upload berkas PDF (maksimal 10 MB).
* **Alur Pendaftaran (3 Tahap):**
  1. **Isi Formulir:** Calon pendaftar melengkapi data diri dan memilih minimal 2 divisi yang diminati.
  2. **Gabung Grup LINE:** Setelah formulir terkirim, pendaftar mendapatkan tautan grup LINE resmi tempat seluruh informasi tahapan selanjutnya diinfokan.
  3. **Wawancara:** Sesi wawancara singkat bersama tim pengurus HIMA TI.
* **Rute Ekspor Data Administrasi (`/api/pendaftaran/export`):**
  * Menyediakan endpoint serverless untuk mengekspor seluruh data pendaftar fungsionaris ke dalam berkas Excel (`.xlsx`) berformat rapi.

### 3.7 Modul Kontak & Footer Terintegrasi (`/contact`)
* Menampilkan informasi resmi lokasi sekretariat HIMA TI di Kampus Undiknas Denpasar, alamat email korespondensi resmi, tautan media sosial, serta pemetaan saluran komunikasi.

---

## 4. Standar Mutu & Rekayasa Non-Fungsional (Quality Standards)

### 4.1 Aksesibilitas & Human Ergonomics (WCAG 2.1 AA)
* **Navigasi Keyboard Penuh:** Semua kontrol antarmuka (tombol, tab, tautan, modal dialog) dapat diakses runtut menggunakan `Tab`, diaktifkan via `Enter`/`Space`, dan ditutup menggunakan `Escape`.
* **Kontras Warna Teruji:** Rasio kontras teks minimum 4.5:1 untuk teks normal dan 3:1 untuk teks tebal/besar pada mode gelap maupun terang.
* **Target Sentuh Mobile:** Seluruh tombol interaktif memiliki ukuran area sentuh minimal 44px x 44px guna kenyamanan pengguna ponsel cerdas.

### 4.2 Standar Copywriting & Kebersihan Konten (Anti-Slop Craftsmanship)
* **Bebas Karakter Em Dash (`—`):** Seluruh teks dan salinan antarmuka mematuhi standar penulisan natural bebas dari karakter generic AI em dash. Tanda baca digantikan secara tepat dengan koma, titik dua, tanda hubung pendek, atau kurung.
* **Fakta Otentik Terverifikasi:** Tidak memuat angka statistik fiktif maupun testimoni palsu. Seluruh agenda dan rincian kontak merujuk pada data organisasi yang valid.

### 4.3 Kinerja & Responsivitas (Performance & Resilience)
* Layout sepenuhnya bebas dari kebocoran horizontal (zero horizontal overflow) pada semua breakpoint resolusi layar (mulai 320px hingga resolusi 4K).
* Penerapan pemisahan kode otomatis (automatic code splitting) dan pemanfaatan `Sharp` untuk konversi on-the-fly aset visual.

---

## 5. Struktur Direktori Proyek (Directory Tree Mapping)

```
fungsionaris-hima/
├── .agents/                      # Konfigurasi skill dan aturan kerja agen AI
├── public/                       # Berkas aset statis yang disajikan langsung
│   ├── brand/                    # Aset identitas visual (logo emblem, logo full)
│   ├── gallery/                  # Arsip foto dokumentasi kegiatan (WebP)
│   ├── hero/                     # Dokumentasi visual untuk slideshow hero
│   └── proker/                   # Poster dan e-flyer resmi program kerja
│       ├── it-bootcamp.webp
│       ├── it-versary.jpg
│       ├── kersos-2025.jpg
│       ├── seminar-nasional.jpg
│       └── webinar-nasional.jpg  # E-flyer resmi Webinar Nasional 2026
├── src/
│   ├── app/                      # Next.js App Router (Rute halaman dan API)
│   │   ├── about/page.tsx        # Halaman profil dan visi-misi
│   │   ├── api/                  # Endpoint API Backend
│   │   │   └── pendaftaran/
│   │   │       ├── route.ts      # Handler POST penerimaan form & GET data
│   │   │       └── export/
│   │   │           └── route.ts  # Handler GET ekspor data pendaftaran ke Excel
│   │   ├── contact/page.tsx      # Halaman saluran kontak dan alamat
│   │   ├── fungsionaris/page.tsx # Halaman struktur kepengurusan fungsionaris
│   │   ├── gallery/page.tsx      # Halaman galeri dokumentasi kegiatan
│   │   ├── pendaftaran/page.tsx  # Halaman pendaftaran calon fungsionaris
│   │   ├── program-kerja/page.tsx# Halaman detail katalog program kerja
│   │   ├── globals.css           # Konfigurasi gaya global Tailwind CSS v4
│   │   ├── layout.tsx            # Layout utama aplikasi (Navbar, Footer, Smooth Scroll)
│   │   └── page.tsx              # Halaman Beranda (Landing Page)
│   ├── components/               # Komponen UI Modular
│   │   ├── detail/               # Komponen spesifik halaman detail
│   │   │   ├── detail-header.tsx
│   │   │   ├── program-period-tabs.tsx
│   │   │   └── vision-mission-tabs.tsx
│   │   ├── fungsionaris/         # Komponen bagan struktur organisasi
│   │   │   ├── hierarchy-ladder.tsx
│   │   │   └── member-node.tsx
│   │   ├── gallery/              # Komponen kisi galeri gambar
│   │   │   └── gallery-grid.tsx
│   │   ├── home/                 # Komponen bagian landing page
│   │   │   ├── about-section.tsx
│   │   │   ├── divisi-list.tsx
│   │   │   ├── fungsionaris-section.tsx
│   │   │   ├── gallery-section.tsx
│   │   │   ├── hero.tsx
│   │   │   ├── hero-slideshow.tsx
│   │   │   ├── pendaftaran-section.tsx
│   │   │   ├── program-kerja-section.tsx
│   │   │   ├── program-kerja-tabs.tsx
│   │   │   ├── program-modal.tsx # Modal pop-up rincian program kerja
│   │   │   └── section-scroller.tsx
│   │   ├── layout/               # Komponen tata letak global
│   │   │   ├── footer.tsx        # Footer informasi kontak dan jelajah
│   │   │   ├── mobile-menu.tsx   # Menu seluler adaptif
│   │   │   └── navbar.tsx        # Navigasi utama
│   │   ├── pendaftaran/          # Komponen formulir registrasi
│   │   │   └── registration-form.tsx
│   │   └── ui/                   # Komponen primitif antarmuka
│   │       ├── balinese-ornaments.tsx
│   │       ├── drag-scroll.tsx
│   │       ├── flourish-divider.tsx
│   │       ├── glow-button.tsx
│   │       ├── profile-avatar.tsx
│   │       ├── reveal.tsx
│   │       ├── scroll-progress.tsx
│   │       └── section-heading.tsx
│   └── lib/                      # Data lokal, helper utilitas, dan konfigurasi
│       ├── fungsionaris-data.ts  # Data struktur pengurus
│       ├── gallery-data.ts       # Data indeks berkas galeri
│       ├── pendaftaran-config.ts # Sakelar konfigurasi buka/tutup pendaftaran
│       ├── pendaftaran-store.ts  # Penyimpanan in-memory pendaftaran
│       └── smooth-scroll.ts      # Utilitas navigasi scroll tanpa hash
├── package.json                  # Dependensi dan script NPM
├── postcss.config.mjs            # Konfigurasi PostCSS untuk Tailwind CSS v4
├── tsconfig.json                 # Konfigurasi kompilator TypeScript
└── README.md                     # Dokumen panduan dan spesifikasi resmi
```

---

## 6. Petunjuk Instalasi & Pengembangan (Installation Guide)

### 6.1 Prasyarat Lingkungan (Prerequisites)
Pastikan lingkungan pengembangan memenuhi spesifikasi berikut:
* **Node.js:** Versi 20.x atau versi Long Term Support (LTS) terbaru.
* **Package Manager:** npm (bawaan Node.js), pnpm, atau yarn.
* **Sistem Operasi:** Kompatibel dengan Windows 10/11, macOS, dan Linux.

### 6.2 Prosedur Instalasi Dependensi
Jalankan perintah berikut di terminal root proyek:
```bash
npm install
```

### 6.3 Menjalankan Server Pengembangan Lokal
Untuk menyalakan server pengembangan dengan mesin Turbopack:
```bash
npm run dev
```
Buka peramban pada alamat `http://localhost:3000`.

### 6.4 Validasi Kualitas Kode & Kompilasi Produksi
Lakukan pengujian linting berkala dan kompilasi build produksi sebelum melakukan commit atau rilis:
```bash
# Pemeriksaan standar kode (ESLint)
npm run lint

# Kompilasi build produksi Next.js
npm run build
```

---

## 7. Prosedur Konfigurasi & Penerapan (Deployment Guide)

### 7.1 Tata Kelola Buka/Tutup Pendaftaran Fungsionaris
Untuk mengubah status penerimaan fungsionaris baru:
1. Buka berkas `src/lib/pendaftaran-config.ts`.
2. Ubah konstanta baris ke-7:
   * Menutup pendaftaran: `export const REGISTRATION_OPEN = false;`
   * Membuka pendaftaran: `export const REGISTRATION_OPEN = true;`
3. Simpan berkas dan terbitkan perubahan ke repositori. Sistem secara otomatis memperbarui indikator pada Beranda, halaman formulir, serta proteksi API endpoint.

### 7.2 Penerapan Produksi ke Platform Vercel
1. Hubungkan repositori GitHub ke dashboard Vercel.
2. Atur konfigurasi build framework sebagai **Next.js**.
3. Vercel akan mengeksekusi `npm run build` secara otomatis pada setiap push ke branch `main`.

### 7.3 Konfigurasi Domain Kustom
Apabila menggunakan domain khusus (misal dari registrar Rumahweb atau penyedia domain lainnya):
1. Tambahkan domain pada menu **Settings > Domains** di proyek Vercel.
2. Atur DNS Record pada panel manajemen DNS domain penyedia:
   * **Tipe A:** `@` mengarah ke IP Anycast Vercel `76.76.21.21`
   * **Tipe CNAME:** `www` mengarah ke `cname.vercel-dns.com.`
3. Tunggu proses propagasi DNS dan penerbitan sertifikat SSL otomatis dari Let's Encrypt / Vercel Edge.

---

## 8. Tata Kelola Kontribusi & Pemeliharaan (Maintenance & Governance)

Pengembangan sistem mematuhi konvensi berikut:
* **Conventional Commits:**
  * `feat(proker): ...` untuk penambahan fitur baru pada modul program kerja.
  * `fix(footer): ...` untuk perbaikan bug antarmuka atau logika sistem.
  * `docs(readme): ...` untuk pembaruan dokumentasi teknis.
  * `style: ...` / `refactor: ...` untuk restrukturisasi kode tanpa mengubah fungsionalitas.
* **Cabang Kerja (Branching):** Seluruh fitur diuji melalui branch kerja sebelum digabungkan ke cabang utama (`main`).

---

## 9. Hak Cipta & Kepemilikan (Ownership & License)

Dokumentasi dan sistem ini dikembangkan dan dikelola oleh:
**Himpunan Mahasiswa Teknologi Informasi (HIMA TI)**  
Program Studi Teknologi Informasi, Fakultas Teknik & Informatika  
Universitas Pendidikan Nasional (Undiknas), Denpasar, Bali  

*Hak Cipta © 2026 HIMA TI Undiknas. Seluruh hak cipta dilindungi undang-undang.*
