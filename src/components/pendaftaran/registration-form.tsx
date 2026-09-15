"use client";

import { useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle,
  LineVertical,
  UploadSimple,
  Warning,
  X,
} from "@phosphor-icons/react/dist/ssr";

import { DIVISI_OPTIONS } from "@/lib/pendaftaran-config";

const angkatanOptions = Array.from({ length: 7 }, (_, i) => String(2019 + i));

const LINE_GROUP = "https://line.me/ti/g/wJYxHe74u6";

type Status = "idle" | "loading" | "success" | "error";

export function RegistrationForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileDragOver, setFileDragOver] = useState(false);
  const [selectedDivisi, setSelectedDivisi] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const MAX_MB = 10;
  const MAX_BYTES = MAX_MB * 1024 * 1024;

  function toggleDivisi(id: string) {
    setSelectedDivisi((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id],
    );
  }

  function handleFileChange(f: File | null) {
    if (!f) return;
    if (f.size > MAX_BYTES) {
      setErrorMsg(`Ukuran berkas melebihi ${MAX_MB} MB.`);
      setFile(null);
      return;
    }
    setFile(f);
    setErrorMsg("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (selectedDivisi.length < 2) {
      setErrorMsg("Pilih minimal 2 divisi.");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    const data = new FormData(e.currentTarget);
    // Hapus divisi default dari form lalu append yang dipilih
    data.delete("divisi");
    selectedDivisi.forEach((d) => data.append("divisi", d));
    if (file) data.set("berkas", file);

    try {
      const res = await fetch("/api/pendaftaran", { method: "POST", body: data });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error ?? "Terjadi kesalahan.");
        setStatus("error");
      } else {
        setStatus("success");
        formRef.current?.reset();
        setFile(null);
        setSelectedDivisi([]);
      }
    } catch {
      setErrorMsg("Gagal terhubung ke server. Coba lagi.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-5 py-10 text-center">
        {/* Icon */}
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-400/15 ring-8 ring-amber-400/10">
          <CheckCircle size={40} weight="fill" className="text-amber-400" />
        </div>

        <div>
          <h3 className="text-xl font-bold text-zinc-900">Pendaftaran Terkirim!</h3>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-500">
            Data kamu sudah kami terima. Selanjutnya, bergabunglah ke grup LINE
            resmi HIMA TI untuk mendapatkan info lebih lanjut.
          </p>
        </div>

        {/* LINE CTA */}
        <a
          href={LINE_GROUP}
          target="_blank"
          rel="noopener noreferrer"
          className="group mt-2 flex items-center gap-3 rounded-2xl border border-[#06C755]/30 bg-[#06C755]/10 px-6 py-4 transition hover:bg-[#06C755]/20"
        >
          {/* LINE logo */}
          <svg
            viewBox="0 0 48 48"
            className="h-9 w-9 shrink-0"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="24" cy="24" r="24" fill="#06C755" />
            <path
              d="M40 22.6c0-7.3-7.3-13.2-16.3-13.2S7.5 15.3 7.5 22.6c0 6.5 5.8 12 13.6 13l1.9.4-.4 1.6c-.1.5-.4 2.2-.4 2.2s-.1.4.4.5c.5.1 2.6-1.5 2.6-1.5l3-2.1h.1c8.8-.5 11.7-6.2 11.7-14.1z"
              fill="white"
            />
            <path
              d="M20.1 25.8h-3.8v-6.5h1.5v5.1h2.3v1.4zm1.4 0h-1.5v-6.5H21.5zm6.4 0h-1.5l-2.9-4.3v4.3h-1.5v-6.5h1.5l2.9 4.3v-4.3h1.5zm4.3-5.1h-2.3v1.3h2.1v1.3h-2.1v1.2h2.3v1.3h-3.8v-6.4h3.8z"
              fill="#06C755"
            />
          </svg>
          <div className="text-left">
            <p className="text-sm font-bold text-zinc-900">Gabung Grup LINE HIMA TI</p>
            <p className="text-xs text-zinc-500">Klik untuk bergabung ke grup resmi</p>
          </div>
          <ArrowRight size={16} weight="bold" className="ml-auto text-zinc-400 transition group-hover:translate-x-1" />
        </a>

        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-2 text-sm text-zinc-400 underline-offset-4 hover:text-zinc-600 hover:underline"
        >
          Daftar lagi dengan data lain
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Row: Nama + NIM */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500" htmlFor="nama">
            Nama Lengkap <span className="text-amber-500">*</span>
          </label>
          <input
            id="nama"
            name="nama"
            type="text"
            required
            placeholder="Masukkan nama lengkap"
            className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500" htmlFor="nim">
            NIM <span className="text-amber-500">*</span>
          </label>
          <input
            id="nim"
            name="nim"
            type="text"
            required
            placeholder="Contoh: 2301010001"
            className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20"
          />
        </div>
      </div>

      {/* Angkatan */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold uppercase tracking-wider text-zinc-500" htmlFor="angkatan">
          Angkatan <span className="text-amber-500">*</span>
        </label>
        <select
          id="angkatan"
          name="angkatan"
          required
          defaultValue=""
          className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20"
        >
          <option value="" disabled>Pilih angkatan</option>
          {angkatanOptions.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Divisi — checkbox min 2 */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Pilihan Divisi <span className="text-amber-500">*</span>
          </label>
          <span className={`text-xs font-semibold tabular-nums ${selectedDivisi.length >= 2 ? "text-green-500" : "text-zinc-400"}`}>
            {selectedDivisi.length}/5 dipilih
            {selectedDivisi.length < 2 && " (min. 2)"}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {DIVISI_OPTIONS.map((d) => {
            const checked = selectedDivisi.includes(d.id);
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => toggleDivisi(d.id)}
                className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                  checked
                    ? "border-amber-400 bg-amber-50 shadow-sm shadow-amber-100"
                    : "border-zinc-200 bg-zinc-50 hover:border-zinc-300 hover:bg-white"
                }`}
              >
                {/* Checkbox visual */}
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                    checked
                      ? "border-amber-500 bg-amber-400"
                      : "border-zinc-300 bg-white"
                  }`}
                >
                  {checked && (
                    <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="#1c1c1c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span>
                  <span className={`block text-sm font-semibold ${checked ? "text-zinc-900" : "text-zinc-700"}`}>
                    {d.label}
                  </span>
                  <span className="block text-xs text-zinc-400">{d.desc}</span>
                </span>
              </button>
            );
          })}
        </div>

        {selectedDivisi.length < 2 && selectedDivisi.length > 0 && (
          <p className="text-xs text-amber-600">Pilih minimal 2 divisi untuk melanjutkan.</p>
        )}
      </div>

      {/* Upload Berkas */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
          Upload Berkas <span className="text-amber-500">*</span>
          <span className="ml-2 normal-case font-normal text-zinc-400">(Format PDF — maks. 10 MB)</span>
        </label>

        <div
          onDragOver={(e) => { e.preventDefault(); setFileDragOver(true); }}
          onDragLeave={() => setFileDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setFileDragOver(false);
            handleFileChange(e.dataTransfer.files[0] ?? null);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`relative flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-all ${
            fileDragOver
              ? "border-amber-400 bg-amber-50"
              : file
                ? "border-amber-400 bg-amber-50/60"
                : "border-zinc-200 bg-zinc-50 hover:border-amber-300 hover:bg-white"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            name="berkas"
            accept=".pdf"
            className="sr-only"
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          />

          {file ? (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/20">
                <UploadSimple size={22} weight="bold" className="text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900">{file.name}</p>
                <p className="text-xs text-zinc-400">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="absolute right-3 top-3 rounded-full bg-white p-1.5 text-zinc-400 shadow-sm transition hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X size={12} weight="bold" />
              </button>
            </>
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100">
                <UploadSimple size={22} weight="bold" className="text-zinc-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-600">
                  <span className="font-semibold text-zinc-800">Klik untuk pilih</span> atau drag &amp; drop
                </p>
                <p className="text-xs text-zinc-400">Format PDF — maks. 10 MB</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Error */}
      {(status === "error" || errorMsg) && (
        <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <Warning size={16} weight="bold" className="shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={status === "loading"}
        className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-950 px-8 py-4 text-sm font-bold text-white transition-all hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "loading" ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Mengirim...
          </>
        ) : (
          <>
            Kirim Pendaftaran
            <ArrowRight size={16} weight="bold" />
          </>
        )}
      </button>

      <p className="text-center text-xs text-zinc-400">
        Setelah mendaftar, kamu akan diarahkan untuk bergabung ke grup LINE resmi HIMA TI.
      </p>
    </form>
  );
}
