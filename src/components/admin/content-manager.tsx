"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  MEMBER_GROUPS,
  type GalleryPhoto,
  type Member,
  type MemberGroup,
} from "@/domain/admin";
import { requestJson } from "./request";
import { EditorDialog } from "./editor-dialog";

type Item = Member | GalleryPhoto;
type Kind = "members" | "gallery" | "hero";

export function ContentManager({ kind }: { kind: Kind }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Item | "new" | null>(null);
  const endpoint = `/api/admin/content/${kind}`;
  const members = kind === "members";
  const title = members
    ? "Fungsionaris"
    : kind === "hero"
      ? "Hero beranda"
      : "Galeri kegiatan";

  const load = useCallback(
    (signal?: AbortSignal) =>
      requestJson<{ items: Item[] }>(endpoint, { signal })
        .then(({ items }) => setItems(items))
        .catch((error: unknown) => {
          if (!signal?.aborted)
            setError(
              error instanceof Error
                ? error.message
                : "Data tidak dapat dimuat.",
            );
        })
        .finally(() => {
          if (!signal?.aborted) setLoading(false);
        }),
    [endpoint],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function remove(item: Item) {
    const name = "name" in item ? item.name : item.title;
    if (
      !window.confirm(
        `Hapus ${name}? Data dan foto yang dikelola di storage akan dihapus.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await requestJson(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      setItems((current) => current.filter((row) => row.id !== item.id));
      if (editing !== "new" && editing?.id === item.id) setEditing(null);
      setNotice(`${name} berhasil dihapus.`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Data gagal dihapus.");
    } finally {
      setBusy(false);
    }
  }

  const filtered = items.filter((item) =>
    `${"name" in item ? `${item.name} ${item.role} ${MEMBER_GROUPS[item.group]}` : `${item.title} ${item.alt}`}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <>
      <header className="admin-page-header">
        <div>
          <h1>{title}</h1>
          <p>
            {members
              ? "Perbarui nama, jabatan, foto, dan urutan susunan pengurus."
              : kind === "hero"
                ? "Kelola foto slideshow di bagian atas beranda. Foto hero tidak otomatis masuk galeri."
                : "Kelola foto yang ditampilkan pada beranda dan halaman galeri."}
          </p>
        </div>
        <button
          className="admin-button primary"
          onClick={() => {
            setEditing("new");
            setNotice("");
          }}
          disabled={busy}
        >
          {members ? "Tambah fungsionaris" : "Tambah foto"}
        </button>
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
      {editing && (
        <EditorDialog
          busy={busy}
          onClose={() => setEditing(null)}
          title={
            editing === "new"
              ? `Tambah ${members ? "fungsionaris" : kind === "hero" ? "foto hero" : "foto galeri"}`
              : `Edit ${members ? "fungsionaris" : kind === "hero" ? "foto hero" : "foto galeri"}`
          }
        >
          <ContentEditor
            key={editing === "new" ? "new" : editing.id}
            kind={kind}
            item={editing === "new" ? null : editing}
            onBusyChange={setBusy}
            onCancel={() => setEditing(null)}
            onSaved={(item) => {
              setBusy(false);
              setItems((current) =>
                [...current.filter((row) => row.id !== item.id), item].sort(
                  (a, b) => a.sortOrder - b.sortOrder,
                ),
              );
              setEditing(null);
              setNotice(
                "Perubahan berhasil disimpan. Konten yang dipublikasikan tersedia di website.",
              );
            }}
          />
        </EditorDialog>
      )}
      <div className="admin-toolbar">
        <label>
          Cari {members ? "nama atau jabatan" : "foto"}
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            type="search"
            placeholder={
              members ? "Cari fungsionaris..." : "Cari judul atau deskripsi..."
            }
          />
        </label>
        <p>
          {items.length} {members ? "fungsionaris" : "foto"}
        </p>
      </div>
      {loading ? (
        <p className="admin-notice" role="status">
          Memuat {title.toLowerCase()}...
        </p>
      ) : error && items.length === 0 ? null : filtered.length === 0 ? (
        <div className="admin-empty">
          <h2>
            {search
              ? "Pencarian belum menemukan hasil"
              : `Belum ada ${members ? "fungsionaris" : "foto"}`}
          </h2>
          <p>
            {search
              ? "Coba nama atau kata kunci lain."
              : "Gunakan tombol tambah untuk memasukkan konten pertama."}
          </p>
        </div>
      ) : (
        <div className="admin-list">
          {filtered.map((item) => {
            const url =
              "photo" in item
                ? item.photo
                : "imageUrl" in item
                  ? item.imageUrl
                  : undefined;
            const name = "name" in item ? item.name : item.title;
            return (
              <article className="admin-content-row" key={item.id}>
                <div className="admin-thumb">
                  {url ? (
                    <Image
                      src={url}
                      alt={"alt" in item ? item.alt : name}
                      fill
                      sizes="76px"
                    />
                  ) : (
                    <span
                      className="admin-initial"
                      aria-label="Foto belum diunggah"
                    >
                      {name.slice(0, 1)}
                    </span>
                  )}
                </div>
                <div>
                  <h2>{name}</h2>
                  <p className="admin-meta">
                    {"role" in item
                      ? `${item.role} · ${MEMBER_GROUPS[item.group]}`
                      : item.alt}
                  </p>
                  <p className="admin-meta">
                    Urutan {item.sortOrder} ·{" "}
                    <span
                      className={`admin-status ${item.isPublished ? "published" : ""}`}
                    >
                      {item.isPublished ? "Tampil di website" : "Disembunyikan"}
                    </span>
                  </p>
                </div>
                <div className="admin-actions">
                  <button
                    className="admin-button"
                    disabled={busy}
                    aria-label={`Edit ${name}`}
                    onClick={() => {
                      setNotice("");
                      setEditing(item);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="admin-button danger"
                    disabled={busy}
                    aria-label={`Hapus ${name}`}
                    onClick={() => void remove(item)}
                  >
                    Hapus
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

function ContentEditor({
  kind,
  item,
  onCancel,
  onSaved,
  onBusyChange,
}: {
  kind: Kind;
  item: Item | null;
  onCancel: () => void;
  onSaved: (item: Item) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [removePhoto, setRemovePhoto] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const members = kind === "members";
  const member = item && "name" in item ? item : null;
  const photo = item && "title" in item ? item : null;
  const previewUrl =
    selectedPhoto?.url ||
    (!removePhoto ? member?.photo || photo?.imageUrl : undefined);

  useEffect(() => {
    return () => {
      if (selectedPhoto) URL.revokeObjectURL(selectedPhoto.url);
    };
  }, [selectedPhoto]);

  function resetSelection() {
    if (fileInput.current) fileInput.current.value = "";
    setSelectedPhoto(null);
    setPhotoError("");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (photoError) return;
    const form = new FormData(event.currentTarget);
    const file = form.get("file");
    if (file instanceof File && file.size > 3 * 1024 * 1024) {
      setError("Foto maksimal 3 MB.");
      return;
    }
    const common = {
      sortOrder: Number(form.get("sortOrder")),
      isPublished: form.get("isPublished") === "on",
    };
    const data = members
      ? {
          ...common,
          name: form.get("name"),
          role: form.get("role"),
          group: form.get("group") as MemberGroup,
        }
      : { ...common, title: form.get("title"), alt: form.get("alt") };
    const body = new FormData();
    body.set("data", JSON.stringify(data));
    if (item) body.set("id", item.id);
    if (file instanceof File && file.size) body.set("file", file);
    if (form.get("removePhoto") === "on") body.set("removePhoto", "true");
    setSaving(true);
    onBusyChange(true);
    setError("");
    try {
      const result = await requestJson<{ item: Item }>(
        `/api/admin/content/${kind}`,
        { method: item ? "PATCH" : "POST", body },
      );
      onSaved(result.item);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Perubahan gagal disimpan.",
      );
    } finally {
      setSaving(false);
      onBusyChange(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={submit}>
      <fieldset disabled={saving}>
        {members ? (
          <>
            <div className="admin-form-columns">
              <label>
                Nama lengkap
                <input
                  name="name"
                  required
                  maxLength={150}
                  defaultValue={member?.name}
                />
              </label>
              <label>
                Jabatan
                <input
                  name="role"
                  required
                  maxLength={150}
                  defaultValue={member?.role}
                  placeholder="Contoh: Koordinator Divisi HH"
                />
              </label>
            </div>
            <label>
              Kelompok
              <select name="group" defaultValue={member?.group || "pimpinan"}>
                {Object.entries(MEMBER_GROUPS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <>
            <label>
              Judul foto
              <input
                name="title"
                required
                maxLength={150}
                defaultValue={photo?.title}
              />
            </label>
            <label>
              Deskripsi foto
              <textarea
                name="alt"
                required
                maxLength={300}
                rows={3}
                defaultValue={photo?.alt}
              />
              <small>
                Jelaskan kegiatan dalam foto agar pembaca layar dapat
                mengenalinya.
              </small>
            </label>
          </>
        )}
        <div className="admin-form-columns">
          <label>
            {members ? "Foto fungsionaris" : "Foto kegiatan"}
            <input
              ref={fileInput}
              name="file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required={!members && !item}
              aria-invalid={Boolean(photoError)}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                setPhotoError("");
                if (!file) {
                  setSelectedPhoto(null);
                  return;
                }
                if (
                  !["image/jpeg", "image/png", "image/webp"].includes(
                    file.type,
                  ) ||
                  file.size > 3 * 1024 * 1024 ||
                  !file.size
                ) {
                  event.currentTarget.value = "";
                  setSelectedPhoto(null);
                  setPhotoError(
                    "Pilih JPG, PNG, atau WebP yang tidak kosong, maksimal 3 MB.",
                  );
                  return;
                }
                setRemovePhoto(false);
                setSelectedPhoto({
                  url: URL.createObjectURL(file),
                  name: file.name,
                });
              }}
            />
            <small>
              JPG, PNG, atau WebP, maksimal 3 MB.{" "}
              {item ? "Kosongkan untuk mempertahankan foto saat ini." : ""}
            </small>
          </label>
          <label>
            Urutan tampil
            <input
              name="sortOrder"
              type="number"
              min={0}
              max={10000}
              step={1}
              required
              defaultValue={item?.sortOrder ?? 0}
            />
            <small>Angka lebih kecil tampil lebih dahulu.</small>
          </label>
        </div>
        <figure
          className={`admin-photo-preview ${members ? "portrait" : "landscape"}`}
          aria-label="Pratinjau foto"
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={previewUrl}
              src={previewUrl}
              alt={
                selectedPhoto
                  ? "Pratinjau foto yang dipilih"
                  : "Pratinjau foto saat ini"
              }
              onError={() =>
                setPhotoError(
                  "Foto tidak dapat ditampilkan. Pilih gambar lain atau batalkan pilihan foto.",
                )
              }
            />
          ) : (
            <p>
              {removePhoto
                ? "Foto akan dihapus setelah disimpan."
                : "Belum ada foto untuk ditampilkan."}
            </p>
          )}
          <figcaption>
            {selectedPhoto
              ? `${selectedPhoto.name} (belum disimpan)`
              : previewUrl
                ? "Foto saat ini. Pilih file baru untuk menggantinya."
                : "Pilih file untuk melihat pratinjau sebelum menyimpan."}
          </figcaption>
        </figure>
        {photoError && (
          <p className="admin-error" role="alert">
            {photoError}
          </p>
        )}
        {(selectedPhoto || photoError) && (
          <button
            className="admin-button"
            type="button"
            onClick={resetSelection}
          >
            Batal pilih foto
          </button>
        )}
        {member?.photoPath && (
          <label className="admin-check">
            <input
              type="checkbox"
              name="removePhoto"
              checked={removePhoto}
              onChange={(event) => {
                resetSelection();
                setRemovePhoto(event.currentTarget.checked);
              }}
            />
            Hapus foto saat ini dan gunakan avatar bawaan
          </label>
        )}
        <label className="admin-check">
          <input
            type="checkbox"
            name="isPublished"
            defaultChecked={item?.isPublished ?? true}
          />
          Tampilkan di website publik
        </label>
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
            {saving ? "Menyimpan..." : "Simpan perubahan"}
          </button>
          <button className="admin-button" type="button" onClick={onCancel}>
            Batal
          </button>
        </div>
      </fieldset>
    </form>
  );
}
