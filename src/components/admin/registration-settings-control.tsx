"use client";

import { useCallback, useEffect, useState } from "react";
import type { RegistrationSettings } from "@/domain/registration-settings";
import { requestJson } from "./request";

export function RegistrationSettingsControl() {
  const [settings, setSettings] = useState<RegistrationSettings | null>(null);
  const [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const load = useCallback(
    (signal?: AbortSignal) =>
      requestJson<RegistrationSettings>("/api/admin/registration-settings", {
        signal,
      })
        .then((result) => {
          if (!signal?.aborted) {
            setSettings(result);
            setError("");
          }
        })
        .catch((error: unknown) => {
          if (!signal?.aborted)
            setError(
              error instanceof Error
                ? error.message
                : "Status pendaftaran tidak dapat dimuat.",
            );
        })
        .finally(() => {
          if (!signal?.aborted) setLoading(false);
        }),
    [],
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  async function toggle() {
    if (!settings || saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await requestJson<RegistrationSettings>(
        "/api/admin/registration-settings",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isOpen: !settings.isOpen }),
        },
      );
      setSettings(result);
      setNotice(
        result.isOpen
          ? "Pendaftaran berhasil dibuka."
          : "Pendaftaran berhasil ditutup.",
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Status pendaftaran gagal disimpan.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <section
      className="admin-registration-settings"
      aria-labelledby="registration-settings-title"
    >
      <div>
        <h2 id="registration-settings-title">Pendaftaran fungsionaris</h2>
        <p className="admin-meta">
          {loading
            ? "Memuat status pendaftaran..."
            : settings?.isOpen
              ? "Pendaftaran dibuka. Calon pendaftar dapat mengirim formulir."
              : settings
                ? "Pendaftaran ditutup. Pengiriman formulir baru ditolak."
                : "Status pendaftaran belum tersedia."}
        </p>
        <p className="admin-meta">
          Pengaturan ini berlaku pada website dan penerimaan formulir baru.
        </p>
      </div>
      {settings && !loading && (
        <button
          type="button"
          className="admin-button admin-registration-switch"
          role="switch"
          aria-label="Pendaftaran fungsionaris"
          aria-checked={settings.isOpen}
          disabled={saving}
          onClick={() => void toggle()}
        >
          <span className="admin-switch-track" aria-hidden="true">
            <span />
          </span>
          {saving
            ? "Menyimpan..."
            : settings.isOpen
              ? "Tutup pendaftaran"
              : "Buka pendaftaran"}
        </button>
      )}
      {notice && (
        <p className="admin-settings-feedback" role="status">
          {notice}
        </p>
      )}
      {error && (
        <div className="admin-error admin-settings-feedback" role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="admin-button"
            disabled={saving}
            onClick={() => {
              setLoading(true);
              setNotice("");
              void load();
            }}
          >
            Muat ulang status
          </button>
        </div>
      )}
    </section>
  );
}
