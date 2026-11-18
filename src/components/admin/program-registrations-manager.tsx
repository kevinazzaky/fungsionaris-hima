"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_PROGRAM_FORM_CONFIG,
  formatCustomResponseValue,
  normalizeProgramFormConfig,
  normalizeStoredCustomResponses,
  type CustomFormField,
  type ProgramCustomResponses,
  type ProgramFormConfig,
} from "@/domain/program-form-config";
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

export type ParticipantUpdatePayload = {
  nama: string;
  nim: string;
  angkatan: string;
  noHp: string;
  idLine: string;
  email: string;
  catatan: string;
  customResponses: ProgramCustomResponses;
};

export function formatCustomCellValue(
  value: string | boolean | undefined,
): string {
  const formatted = formatCustomResponseValue(value);
  return formatted || "-";
}

export function summarizeCustomResponses(
  responses: ProgramCustomResponses | undefined,
  formConfig: ProgramFormConfig,
): {
  count: number;
  entries: { key: string; label: string; value: string }[];
  preview: string;
} {
  const stored = normalizeStoredCustomResponses(responses);
  const entries: { key: string; label: string; value: string }[] = [];
  const knownIds = new Set<string>();

  for (const field of formConfig.customFields) {
    knownIds.add(field.id);
    if (!Object.hasOwn(stored, field.id)) continue;
    const raw = stored[field.id];
    const formatted = formatCustomResponseValue(raw);
    if (field.type === "checkbox" || formatted !== "") {
      entries.push({ key: field.id, label: field.label, value: formatted });
    }
  }

  for (const [key, raw] of Object.entries(stored)) {
    if (knownIds.has(key)) continue;
    const formatted = formatCustomResponseValue(raw);
    if (typeof raw === "boolean" || formatted !== "") {
      entries.push({ key, label: key, value: formatted });
    }
  }

  return {
    count: entries.length,
    entries,
    preview: entries
      .slice(0, 2)
      .map((entry) => `${entry.label}: ${entry.value}`)
      .join(", "),
  };
}

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
    payload: ParticipantUpdatePayload,
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

  const programById = new Map(programs.map((program) => [program.id, program]));
  const totalAll = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const selectedProgram = activeProgramId
    ? programById.get(activeProgramId)
    : undefined;
  const exportHref = activeProgramId
    ? `/api/admin/program-registrations/export?${new URLSearchParams({
        programId: activeProgramId,
      }).toString()}`
    : "/api/admin/program-registrations/export";
  const hasActiveFilter = Boolean(activeProgramId || query);

  const selectedFormConfig = selectedProgram
    ? normalizeProgramFormConfig(selectedProgram.registrationFormConfig)
    : null;
  const selectedItemFormConfig = selected
    ? normalizeProgramFormConfig(
        programById.get(selected.programId)?.registrationFormConfig,
      )
    : DEFAULT_PROGRAM_FORM_CONFIG;

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
            <div
              className="admin-actions"
              style={{ justifyContent: "center", marginTop: "1rem" }}
            >
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
        <ParticipantsTable
          items={items}
          programs={programs}
          selectedProgram={selectedProgram}
          selectedFormConfig={selectedFormConfig}
          busy={busy}
          onSelect={(item) => {
            setDetailError("");
            setNotice("");
            setSelected(item);
          }}
          onRemove={(item) => void removeParticipant(item)}
        />
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
            formConfig={selectedItemFormConfig}
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

