"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  PROGRAM_ICONS,
  PROGRAM_STATUSES,
  type Program,
  type ProgramPeriod,
  type ProgramRegistrationMode,
} from "@/domain/programs";
import {
  cloneDefaultProgramFormConfig,
  normalizeProgramFormConfig,
  resolveCohortQuotaConfig,
} from "@/domain/program-form-config";
import { requestJson } from "./request";
import { EditorDialog } from "./editor-dialog";
import { PendingLabel } from "@/components/ui/pending-label";
import {
  confirmDiscardUnsavedFormSettings,
  ProgramFormSettingsManager,
} from "./program-form-settings-manager";
import { ProgramRegistrationsManager } from "./program-registrations-manager";

export type ProgramsManagerTab =
  | "programs"
  | "form-settings"
  | "registrations";

export function canLeaveFormSettingsTab(
  activeTab: ProgramsManagerTab,
  nextTab: ProgramsManagerTab,
  formSettingsDirty: boolean,
  skipUnsavedConfirm = false,
  confirmFn?: (message: string) => boolean,
): boolean {
  if (nextTab === activeTab || activeTab !== "form-settings") {
    return true;
  }
  if (skipUnsavedConfirm) {
    return true;
  }
  return confirmDiscardUnsavedFormSettings(formSettingsDirty, confirmFn);
}

type ProgramNotice = {
  text: string;
  actionProgram?: { id: string; title: string };
};

type ProgramsPayload = {
  items: Program[];
  periods: ProgramPeriod[];
  counts?: Record<string, number>;
};

function requestProgramsData(
  signal: AbortSignal | undefined,
  handlers: {
    onSuccess: (result: ProgramsPayload) => void;
    onError: (message: string) => void;
    onFinally: () => void;
  },
) {
  return requestJson<ProgramsPayload>("/api/admin/programs", { signal })
    .then((result) => {
      if (!signal?.aborted) handlers.onSuccess(result);
    })
    .catch((err: unknown) => {
      if (!signal?.aborted) {
        handlers.onError(
          err instanceof Error
            ? err.message
            : "Program kerja tidak dapat dimuat.",
        );
      }
    })
    .finally(() => {
      if (!signal?.aborted) handlers.onFinally();
    });
}

