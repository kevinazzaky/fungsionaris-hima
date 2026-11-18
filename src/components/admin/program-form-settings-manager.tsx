"use client";

import { useEffect, useId, useRef, useState } from "react";
import { PROGRAM_STATUSES, type Program } from "@/domain/programs";
import { ValidationError } from "@/domain/admin";
import {
  normalizeProgramFormConfig,
  validateProgramFormConfig,
  type ProgramFormConfig,
} from "@/domain/program-form-config";
import { PendingLabel } from "@/components/ui/pending-label";
import { ProgramFormBuilder } from "./program-form-builder";
import { requestJson } from "./request";

export const UNSAVED_FORM_SETTINGS_CONFIRM_MESSAGE =
  "Pengaturan formulir yang diubah belum disimpan. Buang perubahan dan lanjutkan?";

export function confirmDiscardUnsavedFormSettings(
  dirty: boolean,
  confirmFn?: (message: string) => boolean,
): boolean {
  if (!dirty) return true;
  if (confirmFn) return confirmFn(UNSAVED_FORM_SETTINGS_CONFIRM_MESSAGE);
  if (typeof window === "undefined" || typeof window.confirm !== "function") {
    return true;
  }
  return window.confirm(UNSAVED_FORM_SETTINGS_CONFIRM_MESSAGE);
}

export type ProgramFormSettingsDraft = {
  status: Program["status"];
  registrationMaxQuota: string;
  registrationGroupLink: string;
  registrationFormConfig: ProgramFormConfig;
};

export function createProgramFormSettingsDraft(
  program: Program,
): ProgramFormSettingsDraft {
  return {
    status: program.status,
    registrationMaxQuota:
      program.registrationMaxQuota != null
        ? String(program.registrationMaxQuota)
        : "",
    registrationGroupLink: program.registrationGroupLink,
    registrationFormConfig: normalizeProgramFormConfig(
      program.registrationFormConfig,
    ),
  };
}

export function isProgramFormSettingsDirty(
  draft: ProgramFormSettingsDraft,
  baseline: Program,
): boolean {
  const baselineQuotaText =
    baseline.registrationMaxQuota != null
      ? String(baseline.registrationMaxQuota)
      : "";
  return (
    draft.status !== baseline.status ||
    draft.registrationMaxQuota.trim() !== baselineQuotaText ||
    draft.registrationGroupLink.trim() !== baseline.registrationGroupLink.trim() ||
    JSON.stringify(draft.registrationFormConfig) !==
      JSON.stringify(
        normalizeProgramFormConfig(baseline.registrationFormConfig),
      )
  );
}

export function areProgramFormSettingsEqual(
  left: Program,
  right: Program,
): boolean {
  return (
    left.status === right.status &&
    left.registrationMaxQuota === right.registrationMaxQuota &&
    left.registrationGroupLink.trim() === right.registrationGroupLink.trim() &&
    JSON.stringify(normalizeProgramFormConfig(left.registrationFormConfig)) ===
      JSON.stringify(normalizeProgramFormConfig(right.registrationFormConfig))
  );
}

export function syncProgramFormSettingsWithReload(
  state: {
    baseline: Program;
    draft: ProgramFormSettingsDraft;
  },
  nextProgram: Program,
): {
  baseline: Program;
  draft: ProgramFormSettingsDraft;
  settingsChanged: boolean;
  preservedDirtyDraft: boolean;
} {
  const dirty = isProgramFormSettingsDirty(state.draft, state.baseline);
  const settingsChanged = !areProgramFormSettingsEqual(
    state.baseline,
    nextProgram,
  );
  if (dirty) {
    return {
      baseline: nextProgram,
      draft: state.draft,
      settingsChanged,
      preservedDirtyDraft: true,
    };
  }
  return {
    baseline: nextProgram,
    draft: createProgramFormSettingsDraft(nextProgram),
    settingsChanged,
    preservedDirtyDraft: false,
  };
}

function useReportDirty(
  dirty: boolean,
  onDirtyChange?: (dirty: boolean) => void,
) {
  const callbackRef = useRef(onDirtyChange);
  useEffect(() => {
    callbackRef.current = onDirtyChange;
  }, [onDirtyChange]);

  useEffect(() => {
    callbackRef.current?.(dirty);
  }, [dirty]);

  useEffect(() => {
    return () => {
      callbackRef.current?.(false);
    };
  }, []);
}

export type ProgramFormSettingsManagerProps = {
  items: Program[];
  loading?: boolean;
  error?: string;
  selectedProgramId?: string;
  onProgramIdChange?: (programId: string) => void;
  onReload?: () => void;
  onSaved?: (item: Program) => Promise<void> | void;
  onBusyChange?: (busy: boolean) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onOpenProgramsTab?: () => void;
  onOpenParticipants?: (programId: string) => void;
};

