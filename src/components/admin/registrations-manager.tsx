"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import { formatDate, requestJson } from "./request";
import { RegistrationPrintDocument } from "@/components/pendaftaran/registration-print-document";
import type { RegistrationDocumentData } from "@/domain/registration-document";
import { RegistrationSettingsControl } from "./registration-settings-control";

type RegistrationRow = {
  id: string;
  nama: string;
  nim: string;
  angkatan: string;
  divisi: string;
  period: string;
  source: string;
  submittedAt: string | null;
};
type RegistrationDetail = RegistrationRow & {
  tempatTanggalLahir: string;
  jenisKelamin: string;
  alamat: string;
  noHp: string;
  idLine: string;
  pengalamanOrganisasi: string;
  minatSkill: string;
  alasanBergabung: string;
  alasanDivisi: string;
  berkas: string | null;
  hasFile: boolean;
  document: RegistrationDocumentData;
};
const fields: [keyof RegistrationDetail, string][] = [
  ["nim", "NIM"],
  ["angkatan", "Angkatan"],
  ["period", "Periode"],
  ["tempatTanggalLahir", "Tempat/tanggal lahir"],
  ["jenisKelamin", "Jenis kelamin"],
  ["alamat", "Alamat"],
  ["noHp", "Nomor HP/WA"],
  ["idLine", "ID LINE"],
  ["divisi", "Pilihan divisi"],
  ["pengalamanOrganisasi", "Pengalaman organisasi"],
  ["minatSkill", "Minat dan skill"],
  ["alasanBergabung", "Alasan bergabung"],
  ["alasanDivisi", "Alasan memilih divisi"],
];

