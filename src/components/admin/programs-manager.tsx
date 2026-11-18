"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  PROGRAM_ICONS,
  PROGRAM_STATUSES,
  type Program,
  type ProgramPeriod,
  type ProgramRegistrationMode,
} from "@/domain/programs";
import { ValidationError } from "@/domain/admin";
import {
  cloneDefaultProgramFormConfig,
  normalizeProgramFormConfig,
  validateProgramFormConfig,
  type ProgramFormConfig,
} from "@/domain/program-form-config";
import { requestJson } from "./request";
import { EditorDialog } from "./editor-dialog";
import { PendingLabel } from "@/components/ui/pending-label";
import { ProgramFormBuilder } from "./program-form-builder";
import { ProgramRegistrationsManager } from "./program-registrations-manager";

export type ProgramsManagerTab = "programs" | "registrations";

const sectionTabs: { id: ProgramsManagerTab; label: string }[] = [
  { id: "programs", label: "Daftar program" },
  { id: "registrations", label: "Peserta proker" },
];

export function ProgramsManager({
  initialTab = "programs",
  initialProgramId = "",
}: {
  initialTab?: ProgramsManagerTab;
  initialProgramId?: string;
}) {
  const inFlight = useRef(false);
  const sectionTabButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const registrationsPanel = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<ProgramsManagerTab>(initialTab);
  const [participantProgramId, setParticipantProgramId] =
    useState(initialProgramId);
  const [registrationsBusy, setRegistrationsBusy] = useState(false);

  const [items, setItems] = useState<Program[]>([]);
  const [periods, setPeriods] = useState<ProgramPeriod[]>([]);
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [addingPeriod, setAddingPeriod] = useState(false);
  const [periodError, setPeriodError] = useState("");
  const periodButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("");
  const [editing, setEditing] = useState<Program | "new" | null>(null);
  const [savedDialogNotice, setSavedDialogNotice] = useState("");

  const load = useCallback(
    (signal?: AbortSignal) =>
      requestJson<{
        items: Program[];
        periods: ProgramPeriod[];
        counts?: Record<string, number>;
      }>("/api/admin/programs", { signal })
        .then((result) => {
          if (!signal?.aborted) {
            setItems(result.items);
            setPeriods(result.periods);
            setCounts(result.counts ?? null);
            setError("");
          }
        })
        .catch((err: unknown) => {
          if (!signal?.aborted)
            setError(
              err instanceof Error
                ? err.message
                : "Program kerja tidak dapat dimuat.",
            );
        })
        .finally(() => {
          if (!signal?.aborted) setLoading(false);
        }),
    [],
  );

  function syncUrl(tab: ProgramsManagerTab, programIdValue: string) {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (tab === "registrations") {
      url.searchParams.set("tab", "peserta");
      if (programIdValue) url.searchParams.set("programId", programIdValue);
      else url.searchParams.delete("programId");
    } else {
      url.searchParams.delete("tab");
      url.searchParams.delete("programId");
    }
    window.history.replaceState(null, "", url);
  }

  function selectSectionTab(
    nextTab: ProgramsManagerTab,
    options?: {
      programId?: string;
      focusTab?: boolean;
      focusPanel?: boolean;
    },
  ) {
    if (busy || registrationsBusy || editing || addingPeriod) return;
    const nextProgramId =
      options?.programId !== undefined
        ? options.programId
        : participantProgramId;
    setActiveTab(nextTab);
    setParticipantProgramId(nextProgramId);
    syncUrl(nextTab, nextProgramId);
    if (nextTab === "programs") {
      void load();
    }
    if (options?.focusTab) {
      const index = sectionTabs.findIndex((tab) => tab.id === nextTab);
      if (index >= 0) sectionTabButtons.current[index]?.focus();
    } else if (options?.focusPanel && nextTab === "registrations") {
      requestAnimationFrame(() => registrationsPanel.current?.focus());
    }
  }

  function handleParticipantProgramChange(nextProgramId: string) {
    setParticipantProgramId(nextProgramId);
    syncUrl("registrations", nextProgramId);
  }

  const currentPeriod =
    periods.find((item) => item.period === period) || periods[0];
  const periodItems = items.filter(
    (item) => item.period === currentPeriod?.period,
  );

  async function createPeriod(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || inFlight.current) return;
    const form = new FormData(event.currentTarget);
    inFlight.current = true;
    setBusy(true);
    setPeriodError("");
    try {
      const result = await requestJson<{ period: ProgramPeriod }>(
        "/api/admin/program-periods",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            period: form.get("period"),
            isPublished: form.get("isPublished") === "on",
          }),
        },
      );
      await load();
      setPeriod(result.period.period);
      setBusy(false);
      setAddingPeriod(false);
      setNotice("Periode berhasil ditambahkan.");
    } catch (err) {
      setPeriodError(
        err instanceof Error ? err.message : "Periode gagal ditambahkan.",
      );
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }

  async function togglePeriod() {
    if (!currentPeriod || busy || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await requestJson("/api/admin/program-periods", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: currentPeriod.period,
          isPublished: !currentPeriod.isPublished,
        }),
      });
      await load();
      setNotice(
        currentPeriod.isPublished
          ? `Periode ${currentPeriod.period} disembunyikan dari website.`
          : `Periode ${currentPeriod.period} ditampilkan di website.`,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Status periode gagal disimpan.",
      );
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function remove(item: Program) {
    if (
      busy ||
      inFlight.current ||
      !window.confirm(
        `Hapus program ${item.title} periode ${item.period}? Data dan foto program akan dihapus permanen.`,
      )
    )
      return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await requestJson("/api/admin/programs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      if (editing !== "new" && editing?.id === item.id) {
        setEditing(null);
        setSavedDialogNotice("");
      }
      setNotice("Program kerja berhasil dihapus.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Program gagal dihapus.");
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }

  const filtered = items.filter(
    (item) =>
      item.period === currentPeriod?.period &&
      `${item.title} ${item.body} ${item.period}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );

  return (
    <>
      <div
        className="admin-media-tabs"
        role="tablist"
        aria-label="Pengelolaan program kerja"
      >
        {sectionTabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(node) => {
              sectionTabButtons.current[index] = node;
            }}
            type="button"
            role="tab"
            className="admin-button"
            id={`programs-tab-${tab.id}`}
            aria-controls={`programs-panel-${tab.id}`}
            aria-selected={activeTab === tab.id}
            tabIndex={activeTab === tab.id ? 0 : -1}
            disabled={busy || registrationsBusy}
            onClick={() => selectSectionTab(tab.id)}
            onKeyDown={(event) => {
              let next: number;
              if (event.key === "ArrowRight")
                next = (index + 1) % sectionTabs.length;
              else if (event.key === "ArrowLeft")
                next = (index + sectionTabs.length - 1) % sectionTabs.length;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = sectionTabs.length - 1;
              else return;
              event.preventDefault();
              selectSectionTab(sectionTabs[next].id, { focusTab: true });
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id="programs-panel-programs"
        aria-labelledby="programs-tab-programs"
        hidden={activeTab !== "programs"}
        tabIndex={0}
      >
        <header className="admin-page-header">
          <div>
            <h1>Program kerja</h1>
            <p>
              Kelola program, jadwal, mode pendaftaran, dan foto yang tampil di
              website.
            </p>
          </div>
          <div className="admin-actions">
            <button
              type="button"
              className="admin-button"
              disabled={busy}
              onClick={() => {
                setAddingPeriod(true);
                setPeriodError("");
                setNotice("");
              }}
            >
              Tambah periode
            </button>
            <button
              type="button"
              className="admin-button primary"
              disabled={busy}
              onClick={() => {
                setSavedDialogNotice("");
                setEditing("new");
                setNotice("");
              }}
            >
              Tambah program
            </button>
          </div>
        </header>
        {busy && !editing && !addingPeriod && (
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
        {error && (
          <div className="admin-error" role="alert">
            <p>{error}</p>
            <button
              type="button"
              className="admin-button"
              disabled={busy}
              onClick={() => {
                setLoading(true);
                void load();
              }}
            >
              <PendingLabel pending={loading} text="Memuat data…">
                Muat ulang
              </PendingLabel>
            </button>
          </div>
        )}
        {editing && (
          <EditorDialog
            busy={busy}
            onClose={() => {
              setEditing(null);
              setSavedDialogNotice("");
            }}
            title={
              editing === "new" ? "Tambah program kerja" : "Edit program kerja"
            }
          >
            <ProgramEditor
              key={editing === "new" ? "new" : editing.id}
              item={editing === "new" ? null : editing}
              initialPeriod={currentPeriod?.period || ""}
              savedNotice={savedDialogNotice}
              onBusy={setBusy}
              onCancel={() => {
                setEditing(null);
                setSavedDialogNotice("");
              }}
              onSaved={async (savedItem) => {
                const showLinkInDialog =
                  savedItem.registrationMode === "internal" &&
                  (editing === "new" ||
                    editing.registrationMode !== "internal");
                await load();
                setPeriod(savedItem.period);
                setBusy(false);
                if (showLinkInDialog) {
                  setEditing(savedItem);
                  setSavedDialogNotice(
                    "Program kerja berhasil disimpan. Gunakan tautan pendaftaran publik di bawah ini.",
                  );
                } else {
                  setEditing(null);
                  setSavedDialogNotice("");
                  setNotice("Program kerja berhasil disimpan.");
                }
              }}
            />
          </EditorDialog>
        )}
        {addingPeriod && (
          <EditorDialog
            title="Tambah periode program kerja"
            busy={busy}
            onClose={() => setAddingPeriod(false)}
          >
            <form className="admin-form" onSubmit={createPeriod}>
              <fieldset disabled={busy}>
                <label>
                  Periode baru
                  <input
                    name="period"
                    required
                    maxLength={20}
                    placeholder="2026/2027"
                  />
                  <small>Contoh: 2026/2027 atau 2027.</small>
                </label>
                <label className="admin-check">
                  <input type="checkbox" name="isPublished" defaultChecked />
                  Tampilkan periode di website
                </label>
                {periodError && (
                  <p role="alert" className="admin-error">
                    {periodError}
                  </p>
                )}
                <div className="admin-actions">
                  <button type="submit" className="admin-button primary">
                    <PendingLabel pending={busy} text="Menyimpan periode…">
                      Simpan periode
                    </PendingLabel>
                  </button>
                  <button
                    type="button"
                    className="admin-button"
                    onClick={() => setAddingPeriod(false)}
                  >
                    Batal
                  </button>
                </div>
              </fieldset>
            </form>
          </EditorDialog>
        )}
        {!!periods.length && (
          <div
            className="admin-media-tabs"
            role="tablist"
            aria-label="Periode program kerja"
          >
            {periods.map((item, index) => (
              <button
                key={item.period}
                ref={(node) => {
                  periodButtons.current[index] = node;
                }}
                type="button"
                role="tab"
                className="admin-button"
                id={`program-period-${item.period.replaceAll("/", "-")}`}
                aria-controls="program-period-panel"
                aria-selected={currentPeriod?.period === item.period}
                tabIndex={currentPeriod?.period === item.period ? 0 : -1}
                disabled={busy}
                onClick={() => setPeriod(item.period)}
                onKeyDown={(event) => {
                  let next: number;
                  if (event.key === "ArrowRight")
                    next = (index + 1) % periods.length;
                  else if (event.key === "ArrowLeft")
                    next = (index + periods.length - 1) % periods.length;
                  else if (event.key === "Home") next = 0;
                  else if (event.key === "End") next = periods.length - 1;
                  else return;
                  event.preventDefault();
                  setPeriod(periods[next].period);
                  periodButtons.current[next]?.focus();
                }}
              >
                {item.period}
              </button>
            ))}
          </div>
        )}
        <div
          role={currentPeriod ? "tabpanel" : undefined}
          id="program-period-panel"
          aria-labelledby={
            currentPeriod
              ? `program-period-${currentPeriod.period.replaceAll("/", "-")}`
              : undefined
          }
          tabIndex={currentPeriod ? 0 : undefined}
        >
          {currentPeriod && (
            <div className="admin-period-summary">
              <div>
                <h2>Periode {currentPeriod.period}</h2>
                <p className="admin-meta">
                  {currentPeriod.isPublished
                    ? "Periode ditampilkan di website"
                    : "Periode disembunyikan dari website"}
                </p>
                <p className="admin-meta">
                  Periode muncul jika ada program yang dipublikasikan. Status
                  tiap program tetap tersimpan saat periode disembunyikan.
                </p>
              </div>
              <button
                type="button"
                className="admin-button"
                disabled={busy}
                onClick={() => void togglePeriod()}
              >
                {currentPeriod.isPublished
                  ? "Sembunyikan periode"
                  : "Tampilkan periode"}
              </button>
            </div>
          )}
          <div className="admin-toolbar">
            <label>
              Cari program
              <input
                type="search"
                value={search}
                maxLength={150}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <p>
              {periodItems.length} program
              {currentPeriod ? ` dalam periode ${currentPeriod.period}` : ""}
            </p>
          </div>
          {loading ? (
            <p className="admin-notice" role="status">
              <PendingLabel pending text="Memuat program kerja…">
                Memuat program kerja
              </PendingLabel>
            </p>
          ) : error && items.length === 0 ? null : !filtered.length ? (
            <div className="admin-empty">
              <h2>
                {search
                  ? "Program tidak ditemukan"
                  : "Belum ada program kerja"}
              </h2>
              <p>
                {search
                  ? "Coba kata kunci lain."
                  : "Gunakan Tambah program untuk membuat program pertama."}
              </p>
            </div>
          ) : (
            <div className="admin-list">
              {filtered.map((item) => (
                <ProgramListRow
                  key={item.id}
                  item={item}
                  count={counts !== null ? (counts[item.id] ?? 0) : null}
                  busy={busy}
                  onViewParticipants={() =>
                    selectSectionTab("registrations", {
                      programId: item.id,
                      focusPanel: true,
                    })
                  }
                  onEdit={() => {
                    setSavedDialogNotice("");
                    setEditing(item);
                    setNotice("");
                  }}
                  onDelete={() => void remove(item)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        ref={registrationsPanel}
        role="tabpanel"
        id="programs-panel-registrations"
        aria-labelledby="programs-tab-registrations"
        hidden={activeTab !== "registrations"}
        tabIndex={0}
      >
        {activeTab === "registrations" && (
          <ProgramRegistrationsManager
            programId={participantProgramId}
            onProgramIdChange={handleParticipantProgramChange}
            onDataChanged={() => void load()}
            onBusyChange={setRegistrationsBusy}
          />
        )}
      </div>
    </>
  );
}

export function ProgramListRow({
  item,
  count,
  busy = false,
  onViewParticipants,
  onEdit,
  onDelete,
}: {
  item: Program;
  count: number | null;
  busy?: boolean;
  onViewParticipants: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const modeLabel =
    item.registrationMode === "internal"
      ? "Formulir Website"
      : "Tautan Eksternal";
  const customFieldCount =
    item.registrationMode === "internal"
      ? (item.registrationFormConfig?.customFields?.length ?? 0)
      : 0;
  const countText =
    count !== null
      ? item.registrationMaxQuota !== null
        ? `${count} / ${item.registrationMaxQuota} peserta`
        : `${count} peserta`
      : null;

  return (
    <article className="admin-content-row">
      <div className="admin-thumb">
        {item.imageUrl ? (
          <Image src={item.imageUrl} alt={item.title} fill sizes="76px" />
        ) : (
          <span className="admin-meta">Tanpa foto</span>
        )}
      </div>
      <div>
        <h2>{item.title}</h2>
        <p className="admin-meta">
          {item.period} · {PROGRAM_STATUSES[item.status]}
        </p>
        <div className="admin-row-badges">
          <span
            className={`admin-status ${
              item.registrationMode === "internal" ? "internal" : ""
            }`}
          >
            {modeLabel}
          </span>
          {customFieldCount > 0 && (
            <span className="admin-status">
              {`${customFieldCount} kolom custom`}
            </span>
          )}
          {countText !== null && (
            <span className="admin-meta" style={{ marginTop: 0 }}>
              {countText}
            </span>
          )}
          <span className={`admin-status ${item.isPublished ? "published" : ""}`}>
            {item.isPublished
              ? "Program dipublikasikan"
              : "Program disembunyikan"}
          </span>
          <span className="admin-meta" style={{ marginTop: 0 }}>
            Urutan {item.sortOrder}
          </span>
        </div>
      </div>
      <div className="admin-actions">
        <button
          type="button"
          className="admin-button"
          disabled={busy}
          aria-label={`Lihat peserta ${item.title}`}
          onClick={onViewParticipants}
        >
          Lihat peserta
        </button>
        <button
          type="button"
          className="admin-button"
          disabled={busy}
          aria-label={`Edit ${item.title}`}
          onClick={onEdit}
        >
          Edit
        </button>
        <button
          type="button"
          className="admin-button danger"
          disabled={busy}
          aria-label={`Hapus ${item.title}`}
          onClick={onDelete}
        >
          Hapus
        </button>
      </div>
    </article>
  );
}

const fields = [
  { key: "title", label: "Judul program", max: 150, required: true },
  { key: "period", label: "Periode program", max: 20, required: true },
  {
    key: "body",
    label: "Ringkasan",
    max: 300,
    required: true,
    multiline: true,
  },
  {
    key: "fullDescription",
    label: "Deskripsi lengkap",
    max: 10000,
    multiline: true,
  },
  { key: "executionDate", label: "Jadwal pelaksanaan", max: 200 },
  { key: "time", label: "Waktu kegiatan", max: 200 },
  { key: "location", label: "Lokasi", max: 300 },
  { key: "price", label: "Biaya registrasi", max: 200 },
  { key: "contactPerson", label: "Narahubung", max: 500 },
  {
    key: "speakers",
    label: "Narasumber dan moderator",
    max: 15049,
    multiline: true,
    lines: true,
  },
  {
    key: "benefits",
    label: "Benefit peserta",
    max: 15049,
    multiline: true,
    lines: true,
  },
] as const;

export function ProgramEditor({
  item,
  initialPeriod,
  savedNotice,
  onCancel,
  onSaved,
  onBusy,
}: {
  item: Program | null;
  initialPeriod: string;
  savedNotice: string;
  onCancel: () => void;
  onSaved: (item: Program) => Promise<void>;
  onBusy: (busy: boolean) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<Program["status"]>(
    item?.status || "upcoming",
  );
  const [registrationMode, setRegistrationMode] =
    useState<ProgramRegistrationMode>(item?.registrationMode || "external");
  const [gformLink, setGformLink] = useState(item?.gformLink || "");
  const [registrationMaxQuota, setRegistrationMaxQuota] = useState(
    item?.registrationMaxQuota != null ? String(item.registrationMaxQuota) : "",
  );
  const [registrationGroupLink, setRegistrationGroupLink] = useState(
    item?.registrationGroupLink || "",
  );
  const [registrationFormConfig, setRegistrationFormConfig] =
    useState<ProgramFormConfig>(() =>
      normalizeProgramFormConfig(item?.registrationFormConfig),
    );
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const copyTimer = useRef<number | null>(null);

  const [selected, setSelected] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [removeImage, setRemoveImage] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(
    () => () => {
      if (selected) URL.revokeObjectURL(selected.url);
    },
    [selected],
  );
  useEffect(
    () => () => {
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    },
    [],
  );

  const preview = selected?.url || (!removeImage ? item?.imageUrl : null);
  const publicRegistrationPath = item
    ? `/program-kerja/${item.id}/daftar`
    : "";

  function resetPhoto() {
    setSelected(null);
    setPhotoError("");
    if (fileInput.current) fileInput.current.value = "";
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

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (photoError || saving || submitting.current) return;
    let validatedFormConfig: ProgramFormConfig;
    try {
      validatedFormConfig =
        registrationMode === "internal"
          ? validateProgramFormConfig(registrationFormConfig)
          : item?.registrationFormConfig
            ? normalizeProgramFormConfig(item.registrationFormConfig)
            : cloneDefaultProgramFormConfig();
    } catch (err) {
      setError(
        err instanceof ValidationError
          ? err.message
          : "Konfigurasi formulir pendaftaran tidak valid.",
      );
      return;
    }
    const form = new FormData(event.currentTarget);
    const data: Record<string, unknown> = {
      sortOrder: Number(form.get("sortOrder")),
      isPublished: form.get("isPublished") === "on",
      status,
      icon: form.get("icon"),
      registrationMode,
      gformLink: registrationMode === "external" ? gformLink : "",
      registrationGroupLink:
        registrationMode === "internal" ? registrationGroupLink : "",
      registrationMaxQuota:
        registrationMode === "internal" ? registrationMaxQuota : "",
      registrationFormConfig: validatedFormConfig,
    };
    for (const field of fields) {
      const value = String(form.get(field.key) || "");
      data[field.key] =
        field.key === "speakers" || field.key === "benefits"
          ? value
              .split(/\r?\n/)
              .map((line) => line.trim())
              .filter(Boolean)
          : value;
    }
    const body = new FormData();
    body.set("data", JSON.stringify(data));
    if (item) body.set("id", item.id);
    const file = form.get("file");
    if (file instanceof File && file.size) body.set("file", file);
    if (removeImage) body.set("removeImage", "true");
    submitting.current = true;
    setSaving(true);
    onBusy(true);
    setError("");
    try {
      const result = await requestJson<{ item: Program }>(
        "/api/admin/programs",
        {
          method: item ? "PATCH" : "POST",
          body,
        },
      );
      await onSaved(result.item);
      if (mounted.current) {
        resetPhoto();
        setRemoveImage(false);
        setGformLink(result.item.gformLink);
        setRegistrationMaxQuota(
          result.item.registrationMaxQuota != null
            ? String(result.item.registrationMaxQuota)
            : "",
        );
        setRegistrationGroupLink(result.item.registrationGroupLink);
        setRegistrationFormConfig(
          normalizeProgramFormConfig(result.item.registrationFormConfig),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Program gagal disimpan.");
    } finally {
      setSaving(false);
      submitting.current = false;
      onBusy(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={submit} aria-busy={saving}>
      {savedNotice && (
        <p className="admin-success" role="status">
          {savedNotice}
        </p>
      )}
      <fieldset disabled={saving}>
        {fields.map((field) => {
          const value = item?.[field.key];
          const defaultValue = Array.isArray(value)
            ? value.join("\n")
            : value || (field.key === "period" && !item ? initialPeriod : "");
          return (
            <label key={field.key}>
              {field.label}
              {"multiline" in field ? (
                <textarea
                  name={field.key}
                  maxLength={field.max}
                  rows={field.key === "fullDescription" ? 6 : 3}
                  required={"required" in field && field.required}
                  defaultValue={defaultValue}
                />
              ) : (
                <input
                  name={field.key}
                  maxLength={field.max}
                  type="text"
                  required={"required" in field && field.required}
                  defaultValue={defaultValue}
                />
              )}
              {"lines" in field && (
                <small>Satu item per baris, maksimal 50 item.</small>
              )}
              {field.key === "period" && (
                <small>Contoh: 2025/2026 atau 2026.</small>
              )}
            </label>
          );
        })}
        <div className="admin-form-columns">
          <label>
            Status pendaftaran
            <select
              name="status"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as Program["status"])
              }
            >
              {Object.entries(PROGRAM_STATUSES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Mode pendaftaran
            <select
              name="registrationMode"
              value={registrationMode}
              onChange={(event) =>
                setRegistrationMode(
                  event.target.value as ProgramRegistrationMode,
                )
              }
            >
              <option value="external">Tautan Eksternal</option>
              <option value="internal">Formulir Website (Internal)</option>
            </select>
            <small>
              Pilih Formulir Website untuk pendaftaran langsung di halaman
              website ini.
            </small>
          </label>
        </div>
        {registrationMode === "external" ? (
          <label>
            Tautan pendaftaran (URL)
            <input
              name="gformLink"
              type="url"
              maxLength={2000}
              required={status === "open"}
              placeholder="https://forms.gle/..."
              value={gformLink}
              onChange={(event) => setGformLink(event.target.value)}
            />
            <small>
              {status === "open"
                ? "Wajib diisi jika status Pendaftaran Dibuka pada mode Tautan Eksternal."
                : "Opsional saat pendaftaran belum dibuka."}
            </small>
          </label>
        ) : (
          <>
            <div className="admin-form-columns">
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
                  value={registrationMaxQuota}
                  onChange={(event) =>
                    setRegistrationMaxQuota(event.target.value)
                  }
                />
                <small>Kosongkan jika kuota peserta tidak dibatasi.</small>
              </label>
              <label>
                Tautan grup WA/LINE peserta (opsional)
                <input
                  name="registrationGroupLink"
                  type="url"
                  maxLength={2000}
                  placeholder="https://line.me/ti/g/..."
                  value={registrationGroupLink}
                  onChange={(event) =>
                    setRegistrationGroupLink(event.target.value)
                  }
                />
                <small>
                  Ditampilkan kepada peserta setelah formulir berhasil dikirim.
                </small>
              </label>
            </div>
            <ProgramFormBuilder
              value={registrationFormConfig}
              onChange={setRegistrationFormConfig}
              disabled={saving}
            />
            {item ? (
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
                  Peserta dapat mengakses halaman ini setelah program dan
                  periode dipublikasikan dengan status Pendaftaran Dibuka.
                </small>
              </div>
            ) : (
              <p className="admin-notice">
                Setelah program disimpan, tautan formulir publik
                (/program-kerja/[id]/daftar) dengan tombol Buka halaman dan
                Salin tautan akan muncul di sini.
              </p>
            )}
          </>
        )}
        <div className="admin-form-columns">
          <label>
            Ikon program
            <select name="icon" defaultValue={item?.icon || "code"}>
              {Object.entries(PROGRAM_ICONS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Urutan tampil
            <input
              type="number"
              name="sortOrder"
              min={0}
              max={10000}
              step={1}
              required
              defaultValue={item?.sortOrder ?? 0}
            />
            <small>Angka kecil tampil dahulu dalam periode yang sama.</small>
          </label>
        </div>
        <label>
          Foto program (opsional)
          <input
            ref={fileInput}
            type="file"
            name="file"
            accept="image/jpeg,image/png,image/webp"
            aria-invalid={Boolean(photoError)}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              setPhotoError("");
              if (!file) {
                setSelected(null);
                return;
              }
              if (
                !["image/jpeg", "image/png", "image/webp"].includes(
                  file.type,
                ) ||
                !file.size ||
                file.size > 3 * 1024 * 1024
              ) {
                event.currentTarget.value = "";
                setSelected(null);
                setPhotoError(
                  "Foto harus JPG, PNG, atau WebP yang tidak kosong, maksimal 3 MB.",
                );
                return;
              }
              setRemoveImage(false);
              setSelected({ url: URL.createObjectURL(file), name: file.name });
            }}
          />
          <small>
            JPG, PNG atau WebP, maksimal 3 MB. Kosongkan untuk mempertahankan
            foto saat edit.
          </small>
        </label>
        <figure
          className="admin-photo-preview"
          aria-label="Pratinjau foto program"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={preview}
              src={preview}
              alt="Pratinjau foto program"
              onError={() =>
                setPhotoError(
                  "Gambar tidak dapat dibaca. Pilih gambar lain atau batalkan pilihan foto.",
                )
              }
            />
          ) : (
            <p>
              {removeImage
                ? "Foto akan dihapus setelah disimpan."
                : "Belum ada foto program."}
            </p>
          )}
          <figcaption>
            {selected
              ? `${selected.name} (belum disimpan)`
              : "Preview foto program sebelum menyimpan."}
          </figcaption>
        </figure>
        {photoError && (
          <p className="admin-error" role="alert">
            {photoError}
          </p>
        )}
        {(selected || photoError) && (
          <button type="button" className="admin-button" onClick={resetPhoto}>
            Batal pilih foto
          </button>
        )}
        {item?.imagePath && (
          <label className="admin-check">
            <input
              type="checkbox"
              name="removeImage"
              checked={removeImage}
              onChange={(event) => {
                resetPhoto();
                setRemoveImage(event.currentTarget.checked);
              }}
            />
            Hapus foto saat ini
          </label>
        )}
        <label className="admin-check">
          <input
            type="checkbox"
            name="isPublished"
            defaultChecked={item?.isPublished ?? true}
          />
          Tampilkan di website
        </label>
        <small>
          Program tampil jika periode dan program sama-sama dipublikasikan.
        </small>
        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}
        <div className="admin-actions">
          <button
            className="admin-button primary"
            type="submit"
            disabled={Boolean(photoError)}
          >
            <PendingLabel pending={saving} text="Menyimpan program…">
              Simpan program
            </PendingLabel>
          </button>
          <button className="admin-button" type="button" onClick={onCancel}>
            {savedNotice ? "Tutup" : "Batal"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
