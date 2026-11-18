"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Key, Lock } from "@phosphor-icons/react/dist/ssr";
import { AdminRequestError, requestJson } from "./request";
import { VotingPinField } from "./voting-pin-field";
import { PendingLabel } from "@/components/ui/pending-label";
import type { VotingPinGateState } from "@/domain/voting-pin";

export function VotingPinGate({ state }: { state: VotingPinGateState }) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const pending = submitting || refreshing;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    if (state === "unconfigured") {
      if (newPin.trim().length < 4 || newPin.length < 4 || newPin.length > 200) {
        setError("PIN harus 4 sampai 200 karakter.");
        return;
      }
      if (newPin !== confirmPin) {
        setError("Konfirmasi PIN tidak cocok.");
        return;
      }
    } else if (!pin.trim()) {
      setError("Masukkan PIN Pemilihan Ketua terlebih dahulu.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await requestJson<{ unlocked: boolean }>("/api/admin/voting/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          state === "unconfigured"
            ? { action: "setup", newPin, confirmPin }
            : { action: "unlock", pin },
        ),
      });
      setPin("");
      setNewPin("");
      setConfirmPin("");
      startTransition(() => {
        router.refresh();
      });
    } catch (e) {
      if (e instanceof AdminRequestError && e.status === 409) {
        setError(e.message);
        startTransition(() => {
          router.refresh();
        });
        return;
      }
      setError(
        e instanceof Error
          ? e.message
          : "PIN gagal diperiksa. Silakan coba lagi.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const title =
    state === "unconfigured"
      ? "Buat PIN Pemilihan Ketua"
      : state === "locked"
        ? "Masukkan PIN Pemilihan Ketua"
        : "Akses Pemilihan Ketua belum siap";

  const description =
    state === "unconfigured"
      ? "Atur PIN pertama kali untuk mengunci tab Pemilihan Ketua di database. Setelah disimpan, PIN hanya dapat diubah dengan memasukkan PIN lama."
      : state === "locked"
        ? "Akses hanya terbuka sementara pada browser ini hingga sesi berakhir, keluar akun, atau dikunci kembali."
        : "Status PIN belum dapat diperiksa dari database. Pastikan migrasi database terbaru sudah dijalankan.";

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1>Pemilihan Ketua</h1>
          <p>
            Bagian ini dikunci terpisah dari akun admin utama untuk menjaga
            kerahasiaan data dan hasil pemilihan.
          </p>
        </div>
      </div>

      <section
        className="admin-voting-lock"
        aria-labelledby="voting-pin-gate-title"
      >
        <div className="admin-voting-lock-header">
          <span className="admin-voting-lock-badge" aria-hidden="true">
            {state === "unconfigured" ? (
              <Key size={20} weight="bold" />
            ) : (
              <Lock size={20} weight="bold" />
            )}
          </span>
          <div>
            <h2 id="voting-pin-gate-title">{title}</h2>
            <p className="admin-meta">{description}</p>
          </div>
        </div>

        {state === "unavailable" ? (
          <div className="admin-notice" role="status">
            <p>
              Untuk mencegah kebocoran akses, data pemilihan tidak ditampilkan
              sebelum database dan migrasi <code>voting_settings</code> siap.
            </p>
          </div>
        ) : (
          <form
            className="admin-form"
            onSubmit={(event) => void handleSubmit(event)}
            aria-busy={pending}
          >
            <fieldset disabled={pending}>
              {state === "unconfigured" ? (
                <>
                  <VotingPinField
                    label="PIN atau kata sandi baru"
                    name="newPin"
                    value={newPin}
                    onChange={setNewPin}
                    minLength={4}
                    autoComplete="new-password"
                    helperText="Minimal 4 karakter (disarankan kombinasi acak minimal 6 karakter). Tersimpan terenkripsi di database."
                  />
                  <VotingPinField
                    label="Ulangi PIN baru"
                    name="confirmPin"
                    value={confirmPin}
                    onChange={setConfirmPin}
                    minLength={4}
                    autoComplete="new-password"
                  />
                </>
              ) : (
                <VotingPinField
                  label="PIN atau kata sandi pemilihan"
                  name="pin"
                  value={pin}
                  onChange={setPin}
                  autoComplete="current-password"
                  helperText="Hanya pemegang PIN panitia inti yang dapat membuka data dan hasil pemilihan."
                />
              )}

              {error && (
                <p className="admin-error" role="alert">
                  {error}
                </p>
              )}

              <div className="admin-actions">
                <button
                  className="admin-button admin-button-primary"
                  type="submit"
                  disabled={pending}
                >
                  <PendingLabel
                    pending={pending}
                    text={
                      state === "unconfigured"
                        ? "Menyimpan PIN…"
                        : "Memeriksa PIN…"
                    }
                  >
                    {state === "unconfigured"
                      ? "Simpan PIN & Buka"
                      : "Buka Pemilihan Ketua"}
                  </PendingLabel>
                </button>
              </div>
            </fieldset>
          </form>
        )}
      </section>
    </>
  );
}