export function ParticipantsTable({
  items,
  programs,
  selectedProgram,
  selectedFormConfig,
  busy = false,
  onSelect,
  onRemove,
}: {
  items: ProgramRegistrationAdminRow[];
  programs: Program[];
  selectedProgram?: Program;
  selectedFormConfig?: ProgramFormConfig | null;
  busy?: boolean;
  onSelect: (item: ProgramRegistrationAdminRow) => void;
  onRemove: (item: ProgramRegistrationAdminRow) => void;
}) {
  const programById = new Map(programs.map((program) => [program.id, program]));

  if (selectedProgram && selectedFormConfig) {
    const showAngkatan =
      selectedFormConfig.builtInFields.angkatan !== "hidden" ||
      items.some((row) => Boolean(row.angkatan));
    const showNoHp =
      selectedFormConfig.builtInFields.noHp !== "hidden" ||
      items.some((row) => Boolean(row.noHp));
    const showIdLine =
      selectedFormConfig.builtInFields.idLine !== "hidden" ||
      items.some((row) => Boolean(row.idLine));
    const showEmail =
      selectedFormConfig.builtInFields.email !== "hidden" ||
      items.some((row) => Boolean(row.email));
    const showCatatan =
      selectedFormConfig.builtInFields.catatan !== "hidden" ||
      items.some((row) => Boolean(row.catatan));
    const showContactCol = showNoHp || showIdLine || showEmail;

    return (
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
              {showContactCol && <th scope="col">Kontak</th>}
              {showCatatan && <th scope="col">Catatan</th>}
              {selectedFormConfig.customFields.map((field) => (
                <th scope="col" key={field.id}>
                  {field.label}
                </th>
              ))}
              <th scope="col">Waktu daftar (WITA)</th>
              <th scope="col">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const hasVisibleAngkatan =
                selectedFormConfig.builtInFields.angkatan !== "hidden" ||
                Boolean(item.angkatan);
              const contactLines: { key: string; text: string; muted: boolean }[] =
                [];
              if (
                selectedFormConfig.builtInFields.noHp !== "hidden" ||
                item.noHp
              ) {
                contactLines.push({
                  key: "noHp",
                  text: `HP/WA: ${item.noHp || "-"}`,
                  muted: false,
                });
              }
              if (
                selectedFormConfig.builtInFields.idLine !== "hidden" ||
                item.idLine
              ) {
                contactLines.push({
                  key: "idLine",
                  text: `LINE: ${item.idLine || "-"}`,
                  muted: true,
                });
              }
              if (
                selectedFormConfig.builtInFields.email !== "hidden" ||
                item.email
              ) {
                contactLines.push({
                  key: "email",
                  text: item.email || "Email: -",
                  muted: true,
                });
              }

              return (
                <tr key={item.id}>
                  <td>
                    <span className="admin-cell-label" aria-hidden="true">
                      Peserta
                    </span>
                    <strong>{item.nama}</strong>
                    <p className="admin-meta">
                      {showAngkatan && hasVisibleAngkatan
                        ? `NIM ${item.nim} · Angkatan ${item.angkatan || "-"}`
                        : `NIM ${item.nim}`}
                    </p>
                  </td>
                  {showContactCol && (
                    <td>
                      <span className="admin-cell-label" aria-hidden="true">
                        Kontak
                      </span>
                      {contactLines.length > 0 ? (
                        contactLines.map((line) => (
                          <p
                            key={line.key}
                            className={line.muted ? "admin-meta" : undefined}
                          >
                            {line.text}
                          </p>
                        ))
                      ) : (
                        <p className="admin-meta">-</p>
                      )}
                    </td>
                  )}
                  {showCatatan && (
                    <td>
                      <span className="admin-cell-label" aria-hidden="true">
                        Catatan
                      </span>
                      <p className="admin-custom-cell-value">
                        {item.catatan || "-"}
                      </p>
                    </td>
                  )}
                  {selectedFormConfig.customFields.map((field) => (
                    <td key={field.id}>
                      <span className="admin-cell-label" aria-hidden="true">
                        {field.label}
                      </span>
                      <p className="admin-custom-cell-value">
                        {formatCustomCellValue(item.customResponses?.[field.id])}
                      </p>
                    </td>
                  ))}
                  <td>
                    <span className="admin-cell-label" aria-hidden="true">
                      Waktu daftar (WITA)
                    </span>
                    <p>{formatDate(item.submittedAt)}</p>
                  </td>
                  <td className="admin-participant-actions">
                    <div className="admin-actions">
                      <button
                        type="button"
                        className="admin-button"
                        disabled={busy}
                        aria-label={`Detail dan edit ${item.nama}`}
                        onClick={() => onSelect(item)}
                      >
                        Detail &amp; Edit
                      </button>
                      <button
                        type="button"
                        className="admin-button danger"
                        disabled={busy}
                        aria-label={`Hapus ${item.nama}`}
                        onClick={() => onRemove(item)}
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
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
            <th scope="col">Jawaban custom</th>
            <th scope="col">Waktu daftar (WITA)</th>
            <th scope="col">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const itemConfig = normalizeProgramFormConfig(
              programById.get(item.programId)?.registrationFormConfig,
            );
            const showAngkatan =
              itemConfig.builtInFields.angkatan !== "hidden" ||
              Boolean(item.angkatan);
            const summary = summarizeCustomResponses(
              item.customResponses,
              itemConfig,
            );
            const contactLines: { key: string; text: string; muted: boolean }[] =
              [];
            if (itemConfig.builtInFields.noHp !== "hidden" || item.noHp) {
              contactLines.push({
                key: "noHp",
                text: `HP/WA: ${item.noHp || "Tidak tercatat"}`,
                muted: false,
              });
            }
            if (itemConfig.builtInFields.idLine !== "hidden" || item.idLine) {
              contactLines.push({
                key: "idLine",
                text: `LINE: ${item.idLine || "Tidak tercatat"}`,
                muted: true,
              });
            }
            if (item.email) {
              contactLines.push({
                key: "email",
                text: item.email,
                muted: true,
              });
            }

            return (
              <tr key={item.id}>
                <td>
                  <span className="admin-cell-label" aria-hidden="true">
                    Peserta
                  </span>
                  <strong>{item.nama}</strong>
                  <p className="admin-meta">
                    {showAngkatan
                      ? `NIM ${item.nim} · Angkatan ${item.angkatan || "-"}`
                      : `NIM ${item.nim}`}
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
                  {contactLines.length > 0 ? (
                    contactLines.map((line) => (
                      <p
                        key={line.key}
                        className={line.muted ? "admin-meta" : undefined}
                      >
                        {line.text}
                      </p>
                    ))
                  ) : (
                    <p className="admin-meta">Tidak diminta di form</p>
                  )}
                </td>
                <td>
                  <span className="admin-cell-label" aria-hidden="true">
                    Jawaban custom
                  </span>
                  {summary.count > 0 ? (
                    <>
                      <p>
                        <strong>{`${summary.count} jawaban custom`}</strong>
                      </p>
                      <p className="admin-meta admin-custom-cell-value">
                        {summary.preview}
                      </p>
                    </>
                  ) : (
                    <p className="admin-meta">-</p>
                  )}
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
                      onClick={() => onSelect(item)}
                    >
                      Detail &amp; Edit
                    </button>
                    <button
                      type="button"
                      className="admin-button danger"
                      disabled={busy}
                      aria-label={`Hapus ${item.nama}`}
                      onClick={() => onRemove(item)}
                    >
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function renderCustomFieldInput(
  field: CustomFormField,
  value: string | boolean | undefined,
  onChange: (nextValue: string | boolean) => void,
) {
  const requirementText = field.required ? "(wajib)" : "(opsional)";
  const stringVal = typeof value === "string" ? value : "";

  if (field.type === "checkbox") {
    return (
      <label key={field.id} className="admin-check">
        <input
          type="checkbox"
          name={`custom_${field.id}`}
          checked={value === true}
          required={field.required}
          onChange={(event) => onChange(event.currentTarget.checked)}
        />
        {`${field.label} ${requirementText}`}
      </label>
    );
  }

  if (field.type === "textarea") {
    return (
      <label key={field.id}>
        {`${field.label} ${requirementText}`}
        <textarea
          name={`custom_${field.id}`}
          rows={3}
          maxLength={500}
          required={field.required}
          placeholder={field.placeholder || undefined}
          value={stringVal}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    );
  }

  if (field.type === "select") {
    const hasRemovedSavedOption =
      stringVal !== "" && !field.options.includes(stringVal);
    return (
      <label key={field.id}>
        {`${field.label} ${requirementText}`}
        <select
          name={`custom_${field.id}`}
          required={field.required}
          value={stringVal}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{`Pilih ${field.label}`}</option>
          {hasRemovedSavedOption && (
            <option value={stringVal}>
              {`${stringVal} (opsi terdahulu - tidak tersedia)`}
            </option>
          )}
          {field.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        {hasRemovedSavedOption && (
          <small>
            {`Nilai tersimpan sebelumnya: "${stringVal}" (tidak lagi tersedia pada daftar pilihan).`}
          </small>
        )}
      </label>
    );
  }

  if (field.type === "number") {
    return (
      <label key={field.id}>
        {`${field.label} ${requirementText}`}
        <input
          name={`custom_${field.id}`}
          type="text"
          inputMode="decimal"
          maxLength={30}
          required={field.required}
          placeholder={field.placeholder || undefined}
          value={stringVal}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    );
  }

  if (field.type === "date") {
    return (
      <label key={field.id}>
        {`${field.label} ${requirementText}`}
        <input
          name={`custom_${field.id}`}
          type="date"
          required={field.required}
          value={stringVal}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    );
  }

  return (
    <label key={field.id}>
      {`${field.label} ${requirementText}`}
      <input
        name={`custom_${field.id}`}
        type="text"
        maxLength={200}
        required={field.required}
        placeholder={field.placeholder || undefined}
        value={stringVal}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function ParticipantEditor({
  item,
  formConfig = DEFAULT_PROGRAM_FORM_CONFIG,
  saving,
  error,
  onCancel,
  onSubmit,
}: {
  item: ProgramRegistrationAdminRow;
  formConfig?: ProgramFormConfig;
  saving: boolean;
  error: string;
  onCancel: () => void;
  onSubmit: (payload: ParticipantUpdatePayload) => void;
}) {
  const normalizedConfig = normalizeProgramFormConfig(formConfig);
  const storedResponses = normalizeStoredCustomResponses(item.customResponses);

  const [customResponses, setCustomResponses] =
    useState<ProgramCustomResponses>(() => {
      const initial: ProgramCustomResponses = {};
      for (const field of normalizedConfig.customFields) {
        const raw = storedResponses[field.id];
        if (field.type === "checkbox") {
          initial[field.id] = raw === true;
        } else {
          initial[field.id] = typeof raw === "string" ? raw : "";
        }
      }
      return initial;
    });

  const activeCustomIds = new Set(
    normalizedConfig.customFields.map((field) => field.id),
  );
  const orphanedResponses = Object.entries(storedResponses).filter(
    ([key, val]) =>
      !activeCustomIds.has(key) &&
      (typeof val === "boolean" || val.trim() !== ""),
  );

  const builtIn = normalizedConfig.builtInFields;
  const legacyHiddenBuiltIns = (
    [
      ["angkatan", "Angkatan", item.angkatan],
      ["noHp", "No. HP / WA", item.noHp],
      ["idLine", "ID LINE", item.idLine],
      ["email", "Email", item.email],
      ["catatan", "Catatan", item.catatan],
    ] as const
  ).filter(
    ([key, , val]) => builtIn[key] === "hidden" && val.trim() !== "",
  );

  function updateCustomValue(fieldId: string, nextValue: string | boolean) {
    setCustomResponses((prev) => ({
      ...prev,
      [fieldId]: nextValue,
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSubmit({
      nama: String(form.get("nama") || ""),
      nim: String(form.get("nim") || ""),
      angkatan:
        builtIn.angkatan === "hidden" ? "" : String(form.get("angkatan") || ""),
      noHp: builtIn.noHp === "hidden" ? "" : String(form.get("noHp") || ""),
      idLine:
        builtIn.idLine === "hidden" ? "" : String(form.get("idLine") || ""),
      email: builtIn.email === "hidden" ? "" : String(form.get("email") || ""),
      catatan:
        builtIn.catatan === "hidden" ? "" : String(form.get("catatan") || ""),
      customResponses,
    });
  }

  const showAngkatanInput = builtIn.angkatan !== "hidden";
  const showNoHpInput = builtIn.noHp !== "hidden";
  const showIdLineInput = builtIn.idLine !== "hidden";
  const showEmailInput = builtIn.email !== "hidden";
  const showCatatanInput = builtIn.catatan !== "hidden";

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
            Nama lengkap (wajib)
            <input
              name="nama"
              type="text"
              required
              minLength={2}
              maxLength={100}
              defaultValue={item.nama}
            />
          </label>
          <div className={showAngkatanInput ? "admin-form-columns" : undefined}>
            <label>
              NIM (wajib)
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
            {showAngkatanInput && (
              <label>
                {`Angkatan (${builtIn.angkatan === "required" ? "wajib" : "opsional"})`}
                <input
                  name="angkatan"
                  type="text"
                  required={builtIn.angkatan === "required"}
                  minLength={4}
                  maxLength={4}
                  inputMode="numeric"
                  pattern="(19|20)\d{2}"
                  defaultValue={item.angkatan}
                />
                <small>Tahun masuk 4 digit, misalnya 2024.</small>
              </label>
            )}
          </div>
          {(showNoHpInput || showIdLineInput) && (
            <div
              className={
                showNoHpInput && showIdLineInput
                  ? "admin-form-columns"
                  : undefined
              }
            >
              {showNoHpInput && (
                <label>
                  {`No. HP / WA (${builtIn.noHp === "required" ? "wajib" : "opsional"})`}
                  <input
                    name="noHp"
                    type="tel"
                    maxLength={20}
                    inputMode="tel"
                    defaultValue={item.noHp}
                  />
                </label>
              )}
              {showIdLineInput && (
                <label>
                  {`ID LINE (${builtIn.idLine === "required" ? "wajib" : "opsional"})`}
                  <input
                    name="idLine"
                    type="text"
                    maxLength={64}
                    defaultValue={item.idLine}
                  />
                </label>
              )}
            </div>
          )}
          {showEmailInput && (
            <label>
              {`Email (${builtIn.email === "required" ? "wajib" : "opsional"})`}
              <input
                name="email"
                type="email"
                maxLength={120}
                defaultValue={item.email}
              />
            </label>
          )}
          {showCatatanInput && (
            <label>
              {`Catatan (${builtIn.catatan === "required" ? "wajib" : "opsional"})`}
              <textarea
                name="catatan"
                rows={3}
                maxLength={300}
                defaultValue={item.catatan}
              />
            </label>
          )}
          {legacyHiddenBuiltIns.length > 0 && (
            <div className="admin-legacy-responses">
              <h3>Data bawaan terdahulu</h3>
              <dl className="admin-details">
                {legacyHiddenBuiltIns.map(([key, label, val]) => (
                  <div key={key}>
                    <dt>{`${label} (disembunyikan)`}</dt>
                    <dd>{val}</dd>
                  </div>
                ))}
              </dl>
              <small>
                Kolom ini disembunyikan pada formulir aktif. Menyimpan ulang
                akan mengosongkan kolom tersembunyi.
              </small>
            </div>
          )}
          {normalizedConfig.customFields.length > 0 && (
            <div className="admin-custom-responses-editor">
              <h3>Pertanyaan tambahan custom</h3>
              {normalizedConfig.customFields.map((field) =>
                renderCustomFieldInput(
                  field,
                  customResponses[field.id],
                  (nextValue) => updateCustomValue(field.id, nextValue),
                ),
              )}
            </div>
          )}
          {orphanedResponses.length > 0 && (
            <div className="admin-legacy-responses">
              <h3>Jawaban kolom terdahulu</h3>
              <dl className="admin-details">
                {orphanedResponses.map(([key, val]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>{formatCustomResponseValue(val)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
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
