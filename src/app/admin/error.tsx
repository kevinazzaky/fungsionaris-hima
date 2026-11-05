"use client";

import Link from "next/link";

export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <section className="admin-login">
      <h1>Halaman admin belum dapat dimuat</h1>
      <p>Periksa koneksi database dan pastikan migrasi sudah dijalankan.</p>
      <div className="admin-actions">
        <button className="admin-button primary" onClick={reset}>
          Coba kembali
        </button>
        <Link className="admin-button" href="/admin/login">
          Kembali ke login
        </Link>
      </div>
    </section>
  );
}
