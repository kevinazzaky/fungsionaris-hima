# Pedoman agen

- Baca `AGENTS.md`, memori project, dan aturan lokal sebelum mengubah kode.
- Gunakan npm sesuai `package-lock.json`; periksa dokumentasi Next.js terpasang sebelum memakai API framework.
- Pengguna memilih Supabase + Prisma; jangan mengganti ORM atau layanan tanpa instruksi.
- Akses database aplikasi melalui Prisma. Supabase client dipakai untuk Auth dan Storage.
- Jangan mencatat token, password, connection string, atau data pendaftar di source, log, fixture, maupun memori.
- Jangan menambahkan jalur bypass login untuk preview. Tes domain/use cases memakai repository in-memory; backend yang belum tersedia harus dilaporkan sebagai belum diverifikasi.
- Jangan menganggap HTTP sukses jika penyimpanan permanen gagal. Jangan menghidupkan kembali in-memory store atau kunci ekspor bawaan.
- Antislop diterapkan selama pengerjaan sesuai pilihan pengguna. Pertahankan identitas HIMA TI, fokus keyboard, state kosong/loading/error, dan layout ponsel.
- Setelah perubahan kode: jalankan `npm test`, `npm run lint`, `npm run db:validate`, `npm run build`, dan `graphify update .`.
