"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Program } from "@/domain/programs";
import type { ProgramRegistrationListItem } from "@/domain/program-registrations";
import { EditorDialog } from "./editor-dialog";
import { formatDate, requestJson } from "./request";
import { PendingLabel } from "@/components/ui/pending-label";

export type ProgramRegistrationAdminRow = Omit<
  ProgramRegistrationListItem,
  "submittedAt" | "createdAt"
> & {
  submittedAt: string;
  createdAt: string;
};

type ProgramRegistrationsResponse = {
  items: ProgramRegistrationAdminRow[];
  counts: Record<string, number>;
  programs: Program[];
};

export function ProgramRegistrationsManager({
  programId,
  onProgramIdChange,
  onDataChanged,
  onBusyChange,
}: {
  programId?: string;
  onProgramIdChange?: (programId: string) => void;
  onDataChanged?: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const inFlight = useRef(false);
  const [internalProgramId, setInternalProgramId] = useState(programId ?? "");
  const activeProgramId =
    programId !== undefined ? programId : internalProgramId;
  const [items, setItems] = useState<ProgramRegistrationAdminRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [programs, setPrograms] = useState<Program[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ProgramRegistrationAdminRow | null>(
    null,
  );
  const [detailError, setDetailError] = useState("");

  function updateBusy(next: boolean) {
    setBusy(next);
    onBusyChange?.(next);
  }

  function updateProgramFilter(nextId: string) {
    setNotice("");
    setError("");
    setLoading(true);
    if (programId === undefined) setInternalProgramId(nextId);
    onProgramIdChange?.(nextId);
  }

  const load = useCallback(
    (signal?: AbortSignal) => {
      const params = new URLSearchParams();
      if (activeProgramId) params.set("programId", activeProgramId);
      if (query) params.set("q", query);
      const qs = params.toString();
      return requestJson<ProgramRegistrationsResponse>(
        `/api/admin/program-registrations${qs ? `?${qs}` : ""}`,
        { signal },
      )
        .then((result) => {
          if (!signal?.aborted) {
            setItems(result.items);
            setCounts(result.counts || {});
            setPrograms(result.programs || []);
            setHasLoaded(true);
            setError("");
          }
        })
        .catch((err: unknown) => {
          if (!signal?.aborted) {
            setError(
              err instanceof Error
                ? err.message
                : "Daftar peserta program kerja tidak dapat dimuat.",
            );
          }
        })
        .finally(() => {
          if (!signal?.aborted) setLoading(false);
        });
    },
    [activeProgramId, query],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === query) return;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      setQuery(trimmed);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput, query]);

  async function saveParticipant(
    id: string,
    payload: {
      nama: string;
      nim: string;
      angkatan: string;
      noHp: string;
      idLine: string;
      email: string;
      catatan: string;
    },
  ) {
    if (busy || inFlight.current) return;
    inFlight.current = true;
    updateBusy(true);
    setDetailError("");
    setNotice("");
    try {
      await requestJson<
        { item?: ProgramRegistrationAdminRow } | ProgramRegistrationAdminRow
      >(`/api/admin/program-registrations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setSelected(null);
      setNotice(`Data peserta ${payload.nama} berhasil diperbarui.`);
      await load();
      onDataChanged?.();
    } catch (err: unknown) {
      setDetailError(
        err instanceof Error ? err.message : "Data peserta gagal diperbarui.",
      );
    } finally {
      updateBusy(false);
      inFlight.current = false;
    }
  }

  async function removeParticipant(item: ProgramRegistrationAdminRow) {
    if (
      busy ||
      inFlight.current ||
      !window.confirm(
        `Hapus pendaftaran ${item.nama} (NIM ${item.nim}) dari program ${item.programTitle}? Data peserta akan dihapus permanen.`,
      )
    ) {
      return;
    }
    inFlight.current = true;
    updateBusy(true);
    setError("");
    setNotice("");
    try {
      await requestJson(`/api/admin/program-registrations/${item.id}`, {
        method: "DELETE",
      });
      if (selected?.id === item.id) setSelected(null);
      setNotice(
        `Pendaftaran ${item.nama} dari ${item.programTitle} berhasil dihapus.`,
      );
      await load();
      onDataChanged?.();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Pendaftaran peserta gagal dihapus.",
      );
    } finally {
      updateBusy(false);
      inFlight.current = false;
    }
  }

  function resetFilters() {
    setNotice("");
    setError("");
    setLoading(true);
    setSearchInput("");
    setQuery("");
    if (activeProgramId) {
      if (programId === undefined) setInternalProgramId("");
      onProgramIdChange?.("");
    } else if (query === "") {
      void load();
    }
  }

  const totalAll = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const selectedProgram = programs.find(
    (program) => program.id === activeProgramId,
  );
  const exportHref = activeProgramId
    ? `/api/admin/program-registrations/export?${new URLSearchParams({
        programId: activeProgramId,
      }).toString()}`
    : "/api/admin/program-registrations/export";
  const hasActiveFilter = Boolean(activeProgramId || query);

  return (
    <>
      <header className="admin-page-header">
        <div>
          <h1>Peserta program kerja</h1>
          <p>
            Kelola data peserta yang mendaftar melalui formulir internal
            program kerja.
          </p>
        </div>
        <div className="admin-actions">
          <a href={exportHref} className="admin-button primary">
            Unduh Excel (.xlsx)
          </a>
        </div>
      </header>
      {busy && !selected && (
        <p role="status">
          <PendingLabel pending text="Memproses perubahan…">
            Memproses perubahan
          </PendingLabel>
        </p>
      )}
      {notice && (
        <p className="admin-success" role="status">
          {notice}
        </p>
      )}
      <form
        className="admin-toolbar"
        onSubmit={(event) => {
          event.preventDefault();
          const trimmed = searchInput.trim();
          setError("");
          setNotice("");
          setLoading(true);
          if (trimmed === query) void load();
          else setQuery(trimmed);
        }}
      >
        <label>
          Filter program kerja
          <select
            value={activeProgramId}
            disabled={busy}
            onChange={(event) => updateProgramFilter(event.target.value)}
          >
            <option value="">
              {hasLoaded
                ? `Semua program kerja (${totalAll} peserta)`
                : "Semua program kerja"}
            </option>
            {activeProgramId && programs.length > 0 && !selectedProgram && (
              <option value={activeProgramId}>
                Program terpilih (tidak ditemukan)
              </option>
            )}
            {programs.map((program) => (
              <option key={program.id} value={program.id}>
                {`${program.period} - ${program.title} (${counts[program.id] ?? 0} peserta)`}
              </option>
            ))}
          </select>
        </label>
        <label>
          Cari peserta
          <input
            type="search"
            disabled={busy}
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Nama, NIM, angkatan, ID LINE, atau email"
            maxLength={100}
          />
        </label>
        <button className="admin-button" type="submit" disabled={busy}>
          Cari
        </button>
        {hasActiveFilter && (
          <button
            className="admin-button"
            type="button"
            disabled={busy}
            onClick={resetFilters}
          >
            Reset filter
          </button>
        )}
        <p role="status">
          {loading
            ? "Memuat jumlah peserta..."
            : error
              ? "Jumlah peserta belum tersedia"
              : selectedProgram?.registrationMaxQuota != null && !query
                ? `${items.length} / ${selectedProgram.registrationMaxQuota} peserta`
                : query
                  ? `${items.length} peserta ditemukan`
                  : `${items.length} peserta`}
        </p>
      </form>
      {error && (
        <div className="admin-error" role="alert">
          <p>{error}</p>
          <div className="admin-actions" style={{ marginTop: "0.75rem" }}>
            <button
              type="button"
              className="admin-button"
              disabled={loading || busy}
              onClick={() => {
                setLoading(true);
                setError("");
                void load();
              }}
            >
              <PendingLabel pending={loading} text="Memuat data…">
                Muat ulang
              </PendingLabel>
            </button>
            {hasActiveFilter && (
              <button
                type="button"
                className="admin-button"
                disabled={loading || busy}
                onClick={resetFilters}
              >
                Tampilkan semua peserta
              </button>
            )}
          </div>
        </div>
      )}
      {loading ? (
        <p className="admin-notice" role="status">
          <PendingLabel pending text="Memuat daftar peserta…">
            Memuat daftar peserta
          </PendingLabel>
        </p>
      ) : error ? null : items.length === 0 ? (
        <div className="admin-empty">
          <h2>
            {hasActiveFilter
              ? "Peserta tidak ditemukan"
              : "Belum ada peserta terdaftar"}
          </h2>
          <p>
            {hasActiveFilter
              ? "Tidak ada peserta yang sesuai dengan filter program atau kata kunci pencarian."
              : "Peserta yang mendaftar melalui formulir internal program kerja akan tampil di sini."}
          </p>
          {hasActiveFilter && (
            <div className="admin-actions" style={{ justifyContent: "center", marginTop: "1rem" }}>
              <button
                type="button"
                className="admin-button"
                disabled={busy}
                onClick={resetFilters}
              >
                Reset filter
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          className="admin-participants-wrap"
          role="region"
          aria-label="Daftar peserta program kerja"
        >
          <table className="admin-participants-table">
            <caption className="sr-only">Daftar peserta program kerja</caption>
            <thead>
              <tr>
                <th scope="col">Peserta</th>
                <th scope="col">Program kerja</th>
                <th scope="col">Kontak</th>
                <th scope="col">Waktu daftar (WITA)</th>
                <th scope="col">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className="admin-cell-label" aria-hidden="true">
                      Peserta
                    </span>
                    <strong>{item.nama}</strong>
                    <p className="admin-meta">
                      NIM {item.nim} · Angkatan {item.angkatan}
                    </p>
                  </td>
                  <td>
                    <span className="admin-cell-label" aria-hidden="true">
                      Program kerja
                    </span>
                    <strong>{item.programTitle}</strong>
                    <p className="admin-meta">Periode {item.programPeriod}</p>
                  </td>
                  <td>
                    <span className="admin-cell-label" aria-hidden="true">
                      Kontak
                    </span>
                    <p>HP/WA: {item.noHp || "Tidak tercatat"}</p>
                    <p className="admin-meta">
                      LINE: {item.idLine || "Tidak tercatat"}
                    </p>
                    {item.email && <p className="admin-meta">{item.email}</p>}
                  </td>
                  <td>
                    <span className="admin-cell-label" aria-hidden="true">
                      Waktu daftar (WITA)
                    </span>
                    <p>{formatDate(item.submittedAt)}</p>
                    {item.catatan && (
                      <p className="admin-meta">Catatan: {item.catatan}</p>
                    )}
                  </td>
                  <td className="admin-participant-actions">
                    <div className="admin-actions">
                      <button
                        type="button"
                        className="admin-button"
                        disabled={busy}
                        aria-label={`Detail dan edit ${item.nama}`}
                        onClick={() => {
                          setDetailError("");
                          setNotice("");
                          setSelected(item);
                        }}
                      >
                        Detail &amp; Edit
                      </button>
                      <button
                        type="button"
                        className="admin-button danger"
                        disabled={busy}
                        aria-label={`Hapus ${item.nama}`}
                        onClick={() => void removeParticipant(item)}
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
      {selected && (
        <EditorDialog
          busy={busy}
          onClose={() => {
            setSelected(null);
            setDetailError("");
          }}
          title={`Detail & Edit: ${selected.nama}`}
        >
          <ParticipantEditor
            key={selected.id}
            item={selected}
            saving={busy}
            error={detailError}
            onCancel={() => {
              setSelected(null);
              setDetailError("");
            }}
            onSubmit={(payload) => void saveParticipant(selected.id, payload)}
          />
        </EditorDialog>
      )}
    </>
  );
}

function ParticipantEditor({
  item,
  saving,
  error,
  onCancel,
  onSubmit,
}: {
  item: ProgramRegistrationAdminRow;
  saving: boolean;
  error: string;
  onCancel: () => void;
  onSubmit: (payload: {
    nama: string;
    nim: string;
    angkatan: string;
    noHp: string;
    idLine: string;
    email: string;
    catatan: string;
  }) => void;
}) {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSubmit({
      nama: String(form.get("nama") || ""),
      nim: String(form.get("nim") || ""),
      angkatan: String(form.get("angkatan") || ""),
      noHp: String(form.get("noHp") || ""),
      idLine: String(form.get("idLine") || ""),
      email: String(form.get("email") || ""),
      catatan: String(form.get("catatan") || ""),
    });
  }

  return (
    <>
      <dl className="admin-details admin-participant-meta">
        <div>
          <dt>Program Kerja</dt>
          <dd>{`${item.programPeriod} - ${item.programTitle}`}</dd>
        </div>
        <div>
          <dt>Waktu daftar (WITA)</dt>
          <dd>{formatDate(item.submittedAt)}</dd>
        </div>
      </dl>
      <form className="admin-form" onSubmit={handleSubmit} aria-busy={saving}>
        <fieldset disabled={saving}>
          <label>
            Nama lengkap
            <input
              name="nama"
              type="text"
              required
              minLength={2}
              maxLength={100}
              defaultValue={item.nama}
            />
          </label>
          <div className="admin-form-columns">
            <label>
              NIM
              <input
                name="nim"
                type="text"
                required
                minLength={5}
                maxLength={30}
                inputMode="numeric"
                pattern="\d{5,30}"
                defaultValue={item.nim}
              />
              <small>Masukkan 5 sampai 30 digit angka.</small>
            </label>
            <label>
              Angkatan
              <input
                name="angkatan"
                type="text"
                required
                minLength={4}
                maxLength={4}
                inputMode="numeric"
                pattern="(19|20)\d{2}"
                defaultValue={item.angkatan}
              />
              <small>Tahun masuk 4 digit, misalnya 2024.</small>
            </label>
          </div>
          <div className="admin-form-columns">
            <label>
              No. HP / WA
              <input
                name="noHp"
                type="tel"
                maxLength={20}
                inputMode="tel"
                defaultValue={item.noHp}
              />
            </label>
            <label>
              ID LINE
              <input
                name="idLine"
                type="text"
                maxLength={64}
                defaultValue={item.idLine}
              />
            </label>
          </div>
          <label>
            Email
            <input
              name="email"
              type="email"
              maxLength={120}
              defaultValue={item.email}
            />
          </label>
          <label>
            Catatan
            <textarea
              name="catatan"
              rows={3}
              maxLength={300}
              defaultValue={item.catatan}
            />
          </label>
          {error && (
            <p className="admin-error" role="alert">
              {error}
            </p>
          )}
          <div className="admin-actions">
            <button type="submit" className="admin-button primary">
              <PendingLabel pending={saving} text="Menyimpan perubahan…">
                Simpan perubahan
              </PendingLabel>
            </button>
            <button type="button" className="admin-button" onClick={onCancel}>
              Batal
            </button>
          </div>
        </fieldset>
      </form>
    </>
  );
}
