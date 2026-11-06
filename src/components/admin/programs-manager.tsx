"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  PROGRAM_ICONS,
  PROGRAM_STATUSES,
  type Program,
  type ProgramPeriod,
} from "@/domain/programs";
import { requestJson } from "./request";
import { EditorDialog } from "./editor-dialog";

export function ProgramsManager() {
  const [items, setItems] = useState<Program[]>([]);
  const [periods, setPeriods] = useState<ProgramPeriod[]>([]);
  const [addingPeriod, setAddingPeriod] = useState(false);
  const [periodError, setPeriodError] = useState("");
  const periodButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [search, setSearch] = useState(""),
    [period, setPeriod] = useState("");
  const [editing, setEditing] = useState<Program | "new" | null>(null);
  const load = useCallback(
    (signal?: AbortSignal) =>
      requestJson<{ items: Program[]; periods: ProgramPeriod[] }>(
        "/api/admin/programs",
        { signal },
      )
        .then((result) => {
          if (!signal?.aborted) {
            setItems(result.items);
            setPeriods(result.periods);
            setError("");
          }
        })
        .catch((error: unknown) => {
          if (!signal?.aborted)
            setError(
              error instanceof Error
                ? error.message
                : "Program kerja tidak dapat dimuat.",
            );
        })
        .finally(() => {
          if (!signal?.aborted) setLoading(false);
        }),
    [],
  );
  const currentPeriod =
    periods.find((item) => item.period === period) || periods[0];
  const periodItems = items.filter(
    (item) => item.period === currentPeriod?.period,
  );
  async function createPeriod(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
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
    } catch (error) {
      setPeriodError(
        error instanceof Error ? error.message : "Periode gagal ditambahkan.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function togglePeriod() {
    if (!currentPeriod || busy) return;
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
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Status periode gagal disimpan.",
      );
    } finally {
      setBusy(false);
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
      !window.confirm(
        `Hapus program ${item.title} periode ${item.period}? Data dan foto program akan dihapus permanen.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await requestJson("/api/admin/programs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      if (editing !== "new" && editing?.id === item.id) setEditing(null);
      setNotice("Program kerja berhasil dihapus.");
      await load();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Program gagal dihapus.",
      );
    } finally {
      setBusy(false);
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
      <header className="admin-page-header">
        <div>
          <h1>Program kerja</h1>
          <p>
            Kelola program, jadwal, pendaftaran dan foto yang tampil di website.
          </p>
        </div>
        <div className="admin-actions">
          <button
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
              setEditing("new");
              setNotice("");
            }}
          >
            Tambah program
          </button>
        </div>
      </header>
      {notice && (
        <p className="admin-success" role="status">
          {notice}
        </p>
      )}
      {error && (
        <div className="admin-error" role="alert">
          <p>{error}</p>
          <button
            className="admin-button"
            disabled={busy}
            onClick={() => {
              setLoading(true);
              void load();
            }}
          >
            Muat ulang
          </button>
        </div>
      )}
      {editing && (
        <EditorDialog
          busy={busy}
          onClose={() => setEditing(null)}
          title={
            editing === "new" ? "Tambah program kerja" : "Edit program kerja"
          }
        >
          <ProgramEditor
            key={editing === "new" ? "new" : editing.id}
            item={editing === "new" ? null : editing}
            initialPeriod={currentPeriod?.period || ""}
            onBusy={setBusy}
            onCancel={() => setEditing(null)}
            onSaved={async (item) => {
              await load();
              setPeriod(item.period);
              setBusy(false);
              setEditing(null);
              setNotice("Program kerja berhasil disimpan.");
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
                  {busy ? "Menyimpan..." : "Simpan periode"}
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
                Periode muncul jika ada program yang dipublikasikan. Status tiap
                program tetap tersimpan saat periode disembunyikan.
              </p>
            </div>
            <button
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
            Memuat program kerja...
          </p>
        ) : error && items.length === 0 ? null : !filtered.length ? (
          <div className="admin-empty">
            <h2>
              {search ? "Program tidak ditemukan" : "Belum ada program kerja"}
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
              <article className="admin-content-row" key={item.id}>
                <div className="admin-thumb">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      sizes="76px"
                    />
                  ) : (
                    <span className="admin-meta">Tanpa foto</span>
                  )}
                </div>
                <div>
                  <h2>{item.title}</h2>
                  <p className="admin-meta">
                    {item.period} · {PROGRAM_STATUSES[item.status]}
                  </p>
                  <p className="admin-meta">
                    Urutan {item.sortOrder} ·{" "}
                    {item.isPublished
                      ? "Program dipublikasikan"
                      : "Program disembunyikan"}
                  </p>
                </div>
                <div className="admin-actions">
                  <button
                    className="admin-button"
                    disabled={busy}
                    aria-label={`Edit ${item.title}`}
                    onClick={() => {
                      setEditing(item);
                      setNotice("");
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="admin-button danger"
                    disabled={busy}
                    aria-label={`Hapus ${item.title}`}
                    onClick={() => void remove(item)}
                  >
                    Hapus
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
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
  { key: "gformLink", label: "Tautan pendaftaran", max: 2000, url: true },
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

function ProgramEditor({
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
  const [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const [selected, setSelected] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const [photoError, setPhotoError] = useState(""),
    [removeImage, setRemoveImage] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
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
    if (photoError || saving) return;
    const form = new FormData(event.currentTarget);
    const data: Record<string, unknown> = {
      sortOrder: Number(form.get("sortOrder")),
      isPublished: form.get("isPublished") === "on",
      status: form.get("status"),
      icon: form.get("icon"),
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
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Program gagal disimpan.",
      );
    } finally {
      setSaving(false);
      onBusy(false);
    }
  }
  return (
    <form className="admin-form" onSubmit={submit}>
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
                  type={"url" in field ? "url" : "text"}
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
              {field.key === "gformLink" && (
                <small>Wajib diisi jika status pendaftaran dibuka.</small>
              )}
            </label>
          );
        })}
        <div className="admin-form-columns">
          <label>
            Status pendaftaran
            <select name="status" defaultValue={item?.status || "upcoming"}>
              {Object.entries(PROGRAM_STATUSES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
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
              defaultValue={item?.sortOrder || 0}
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
            {saving ? "Menyimpan..." : "Simpan program"}
          </button>
          <button className="admin-button" type="button" onClick={onCancel}>
            Batal
          </button>
        </div>
      </fieldset>
    </form>
  );
}