const sectionTabs: { id: ProgramsManagerTab; label: string }[] = [
  { id: "programs", label: "Daftar program" },
  { id: "form-settings", label: "Atur formulir" },
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
  const programsPanel = useRef<HTMLDivElement>(null);
  const formSettingsPanel = useRef<HTMLDivElement>(null);
  const registrationsPanel = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<ProgramsManagerTab>(initialTab);
  const [formProgramId, setFormProgramId] = useState(
    initialTab === "form-settings" ? initialProgramId : "",
  );
  const [participantProgramId, setParticipantProgramId] = useState(
    initialTab === "registrations" ? initialProgramId : "",
  );
  const [formSettingsBusy, setFormSettingsBusy] = useState(false);
  const [formSettingsDirty, setFormSettingsDirty] = useState(false);
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
  const [notice, setNotice] = useState<ProgramNotice | null>(null);
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("");
  const [editing, setEditing] = useState<Program | "new" | null>(null);

  function load(signal?: AbortSignal) {
    return requestProgramsData(signal, {
      onSuccess: (result) => {
        setItems(result.items);
        setPeriods(result.periods);
        setCounts(result.counts ?? null);
        setError("");
      },
      onError: setError,
      onFinally: () => setLoading(false),
    });
  }

  function syncUrl(tab: ProgramsManagerTab, programIdValue: string) {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (tab === "registrations") {
      url.searchParams.set("tab", "peserta");
      if (programIdValue) url.searchParams.set("programId", programIdValue);
      else url.searchParams.delete("programId");
    } else if (tab === "form-settings") {
      url.searchParams.set("tab", "formulir");
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
      skipUnsavedConfirm?: boolean;
    },
  ) {
    if (
      busy ||
      registrationsBusy ||
      formSettingsBusy ||
      editing ||
      addingPeriod
    ) {
      return;
    }
    if (
      !canLeaveFormSettingsTab(
        activeTab,
        nextTab,
        formSettingsDirty,
        options?.skipUnsavedConfirm,
      )
    ) {
      return;
    }
    if (nextTab !== activeTab && activeTab === "form-settings") {
      setFormSettingsDirty(false);
    }
    let nextUrlProgramId = "";
    if (nextTab === "form-settings") {
      const resolved =
        options?.programId !== undefined ? options.programId : formProgramId;
      setFormProgramId(resolved);
      nextUrlProgramId = resolved;
    } else if (nextTab === "registrations") {
      const resolved =
        options?.programId !== undefined
          ? options.programId
          : participantProgramId;
      setParticipantProgramId(resolved);
      nextUrlProgramId = resolved;
    }
    setActiveTab(nextTab);
    syncUrl(nextTab, nextUrlProgramId);
    if (nextTab === "programs") {
      void load();
    }
    if (options?.focusTab) {
      const index = sectionTabs.findIndex((tab) => tab.id === nextTab);
      if (index >= 0) sectionTabButtons.current[index]?.focus();
    } else if (options?.focusPanel) {
      if (nextTab === "registrations") {
        requestAnimationFrame(() => registrationsPanel.current?.focus());
      } else if (nextTab === "form-settings") {
        requestAnimationFrame(() => formSettingsPanel.current?.focus());
      } else {
        requestAnimationFrame(() => programsPanel.current?.focus());
      }
    }
  }

  function handleFormProgramChange(nextProgramId: string) {
    setFormProgramId(nextProgramId);
    syncUrl("form-settings", nextProgramId);
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
      setNotice({ text: "Periode berhasil ditambahkan." });
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
    setNotice(null);
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
      setNotice({
        text: currentPeriod.isPublished
          ? `Periode ${currentPeriod.period} disembunyikan dari website.`
          : `Periode ${currentPeriod.period} ditampilkan di website.`,
      });
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
    void requestProgramsData(controller.signal, {
      onSuccess: (result) => {
        setItems(result.items);
        setPeriods(result.periods);
        setCounts(result.counts ?? null);
        setError("");
      },
      onError: setError,
      onFinally: () => setLoading(false),
    });
    return () => controller.abort();
  }, []);

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
    setNotice(null);
    try {
      await requestJson("/api/admin/programs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      if (editing !== "new" && editing?.id === item.id) {
        setEditing(null);
      }
      if (formProgramId === item.id) setFormProgramId("");
      if (participantProgramId === item.id) setParticipantProgramId("");
      setNotice({ text: "Program kerja berhasil dihapus." });
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
            disabled={busy || registrationsBusy || formSettingsBusy}
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
        ref={programsPanel}
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
                setNotice(null);
              }}
            >
              Tambah periode
            </button>
            <button
              type="button"
              className="admin-button primary"
              disabled={busy}
              onClick={() => {
                setEditing("new");
                setNotice(null);
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
          <div className="admin-success admin-notice-banner" role="status">
            <p>{notice.text}</p>
            {notice.actionProgram && (
              <button
                type="button"
                className="admin-button"
                disabled={busy}
                onClick={() => {
                  const targetId = notice.actionProgram!.id;
                  setNotice(null);
                  selectSectionTab("form-settings", {
                    programId: targetId,
                    focusPanel: true,
                  });
                }}
              >
                {`Atur formulir ${notice.actionProgram.title}`}
              </button>
            )}
          </div>
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
            }}
            title={
              editing === "new" ? "Tambah program kerja" : "Edit program kerja"
            }
          >
            <ProgramEditor
              key={editing === "new" ? "new" : editing.id}
              item={editing === "new" ? null : editing}
              initialPeriod={currentPeriod?.period || ""}
              onBusy={setBusy}
              onCancel={() => {
                setEditing(null);
              }}
              onSaved={async (savedItem) => {
                const shouldOfferFormSetup =
                  savedItem.registrationMode === "internal" &&
                  (editing === "new" ||
                    editing.registrationMode !== "internal");
                setEditing(null);
                await load();
                setPeriod(savedItem.period);
                setBusy(false);
                if (shouldOfferFormSetup) {
                  setNotice({
                    text: `Program kerja ${savedItem.title} berhasil disimpan. Lanjutkan atur kuota, tautan grup, dan kolom formulir pada tab Atur formulir.`,
                    actionProgram: { id: savedItem.id, title: savedItem.title },
                  });
                } else {
                  setNotice({ text: "Program kerja berhasil disimpan." });
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
                  onConfigureForm={() =>
                    selectSectionTab("form-settings", {
                      programId: item.id,
                      focusPanel: true,
                    })
                  }
                  onViewParticipants={() =>
                    selectSectionTab("registrations", {
                      programId: item.id,
                      focusPanel: true,
                    })
                  }
                  onEdit={() => {
                    setEditing(item);
                    setNotice(null);
                  }}
                  onDelete={() => void remove(item)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        ref={formSettingsPanel}
        role="tabpanel"
        id="programs-panel-form-settings"
        aria-labelledby="programs-tab-form-settings"
        hidden={activeTab !== "form-settings"}
        tabIndex={0}
      >
        {activeTab === "form-settings" && (
          <ProgramFormSettingsManager
            items={items}
            loading={loading}
            error={error}
            selectedProgramId={formProgramId}
            onProgramIdChange={handleFormProgramChange}
            onReload={() => {
              setLoading(true);
              void load();
            }}
            onSaved={async (savedItem) => {
              setItems((prev) =>
                prev.map((entry) =>
                  entry.id === savedItem.id ? savedItem : entry,
                ),
              );
              await load();
            }}
            onBusyChange={setFormSettingsBusy}
            onDirtyChange={setFormSettingsDirty}
            onOpenProgramsTab={() =>
              selectSectionTab("programs", { focusPanel: true })
            }
            onOpenParticipants={(programId) =>
              selectSectionTab("registrations", {
                programId,
                focusPanel: true,
                skipUnsavedConfirm: true,
              })
            }
          />
        )}
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
  onConfigureForm,
  onViewParticipants,
  onEdit,
  onDelete,
}: {
  item: Program;
  count: number | null;
  busy?: boolean;
  onConfigureForm?: () => void;
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
  const cohortQuotaConfig =
    item.registrationMode === "internal"
      ? resolveCohortQuotaConfig(item.registrationFormConfig)
      : null;
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
          {cohortQuotaConfig?.enabled && (
            <span className="admin-status">
              {`Kuota ${cohortQuotaConfig.tiers.length} angkatan`}
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
        {item.registrationMode === "internal" && (
          <button
            type="button"
            className="admin-button"
            disabled={busy}
            aria-label={`Atur formulir ${item.title}`}
            onClick={onConfigureForm}
          >
            Atur formulir
          </button>
        )}
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
  onCancel,
  onSaved,
  onBusy,
}: {
  item: Program | null;
  initialPeriod: string;
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

  const preview = selected?.url || (!removeImage ? item?.imageUrl : null);

  function resetPhoto() {
    setSelected(null);
    setPhotoError("");
    if (fileInput.current) fileInput.current.value = "";
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (photoError || saving || submitting.current) return;
    const form = new FormData(event.currentTarget);
    const data: Record<string, unknown> = {
      sortOrder: Number(form.get("sortOrder")),
      isPublished: form.get("isPublished") === "on",
      status,
      icon: form.get("icon"),
      registrationMode,
      gformLink: registrationMode === "external" ? gformLink : "",
      registrationGroupLink: item?.registrationGroupLink ?? "",
      registrationMaxQuota: item?.registrationMaxQuota ?? "",
      registrationFormConfig: item?.registrationFormConfig
        ? normalizeProgramFormConfig(item.registrationFormConfig)
        : cloneDefaultProgramFormConfig(),
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
          <p className="admin-notice">
            Kuota peserta, tautan grup WA/LINE, tautan halaman publik, dan kolom
            formulir custom diatur terpisah pada tab Atur formulir.
          </p>
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
            Batal
          </button>
        </div>
      </fieldset>
    </form>
  );
}
