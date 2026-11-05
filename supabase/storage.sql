-- Jalankan di Supabase SQL Editor setelah migrasi Prisma.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('website-media', 'website-media', true, 3145728, array['image/webp']),
  ('registration-files', 'registration-files', false, 3145728, array['application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Tidak ada policy upload/list untuk browser. Operasi storage melalui server dengan secret key.
