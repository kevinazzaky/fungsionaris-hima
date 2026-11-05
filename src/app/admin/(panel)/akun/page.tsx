import { requireAdmin } from "@/data/auth";
import { PasswordForm } from "@/components/admin/password-form";

export default async function AccountPage() {
  const admin = await requireAdmin();
  return (
    <>
      <header className="admin-page-header">
        <div>
          <h1>Akun admin</h1>
          <p>
            Anda masuk sebagai <strong>{admin.email}</strong>.
          </p>
        </div>
      </header>
      <section
        className="admin-editor"
        style={{ maxWidth: "640px" }}
        aria-labelledby="password-title"
      >
        <h2 id="password-title">Ganti kata sandi</h2>
        <p style={{ marginBottom: "1.5rem" }}>
          Setelah berhasil diganti, Anda akan keluar dan perlu masuk kembali
          dengan kata sandi baru.
        </p>
        <PasswordForm email={admin.email} />
      </section>
    </>
  );
}
