import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdmin } from "@/data/auth";
import { isBackendConfigured } from "@/lib/backend-config";
import { LoginForm } from "@/components/admin/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ password?: string }>;
}) {
  const passwordUpdated = (await searchParams).password === "updated";
  const ready = isBackendConfigured();
  if (ready && (await getAdmin())) redirect("/admin");
  return (
    <main className="admin-login">
      <Link className="admin-back" href="/">
        Kembali ke website
      </Link>
      <div className="admin-login-brand">
        HIMA TI <span>Undiknas</span>
      </div>
      <h1>Masuk ke ruang pengelola</h1>
      <p>
        Kelola pendaftar, susunan fungsionaris, dan dokumentasi kegiatan HIMA
        TI.
      </p>
      {passwordUpdated && (
        <p className="admin-success" role="status">
          Kata sandi berhasil diganti. Silakan masuk dengan kata sandi baru.
        </p>
      )}
      {ready ? (
        <LoginForm />
      ) : (
        <section className="admin-setup" aria-labelledby="setup-title">
          <h2 id="setup-title">Admin belum diaktifkan</h2>
          <p>
            Project Supabase belum dihubungkan. Pengelola perlu menyelesaikan
            setup berikut sebelum masuk:
          </p>
          <ol>
            <li>
              Isi konfigurasi database, Auth, dan Storage di{" "}
              <code>.env.local</code>.
            </li>
            <li>Jalankan migrasi Prisma dan setup bucket.</li>
            <li>
              Masukkan konten awal dan daftarkan akun pengurus sebagai admin.
            </li>
          </ol>
          <p>
            Petunjuk lengkap tersedia di{" "}
            <code>docs/INFRASTRUCTURE_AND_CICD.md</code> dalam repository.
          </p>
        </section>
      )}
      <p className="admin-login-note">
        Akses hanya untuk akun pengurus yang telah didaftarkan oleh pengelola
        website.
      </p>
    </main>
  );
}