export function RegistrationsManager() {
  const [items, setItems] = useState<RegistrationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<RegistrationDetail | null>(null);
  const [detailError, setDetailError] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [printData, setPrintData] = useState<RegistrationDocumentData | null>(
    null,
  );
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);

  const load = useCallback(
    (signal?: AbortSignal) =>
      requestJson<{ items: RegistrationRow[]; total: number }>(
        `/api/admin/registrations?${new URLSearchParams({ page: String(page), search: query })}`,
        { signal },
      )
        .then((result) => {
          setItems(result.items);
          setTotal(result.total);
        })
        .catch((error: unknown) => {
          if (!signal?.aborted)
            setError(
              error instanceof Error
                ? error.message
                : "Pendaftar tidak dapat dimuat.",
            );
        })
        .finally(() => {
          if (!signal?.aborted) setLoading(false);
        }),
    [page, query],
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    dialog.current?.showModal();
    void requestJson<{ item: RegistrationDetail }>(
      `/api/admin/registrations/${selected}`,
      { signal: controller.signal },
    )
      .then(({ item }) => setDetail(item))
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setDetailError(
            error instanceof Error ? error.message : "Rincian gagal dimuat.",
          );
      });
    return () => controller.abort();
  }, [selected]);

  function close() {
    if (busy) return;
    dialog.current?.close();
    setSelected(null);
    setDetail(null);
    setDetailError("");
    setEditing(false);
  }

  function open(item: RegistrationRow, edit = false) {
    setDetail(null);
    setDetailError("");
    setEditing(edit);
    setSelected(item.id);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail || busy) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setDetailError("");
    setNotice("");
    try {
      const result = await requestJson<{ item: RegistrationDetail }>(
        `/api/admin/registrations/${detail.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      setDetail(result.item);
      setEditing(false);
      setPrintData(null);
      setNotice("Data pendaftar berhasil diperbarui.");
      setError("");
      await load();
    } catch (error) {
      setDetailError(
        error instanceof Error ? error.message : "Perubahan gagal disimpan.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: RegistrationRow) {
    if (
      busy ||
      !window.confirm(
        `Hapus pendaftaran ${item.nama} (NIM ${item.nim})? Data dan lampiran yang tersimpan akan dihapus permanen.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    setDetailError("");
    setNotice("");
    try {
      const result = await requestJson<{ fileCleanupPending: boolean }>(
        `/api/admin/registrations/${item.id}`,
        { method: "DELETE" },
      );
      dialog.current?.close();
      setSelected(null);
      setDetail(null);
      setEditing(false);
      setPrintData(null);
      setNotice(
        result.fileCleanupPending
          ? "Data pendaftar dihapus, tetapi lampiran belum dapat dibersihkan dari Storage. Hubungi pengelola teknis."
          : "Data pendaftar berhasil dihapus.",
      );
      if (items.length === 1 && page > 1) {
        setLoading(true);
        setPage((value) => value - 1);
      } else await load();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Pendaftar gagal dihapus.";
      if (selected) setDetailError(message);
      else setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function printRegistration() {
    if (!detail || printing || busy) return;
    const data = detail.document;
    flushSync(() => {
      setPrintData(data);
      setPrinting(true);
      setPrintError("");
    });
    close();
    const originalTitle = document.title;
    document.title = `Formulir Pendaftaran HIMA TI - ${data.nama}`;
    try {
      await document.fonts.ready;
      const images = Array.from(
        document.querySelectorAll<HTMLImageElement>(
          "#printable-registration-document img",
        ),
      );
      await Promise.all(images.map((image) => image.decode()));
      window.print();
    } catch {
      setPrintError(
        "Surat belum dapat dicetak. Buka kembali detail pendaftar dan coba lagi setelah logo dokumen termuat.",
      );
    } finally {
      document.title = originalTitle;
      setPrinting(false);
    }
  }

  return (
    <>
      <header className="admin-page-header">
        <div>
          <h1>Pendaftar fungsionaris</h1>
          <p>
            Data dari formulir website dan hasil migrasi spreadsheet dikumpulkan
            di sini.
          </p>
        </div>
        <div className="admin-actions">
          <a href="/api/pendaftaran/export" className="admin-button primary">
            Unduh Excel
          </a>
        </div>
      </header>
      <RegistrationSettingsControl />
      {notice && (
        <p className="admin-success" role="status">
          {notice}
        </p>
      )}
      <form
        className="admin-toolbar"
        onSubmit={(event) => {
          event.preventDefault();
          setLoading(true);
          setError("");
          if (query === search.trim() && page === 1) void load();
          else {
            setPage(1);
            setQuery(search.trim());
          }
        }}
      >
        <label>
          Cari pendaftar
          <input
            type="search"
            disabled={busy}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nama, NIM, atau divisi..."
            maxLength={150}
          />
        </label>
        <button className="admin-button" type="submit" disabled={busy}>
          Cari
        </button>
        <p>{total} pendaftar</p>
      </form>
      {error && (
        <div className="admin-error" role="alert">
          <p>{error}</p>
          <button
            className="admin-button"
            onClick={() => {
              setLoading(true);
              setError("");
              void load();
            }}
          >
            Muat ulang
          </button>
        </div>
      )}
      {loading ? (
        <p className="admin-notice" role="status">
          Memuat daftar pendaftar...
        </p>
      ) : error ? null : items.length === 0 ? (
        <div className="admin-empty">
          <h2>
            {query ? "Pendaftar tidak ditemukan" : "Belum ada data pendaftar"}
          </h2>
          <p>
            {query
              ? "Coba kata kunci lain."
              : "Pendaftaran yang sudah tersimpan akan muncul di sini."}
          </p>
        </div>
      ) : (
        <div
          className="admin-table-wrap"
          tabIndex={0}
          role="region"
          aria-label="Daftar pendaftar, geser untuk melihat semua kolom"
        >
          <table>
            <caption className="sr-only">Daftar pendaftar fungsionaris</caption>
            <thead>
              <tr>
                <th scope="col">Nama / NIM</th>
                <th scope="col">Divisi</th>
                <th scope="col">Periode</th>
                <th scope="col">Sumber / waktu daftar</th>
                <th scope="col">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.nama}</strong>
                    <p>{item.nim}</p>
                  </td>
                  <td>{item.divisi}</td>
                  <td>
                    {item.period}
                    <p>Angkatan {item.angkatan}</p>
                  </td>
                  <td>
                    {item.source === "spreadsheet"
                      ? "Impor spreadsheet"
                      : "Formulir website"}
                    <p>{formatDate(item.submittedAt)}</p>
                  </td>
                  <td>
                    <div className="admin-actions">
                      <button
                        className="admin-button"
                        disabled={busy}
                        onClick={() => open(item)}
                        aria-label={`Lihat detail ${item.nama}`}
                      >
                        Detail
                      </button>
                      <button
                        className="admin-button"
                        disabled={busy}
                        onClick={() => open(item, true)}
                        aria-label={`Edit ${item.nama}`}
                      >
                        Edit
                      </button>
                      <button
                        className="admin-button danger"
                        disabled={busy}
                        onClick={() => void remove(item)}
                        aria-label={`Hapus ${item.nama}`}
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="admin-pagination">
        <p>
          Halaman {page} dari {Math.max(1, Math.ceil(total / 25))}
        </p>
        <div className="admin-actions">
          <button
            className="admin-button"
            disabled={page <= 1 || loading || busy}
            onClick={() => {
              setLoading(true);
              setError("");
              setPage((value) => value - 1);
            }}
          >
            Sebelumnya
          </button>
          <button
            className="admin-button"
            disabled={page * 25 >= total || loading || busy}
            onClick={() => {
              setLoading(true);
              setError("");
              setPage((value) => value + 1);
            }}
          >
            Berikutnya
          </button>
        </div>
      </div>
      {printing && (
        <p className="admin-notice" role="status">
          Menyiapkan surat untuk dicetak...
        </p>
      )}
      {printError && (
        <p className="admin-error" role="alert">
          {printError}
        </p>
      )}
      <dialog
        ref={dialog}
        onCancel={(event) => {
          if (busy) event.preventDefault();
          else close();
        }}
        onClose={() => {
          setSelected(null);
          setDetail(null);
          setDetailError("");
          setEditing(false);
        }}
        aria-labelledby="registration-detail-title"
      >
        <div className="admin-dialog-header">
          <h2 id="registration-detail-title">
            {detail?.nama || "Detail pendaftar"}
          </h2>
          <button className="admin-button" disabled={busy} onClick={close}>
            Tutup
          </button>
        </div>
        {detailError && (
          <p role="alert" className="admin-error">
            {detailError}
          </p>
        )}
        {!detail ? (
          detailError ? null : (
            <p role="status">Memuat rincian pendaftar...</p>
          )
        ) : editing ? (
          <form className="admin-form" onSubmit={save}>
            <h3>Edit data pendaftar</h3>
            <fieldset disabled={busy}>
              {(
                [["nama", "Nama lengkap"], ...fields] as [
                  keyof RegistrationDetail,
                  string,
                ][]
              ).map(([key, label]) => {
                const maxLength =
                  (
                    {
                      nama: 150,
                      nim: 30,
                      angkatan: 4,
                      period: 20,
                      tempatTanggalLahir: 200,
                      jenisKelamin: 50,
                      alamat: 1000,
                      noHp: 50,
                      idLine: 100,
                      divisi: 300,
                    } as Record<string, number>
                  )[key] || 5000;
                return (
                  <label key={key}>
                    {label}
                    {[
                      "alamat",
                      "pengalamanOrganisasi",
                      "minatSkill",
                      "alasanBergabung",
                      "alasanDivisi",
                    ].includes(key) ? (
                      <textarea
                        name={key}
                        defaultValue={String(detail[key] || "")}
                        rows={3}
                        maxLength={maxLength}
                      />
                    ) : (
                      <input
                        name={key}
                        defaultValue={String(detail[key] || "")}
                        maxLength={maxLength}
                        required={[
                          "nama",
                          "nim",
                          "angkatan",
                          "period",
                          "divisi",
                        ].includes(key)}
                        inputMode={
                          key === "nim" || key === "angkatan"
                            ? "numeric"
                            : undefined
                        }
                      />
                    )}
                  </label>
                );
              })}
              <p className="admin-meta">
                Pisahkan beberapa divisi dengan koma. Waktu daftar, sumber data,
                dan lampiran dipertahankan.
              </p>
              <div className="admin-actions">
                <button type="submit" className="admin-button primary">
                  {busy ? "Menyimpan..." : "Simpan perubahan"}
                </button>
                <button
                  type="button"
                  className="admin-button"
                  onClick={() => {
                    setEditing(false);
                    setDetailError("");
                  }}
                >
                  Batal edit
                </button>
              </div>
            </fieldset>
          </form>
        ) : (
          <>
            <dl className="admin-details">
              {fields.map(([key, label]) => (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd>{String(detail[key] || "Tidak tercatat")}</dd>
                </div>
              ))}
              <div>
                <dt>Waktu daftar (WITA)</dt>
                <dd>{formatDate(detail.submittedAt)}</dd>
              </div>
              <div>
                <dt>Berkas</dt>
                <dd>{detail.berkas || "Tidak diunggah"}</dd>
              </div>
            </dl>
            <div className="admin-actions" style={{ marginTop: "1.5rem" }}>
              <button
                type="button"
                className="admin-button"
                disabled={busy}
                onClick={() => setEditing(true)}
              >
                Edit data
              </button>
              <button
                type="button"
                className="admin-button danger"
                disabled={busy}
                onClick={() => void remove(detail)}
              >
                Hapus pendaftar
              </button>
              <button
                className="admin-button primary"
                type="button"
                disabled={printing || busy}
                onClick={() => void printRegistration()}
              >
                Cetak ulang surat / Simpan PDF
              </button>
            </div>
            <p className="admin-meta" style={{ marginTop: ".75rem" }}>
              Surat memakai template formulir dan pernyataan yang sama dengan
              halaman pendaftaran. Pilih printer atau Simpan sebagai PDF pada
              dialog cetak. Pas foto dan tanda tangan yang belum tersimpan perlu
              dilengkapi.
            </p>
            {detail.hasFile ? (
              <a
                className="admin-button"
                style={{ marginTop: "1.5rem" }}
                href={`/api/admin/registrations/${detail.id}?download=true`}
              >
                Unduh berkas yang diunggah
              </a>
            ) : detail.berkas ? (
              <p className="admin-notice">
                Data lama hanya menyimpan nama berkas. PDF belum tersedia di
                storage website.
              </p>
            ) : null}
          </>
        )}
      </dialog>
      {printData &&
        createPortal(
          <div className="hidden print:block">
            <RegistrationPrintDocument data={printData} />
          </div>,
          document.body,
        )}
    </>
  );
}
