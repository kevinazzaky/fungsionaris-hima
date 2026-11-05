# Workflow Git

- Branch fitur dibuat dari `dev`; PR selalu menargetkan `dev`.
- Branch `main` saat ini merupakan branch produksi lama. Branch `dev` lokal dan `feat/admin-supabase-prisma` dibuat dari commit yang sama dengan `main`.
- Khusus fitur admin Supabase ini, PR menargetkan `main` sesuai instruksi eksplisit pemilik proyek. Alur rutin tetap memakai `dev`.
- Commit atomik memakai `<type>(<scope>): <deskripsi huruf kecil>`.
- Stage file tertentu, bukan `git add .` untuk perubahan lintas konteks.
- Sebelum PR: tes, lint, validasi Prisma, build, dan Graphify.

PR menggunakan bagian `## Summary`, `## Changes`, `## Verification`, dan referensi `Closes #N` jika ada issue yang benar-benar terkait. Jangan membuat nomor issue fiktif.