export function ProgramFormSettingsManager({
  items,
  loading = false,
  error = "",
  selectedProgramId,
  onProgramIdChange,
  onReload,
  onSaved,
  onBusyChange,
  onDirtyChange,
  onOpenProgramsTab,
  onOpenParticipants,
}: ProgramFormSettingsManagerProps) {
  const [internalProgramId, setInternalProgramId] = useState(
    selectedProgramId ?? "",
  );
  const requestedProgramId =
    selectedProgramId !== undefined ? selectedProgramId : internalProgramId;
  const [saving, setSaving] = useState(false);
  const [editorDirty, setEditorDirty] = useState(false);

  const internalPrograms = items.filter(
    (item) => item.registrationMode === "internal",
  );
  const matchedProgram = requestedProgramId
    ? internalPrograms.find((item) => item.id === requestedProgramId)
    : undefined;
  const selectedProgram = matchedProgram ?? internalPrograms[0] ?? null;
  const hasUnmatchedSelection = Boolean(
    !loading &&
      !error &&
      requestedProgramId &&
      internalPrograms.length > 0 &&
      !matchedProgram,
  );
  const isDirty = Boolean(selectedProgram) && editorDirty;

  useReportDirty(isDirty, onDirtyChange);

  function handleSavingChange(next: boolean) {
    setSaving(next);
    onBusyChange?.(next);
  }

  function handleProgramChange(nextProgramId: string) {
    if (nextProgramId === selectedProgram?.id) return;
    if (!confirmDiscardUnsavedFormSettings(isDirty)) return;
    if (selectedProgramId === undefined) {
      setInternalProgramId(nextProgramId);
    }
    onProgramIdChange?.(nextProgramId);
  }

  return (
    <>
      <header className="admin-page-header">
        <div>
          <h1>Pengaturan formulir program</h1>
          <p>
            Atur status akses, kuota peserta, tautan grup, dan susunan kolom
            formulir untuk program bermode Formulir Website.
          </p>
        </div>
        {selectedProgram && (
          <div className="admin-actions">
            {onOpenParticipants ? (
              <button
                type="button"
                className="admin-button"
                disabled={saving}
                onClick={() => {
                  if (!confirmDiscardUnsavedFormSettings(isDirty)) return;
                  onOpenParticipants(selectedProgram.id);
                }}
              >
                Lihat peserta program ini
              </button>
            ) : (
              <a
                className="admin-button"
                href={`/admin/program-kerja?tab=peserta&programId=${encodeURIComponent(selectedProgram.id)}`}
                onClick={(event) => {
                  if (!confirmDiscardUnsavedFormSettings(isDirty)) {
                    event.preventDefault();
                  }
                }}
              >
                Lihat peserta program ini
              </a>
            )}
          </div>
        )}
      </header>

      {error && (
        <div className="admin-error" role="alert">
          <p>{error}</p>
          {onReload && (
            <div className="admin-actions" style={{ marginTop: "0.75rem" }}>
              <button
                type="button"
                className="admin-button"
                disabled={loading || saving}
                onClick={onReload}
              >
                <PendingLabel pending={loading} text="Memuat data…">
                  Muat ulang
                </PendingLabel>
              </button>
            </div>
          )}
        </div>
      )}

      {loading && items.length === 0 ? (
        <p className="admin-notice" role="status">
          <PendingLabel pending text="Memuat pengaturan formulir…">
            Memuat pengaturan formulir
          </PendingLabel>
        </p>
      ) : error && items.length === 0 ? null : internalPrograms.length === 0 ? (
        <div className="admin-empty">
          <h2>Belum ada program bermode Formulir Website</h2>
          <p>
            Buka tab Daftar program lalu pilih mode Formulir Website (Internal)
            pada program kerja yang ingin memakai formulir pendaftaran di
            website ini.
          </p>
          <div className="admin-actions admin-empty-actions">
            {onOpenProgramsTab ? (
              <button
                type="button"
                className="admin-button primary"
                disabled={saving}
                onClick={onOpenProgramsTab}
              >
                Buka Daftar program
              </button>
            ) : (
              <a className="admin-button primary" href="/admin/program-kerja">
                Buka Daftar program
              </a>
            )}
          </div>
        </div>
      ) : (
        selectedProgram && (
          <>
            {hasUnmatchedSelection && (
              <p className="admin-notice" role="status">
                Program yang diminta tidak memakai mode Formulir Website atau
                tidak ditemukan. Menampilkan pengaturan untuk program internal
                pertama.
              </p>
            )}
            <div className="admin-toolbar admin-form-settings-toolbar">
              <label>
                Pilih program kerja internal
                <select
                  value={selectedProgram.id}
                  disabled={saving}
                  onChange={(event) => handleProgramChange(event.target.value)}
                >
                  {internalPrograms.map((program) => (
                    <option key={program.id} value={program.id}>
                      {`${program.period} - ${program.title}`}
                    </option>
                  ))}
                </select>
              </label>
              <p className="admin-meta">
                {`${internalPrograms.length} program bermode Formulir Website`}
              </p>
            </div>
            <ProgramFormSettingsEditor
              key={selectedProgram.id}
              program={selectedProgram}
              saving={saving}
              onSavingChange={handleSavingChange}
              onDirtyChange={setEditorDirty}
              onSaved={onSaved}
            />
          </>
        )
      )}
    </>
  );
}

