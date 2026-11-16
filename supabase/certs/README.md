# CA database Supabase

`prod-ca-2021.crt` adalah sertifikat CA publik Supabase, bukan credential.

Sumber unduhan resmi yang digunakan dashboard Supabase:
https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt

Alamat ini diverifikasi melalui `ssl:certificate_url` pada source dashboard:
https://github.com/supabase/supabase/blob/master/apps/studio/hooks/custom-content/custom-content.json

SHA-256 certificate fingerprint:
`80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA`

Berlaku sampai 26 April 2031. Konfigurasi lokal menggunakan `sslmode=verify-full` dan `sslrootcert` yang menunjuk file ini pada URL runtime/migration. Path absolut lokal tidak boleh disalin langsung ke environment deployment; sesuaikan dengan lokasi file pada runtime tujuan. Jangan menonaktifkan verifikasi TLS ketika sertifikat diganti atau kedaluwarsa.