function ProgramFormSettingsEditor({
  program,
  saving,
  onSavingChange,
  onDirtyChange,
  onSaved,
}: {
  program: Program;
  saving: boolean;
  onSavingChange: (busy: boolean) => void;
  onDirtyChange: (dirty: boolean) => void;
  onSaved?: (item: Program) => Promise<void> | void;
}) {
  const accessHeadingId = useId();
  const builderHeadingId = useId();
  const submitting = useRef(false);
  const mounted = useRef(true);
  const copyTimer = useRef<number | null>(null);

  const [editorState, setEditorState] = useState<{
    syncedProgram: Program;
    baseline: Program;
    draft: ProgramFormSettingsDraft;
  }>(() => ({
    syncedProgram: program,
    baseline: program,
    draft: createProgramFormSettingsDraft(program),
  }));
  const [error, setError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");

  if (program !== editorState.syncedProgram) {
    const synced = syncProgramFormSettingsWithReload(editorState, program);
    setEditorState({
      syncedProgram: program,
      baseline: synced.baseline,
      draft: synced.draft,
    });
    if (!synced.preservedDirtyDraft && synced.settingsChanged) {
      setError("");
      setSaveSuccess("");
    }
  }

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    };
  }, []);

  const publicRegistrationPath = `/program-kerja/${program.id}/daftar`;
  const { baseline, draft } = editorState;
  const isDirty = isProgramFormSettingsDirty(draft, baseline);

  useReportDirty(isDirty, onDirtyChange);

  function updateDraft(
    updater: (prev: ProgramFormSettingsDraft) => ProgramFormSettingsDraft,
  ) {
    setEditorState((prev) => ({
      ...prev,
      draft: updater(prev.draft),
    }));
    setSaveSuccess("");
  }

  async function copyPublicLink(path: string) {
    setCopyError("");
    const fullUrl =
      typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard tidak tersedia");
      }
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopyError(`Salin tautan berikut secara manual: ${fullUrl}`);
    }
  }

  function resetChanges() {
    setEditorState((prev) => ({
      ...prev,
      draft: createProgramFormSettingsDraft(prev.baseline),
    }));
    setError("");
    setSaveSuccess("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || submitting.current) return;

    let validatedFormConfig: ProgramFormConfig;
    try {
      validatedFormConfig = validateProgramFormConfig(
        draft.registrationFormConfig,
      );
    } catch (err) {
      setSaveSuccess("");
      setError(
        err instanceof ValidationError
          ? err.message
          : "Konfigurasi formulir pendaftaran tidak valid.",
      );
      return;
    }

    const trimmedQuota = draft.registrationMaxQuota.trim();
    let parsedQuota: number | null = null;
    if (trimmedQuota !== "") {
      if (!/^\d+$/.test(trimmedQuota)) {
        setSaveSuccess("");
        setError(
          "Kuota maksimal peserta harus berupa bilangan bulat minimal 1.",
        );
        return;
      }
      const numericQuota = Number(trimmedQuota);
      if (
        !Number.isSafeInteger(numericQuota) ||
        numericQuota < 1 ||
        numericQuota > 2147483647
      ) {
        setSaveSuccess("");
        setError("Kuota maksimal peserta harus antara 1 dan 2147483647.");
        return;
      }
      parsedQuota = numericQuota;
    }

    submitting.current = true;
    onSavingChange(true);
    setError("");
    setSaveSuccess("");
    try {
      const result = await requestJson<{ item: Program }>(
        `/api/admin/programs/${program.id}/form`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: draft.status,
            registrationGroupLink: draft.registrationGroupLink.trim(),
            registrationMaxQuota: parsedQuota,
            registrationFormConfig: validatedFormConfig,
          }),
        },
      );
      await onSaved?.(result.item);
      if (mounted.current) {
        setEditorState((prev) => ({
          ...prev,
          baseline: result.item,
          draft: createProgramFormSettingsDraft(result.item),
        }));
        setSaveSuccess("Pengaturan formulir berhasil disimpan.");
      }
    } catch (err) {
      if (mounted.current) {
        setError(
          err instanceof Error
            ? err.message
            : "Pengaturan formulir gagal disimpan.",
        );
      }
    } finally {
      submitting.current = false;
      onSavingChange(false);
    }
  }

  return (
    <form
      className="admin-form admin-form-settings"
      onSubmit={handleSubmit}
      aria-busy={saving}
    >
      <fieldset disabled={saving}>
        <section
          className="admin-form-settings-card"
          aria-labelledby={accessHeadingId}
        >
          <div className="admin-form-settings-card-header">
            <h2 id={accessHeadingId}>Akses, kuota &amp; tautan grup</h2>
            <p className="admin-meta">
              Tentukan kapan pendaftaran dibuka, batas kuota peserta, dan tautan
              grup setelah pendaftaran berhasil.
            </p>
          </div>
          <div className="admin-form-columns">
            <label>
              Status pendaftaran
              <select
                name="status"
                value={draft.status}
                onChange={(event) => {
                  const nextStatus = event.target.value as Program["status"];
                  updateDraft((prev) => ({ ...prev, status: nextStatus }));
                }}
              >
                {Object.entries(PROGRAM_STATUSES).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <small>
                Formulir publik hanya menerima kiriman ketika status Pendaftaran
                Dibuka.
              </small>
            </label>
            <label>
              Kuota maksimal peserta (opsional)
              <input
                name="registrationMaxQuota"
                type="number"
                min={1}
                max={2147483647}
                step={1}
                inputMode="numeric"
                placeholder="Tanpa batas"
                value={draft.registrationMaxQuota}
                onChange={(event) => {
                  const nextQuota = event.target.value;
                  updateDraft((prev) => ({
                    ...prev,
                    registrationMaxQuota: nextQuota,
                  }));
                }}
              />
              <small>Kosongkan jika kuota peserta tidak dibatasi.</small>
            </label>
          </div>
          <label>
            Tautan grup WA/LINE peserta (opsional)
            <input
              name="registrationGroupLink"
              type="url"
              maxLength={2000}
              placeholder="https://line.me/ti/g/..."
              value={draft.registrationGroupLink}
              onChange={(event) => {
                const nextLink = event.target.value;
                updateDraft((prev) => ({
                  ...prev,
                  registrationGroupLink: nextLink,
                }));
              }}
            />
            <small>
              Ditampilkan kepada peserta setelah formulir berhasil dikirim.
            </small>
          </label>
          <div className="admin-registration-link-box">
            <strong>Tautan formulir pendaftaran publik</strong>
            <p className="admin-registration-link-path">
              {publicRegistrationPath}
            </p>
            <div className="admin-actions">
              <a
                className="admin-button"
                href={publicRegistrationPath}
                target="_blank"
                rel="noopener noreferrer"
              >
                Buka halaman
              </a>
              <button
                type="button"
                className="admin-button"
                onClick={() => void copyPublicLink(publicRegistrationPath)}
              >
                {copied ? "Tautan tersalin" : "Salin tautan"}
              </button>
            </div>
            {copied && (
              <span className="sr-only" role="status">
                Tautan formulir pendaftaran berhasil disalin.
              </span>
            )}
            {copyError && (
              <p className="admin-error" role="alert">
                {copyError}
              </p>
            )}
            <small>
              Peserta dapat mengakses halaman ini setelah program dan periode
              dipublikasikan dengan status Pendaftaran Dibuka.
            </small>
          </div>
        </section>

        <section
          className="admin-form-settings-card"
          aria-labelledby={builderHeadingId}
        >
          <div className="admin-form-settings-card-header">
            <h2 id={builderHeadingId}>Susunan kolom formulir</h2>
            <p className="admin-meta">
              Atur kolom bawaan yang wajib, opsional, atau disembunyikan serta
              tambahkan pertanyaan custom untuk program ini.
            </p>
          </div>
          <ProgramFormBuilder
            value={draft.registrationFormConfig}
            onChange={(next) => {
              updateDraft((prev) => ({
                ...prev,
                registrationFormConfig: next,
              }));
            }}
            disabled={saving}
          />
        </section>

        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}
        {saveSuccess && (
          <p className="admin-success" role="status">
            {saveSuccess}
          </p>
        )}

        <div className="admin-form-settings-savebar">
          <p className="admin-meta">
            {isDirty
              ? "Ada perubahan yang belum disimpan."
              : "Pengaturan sesuai data tersimpan."}
          </p>
          <div className="admin-actions">
            <button
              type="button"
              className="admin-button"
              disabled={saving || (!isDirty && !error)}
              onClick={resetChanges}
            >
              Reset perubahan
            </button>
            <button type="submit" className="admin-button primary">
              <PendingLabel pending={saving} text="Menyimpan pengaturan…">
                Simpan pengaturan formulir
              </PendingLabel>
            </button>
          </div>
        </div>
      </fieldset>
    </form>
  );
}
