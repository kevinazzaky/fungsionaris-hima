"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  Briefcase,
  Camera,
  CheckCircle,
  Eye,
  IdentificationCard,
  Printer,
  UploadSimple,
  Warning,
  X,
} from "@phosphor-icons/react/dist/ssr";
import { DIVISI_OPTIONS } from "@/lib/pendaftaran-config";
import { motion, AnimatePresence } from "motion/react";
import {
  RegistrationPrintDocument,
  type RegistrationDocumentData,
} from "@/components/pendaftaran/registration-print-document";

const angkatanOptions = Array.from({ length: 7 }, (_, i) => String(2020 + i));

const LINE_GROUP = "https://line.me/ti/g/wJYxHe74u6";

type Status = "idle" | "loading" | "success" | "error";

export function RegistrationForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileDragOver, setFileDragOver] = useState(false);
  const [selectedDivisi, setSelectedDivisi] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [submittedData, setSubmittedData] = useState<RegistrationDocumentData | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreviewUrl, setFotoPreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const MAX_MB = 10;
  const MAX_BYTES = MAX_MB * 1024 * 1024;
  const MAX_FOTO_MB = 5;

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

  function handleFotoChange(f: File | null) {
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      setErrorMsg("Format pas foto harus berformat JPG, PNG, atau WEBP.");
      return;
    }
    if (f.size > MAX_FOTO_MB * 1024 * 1024) {
      setErrorMsg(`Ukuran pas foto melebihi ${MAX_FOTO_MB} MB.`);
      return;
    }
    setErrorMsg("");
    setFotoFile(f);

    const reader = new FileReader();
    reader.onload = (e) => {
      setFotoPreviewUrl((e.target?.result as string) || null);
    };
    reader.readAsDataURL(f);
  }

  function handlePrint() {
    const originalTitle = document.title;
    if (submittedData?.nama) {
      document.title = `Formulir Pendaftaran HIMA TI - ${submittedData.nama}`;
    }
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (selectedDivisi.length < 1) {
      setErrorMsg("Pilih minimal 1 divisi yang diminati.");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    const formElement = e.currentTarget;
    const data = new FormData(formElement);

    // Hapus divisi default dari form lalu append yang dipilih
    data.delete("divisi");
    selectedDivisi.forEach((d) => data.append("divisi", d));
    if (file) data.set("berkas", file);

    // Ambil data untuk cetak dokumen
    const nama = (data.get("nama") as string)?.trim() || "";
    const nim = (data.get("nim") as string)?.trim() || "";
    const tempatTanggalLahir = (data.get("tempatTanggalLahir") as string)?.trim() || "";
    const jenisKelamin = (data.get("jenisKelamin") as string) || "";
    const alamat = (data.get("alamat") as string)?.trim() || "";
    const noHp = (data.get("noHp") as string)?.trim() || "";
    const idLine = (data.get("idLine") as string)?.trim() || "";
    const pengalaman1 = (data.get("pengalaman1") as string)?.trim() || "-";
    const pengalaman2 = (data.get("pengalaman2") as string)?.trim() || "-";
    const pengalaman3 = (data.get("pengalaman3") as string)?.trim() || "-";
    const minatSkill = (data.get("minatSkill") as string)?.trim() || "";
    const alasanBergabung = (data.get("alasanBergabung") as string)?.trim() || "";
    const alasanDivisi = (data.get("alasanDivisi") as string)?.trim() || "";

    const divisiLabels = selectedDivisi
      .map((id) => DIVISI_OPTIONS.find((opt) => opt.id === id)?.label || id)
      .join(", ");

    // Format gabungan pengalaman untuk API
    const pengalamanCombined = [pengalaman1, pengalaman2, pengalaman3]
      .filter((p) => p && p !== "-")
      .join("; ") || "-";
    data.set("pengalamanOrganisasi", pengalamanCombined);

    try {
      const res = await fetch("/api/pendaftaran", { method: "POST", body: data });
      const json = await res.json();

      if (!res.ok) {
        setErrorMsg(json.error ?? "Terjadi kesalahan saat memproses pendaftaran.");
        setStatus("error");
      } else {
        const docData: RegistrationDocumentData = {
          nama,
          nim,
          tempatTanggalLahir,
          jenisKelamin,
          alamat,
          noHp,
          idLine,
          pengalaman1,
          pengalaman2,
          pengalaman3,
          minatSkill,
          alasanBergabung,
          divisi: divisiLabels,
          alasanDivisi,
          fotoUrl: fotoPreviewUrl || undefined,
          tanggalDaftar: new Date().toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
        };

        setSubmittedData(docData);
        setStatus("success");
        formRef.current?.reset();
        setFile(null);
        setFotoFile(null);
        if (fotoInputRef.current) fotoInputRef.current.value = "";
        setSelectedDivisi([]);
      }
    } catch {
      setErrorMsg("Gagal terhubung ke server. Silakan coba beberapa saat lagi.");
      setStatus("error");
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LAYAR SUKSES & CETAK BERKAS
  // ═══════════════════════════════════════════════════════════════════════════
  if (status === "success" && submittedData) {
    return (
      <div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="flex flex-col items-center gap-6 py-6 text-center no-print"
        >
          {/* Animated Icon with Glowing Halo */}
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 ring-8 ring-emerald-500/10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }}
            >
              <CheckCircle size={44} weight="fill" className="text-emerald-500" />
            </motion.div>
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
              Registrasi Berhasil
            </span>
            <h3 className="mt-3 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
              Pendaftaran Berhasil Dikirim!
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-600">
              Data pendaftaran kamu sudah resmi tersimpan di sistem. Silakan cetak atau unduh berkas
              formulir pendaftaran di bawah ini untuk dibawa saat wawancara.
            </p>
          </div>

          {/* Ringkasan Calon Pendaftar */}
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-zinc-50/80 p-5 text-left text-xs sm:text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-zinc-500">Nama Lengkap:</span>
                <p className="font-bold text-zinc-900">{submittedData.nama}</p>
              </div>
              <div>
                <span className="text-zinc-500">NIM:</span>
                <p className="font-bold text-zinc-900">{submittedData.nim}</p>
              </div>
              <div className="col-span-2">
                <span className="text-zinc-500">Divisi yang Diminati:</span>
                <p className="font-bold text-zinc-900">{submittedData.divisi}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons: Cetak & Pratinjau */}
          <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-3 text-sm font-bold text-zinc-950 shadow-md transition-all hover:bg-amber-300 hover:shadow-lg active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <Printer size={18} weight="bold" />
              Cetak / Unduh PDF (A4)
            </button>

            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <Eye size={18} weight="bold" />
              {showPreview ? "Tutup Pratinjau" : "Pratinjau Berkas"}
            </button>
          </div>

          {/* LINE Group Card */}
          <a
            href={LINE_GROUP}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex w-full max-w-md items-center gap-3.5 rounded-2xl border border-[#06C755]/30 bg-[#06C755]/10 p-4 transition-all hover:bg-[#06C755]/20 active:scale-[0.98]"
          >
            <svg
              viewBox="0 0 48 48"
              className="h-9 w-9 shrink-0 transition-transform group-hover:scale-105"
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
              <p className="text-xs text-zinc-500">Klik untuk masuk grup koordinasi seleksi</p>
            </div>
            <ArrowRight size={16} weight="bold" className="ml-auto text-zinc-400 group-hover:translate-x-1" />
          </a>

          <button
            type="button"
            onClick={() => {
              setStatus("idle");
              setSubmittedData(null);
              setShowPreview(false);
              setFotoFile(null);
              setFotoPreviewUrl(null);
            }}
            className="text-xs font-semibold text-zinc-500 underline-offset-4 hover:text-zinc-900 hover:underline"
          >
            Daftar lagi dengan data lain
          </button>
        </motion.div>

        {/* ── Komponen Dokumen Cetak (Selalu Aktif Saat Print, Opsional di Layar) ── */}
        <AnimatePresence>
          {showPreview && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mt-6 border-t border-zinc-200 pt-6 no-print"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-zinc-900">Pratinjau Dokumen Cetak (2 Halaman A4)</h4>
                  <p className="text-xs text-zinc-500">
                    Dokumen ini akan tercetak otomatis saat menekan tombol cetak.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-zinc-800"
                >
                  <Printer size={15} weight="bold" />
                  Cetak Sekarang
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-zinc-300 bg-zinc-100 p-4 sm:p-6 shadow-inner">
                <div className="mx-auto max-w-[800px] shadow-2xl">
                  <RegistrationPrintDocument data={submittedData} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Print document portaled to body (outside <main> which is hidden during print) */}
        {typeof document !== "undefined" && submittedData && createPortal(
          <div className="hidden print:block">
            <RegistrationPrintDocument data={submittedData} />
          </div>,
          document.body,
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FORMULIR PENDAFTARAN LENGKAP
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-8 no-print">
      {/* ── SEKSI 1: Data Diri & Kontak ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-zinc-200 pb-2">
          <IdentificationCard size={20} weight="bold" className="text-amber-500" />
          <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-zinc-900">
            1. Data Diri &amp; Kontak Pribadi
          </h3>
        </div>

        {/* Pas Foto 3x4 (Opsional) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 transition-colors hover:border-amber-400/60 hover:bg-white">
          <div className="relative flex h-28 w-[84px] shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-100 shadow-sm">
            {fotoPreviewUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={fotoPreviewUrl}
                  alt="Pratinjau Pas Foto"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setFotoFile(null);
                    setFotoPreviewUrl(null);
                    if (fotoInputRef.current) fotoInputRef.current.value = "";
                  }}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black transition-colors"
                  title="Hapus foto"
                >
                  <X size={12} weight="bold" />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-1 text-zinc-400">
                <Camera size={24} weight="bold" />
                <span className="text-[10px] font-bold">3 x 4</span>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                Pas Foto 3x4
              </span>
              <span className="rounded-full bg-zinc-200/80 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                Opsional
              </span>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Unggah pas foto formal (format JPG, PNG, atau WEBP, maks. 5 MB). Foto akan langsung terpasang otomatis pada lembar formulir pendaftaran saat dicetak.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <input
                ref={fotoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleFotoChange(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => fotoInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 hover:border-amber-400 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <UploadSimple size={14} weight="bold" />
                {fotoFile ? "Ganti Foto" : "Pilih File Foto"}
              </button>
              {fotoFile && (
                <span className="text-xs text-zinc-600 truncate max-w-[200px]">
                  {fotoFile.name} ({(fotoFile.size / 1024).toFixed(0)} KB)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Nama + NIM */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-600" htmlFor="nama">
              Nama Lengkap <span className="text-amber-500">*</span>
            </label>
            <input
              id="nama"
              name="nama"
              type="text"
              required
              placeholder="Masukkan nama lengkap"
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-600" htmlFor="nim">
              NIM <span className="text-amber-500">*</span>
            </label>
            <input
              id="nim"
              name="nim"
              type="text"
              required
              placeholder="Contoh: 2301010001"
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20"
            />
          </div>
        </div>

        {/* Angkatan, Tempat Tgl Lahir, Jenis Kelamin */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-600" htmlFor="angkatan">
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

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-600" htmlFor="tempatTanggalLahir">
              Tempat, Tanggal Lahir <span className="text-amber-500">*</span>
            </label>
            <input
              id="tempatTanggalLahir"
              name="tempatTanggalLahir"
              type="text"
              required
              placeholder="Contoh: Denpasar, 15 Mei 2005"
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-600" htmlFor="jenisKelamin">
              Jenis Kelamin <span className="text-amber-500">*</span>
            </label>
            <select
              id="jenisKelamin"
              name="jenisKelamin"
              required
              defaultValue=""
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20"
            >
              <option value="" disabled>Pilih jenis kelamin</option>
              <option value="Laki-laki">Laki-laki (L)</option>
              <option value="Perempuan">Perempuan (P)</option>
            </select>
          </div>
        </div>

        {/* Alamat Lengkap */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-600" htmlFor="alamat">
            Alamat Tinggal Lengkap <span className="text-amber-500">*</span>
          </label>
          <input
            id="alamat"
            name="alamat"
            type="text"
            required
            placeholder="Masukkan alamat tinggal saat ini"
            className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20"
          />
        </div>

        {/* No HP & ID Line */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-600" htmlFor="noHp">
              No. WhatsApp / HP <span className="text-amber-500">*</span>
            </label>
            <input
              id="noHp"
              name="noHp"
              type="tel"
              required
              placeholder="Contoh: 081234567890"
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-600" htmlFor="idLine">
              ID Line <span className="text-amber-500">*</span>
            </label>
            <input
              id="idLine"
              name="idLine"
              type="text"
              required
              placeholder="Masukkan ID Line aktif"
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20"
            />
          </div>
        </div>
      </div>

      {/* ── SEKSI 2: Pengalaman & Keahlian ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-zinc-200 pb-2">
          <Briefcase size={20} weight="bold" className="text-amber-500" />
          <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-zinc-900">
            2. Pengalaman &amp; Keahlian
          </h3>
        </div>

        {/* Pengalaman Berorganisasi */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-600">
            Pengalaman Berorganisasi
            <span className="ml-2 font-normal normal-case text-zinc-400">
              (Opsional, tuliskan jika ada)
            </span>
          </label>
          <div className="space-y-2">
            <input
              name="pengalaman1"
              type="text"
              placeholder="1. Contoh: Ketua OSIS SMA / Anggota Sie Publikasi (isi - jika tidak ada)"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20"
            />
            <input
              name="pengalaman2"
              type="text"
              placeholder="2. Contoh: Panitia Lomba Coding / Kegiatan Relawan (opsional)"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20"
            />
            <input
              name="pengalaman3"
              type="text"
              placeholder="3. Pengalaman lainnya (opsional)"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20"
            />
          </div>
        </div>

        {/* Minat dan Skill */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-600" htmlFor="minatSkill">
            Minat dan Skill <span className="text-amber-500">*</span>
          </label>
          <textarea
            id="minatSkill"
            name="minatSkill"
            required
            rows={2}
            placeholder="Jelaskan bidang minat atau skill kamu (contoh: Desain Grafis/Figma, Web Coding, Editing Video, Public Speaking, Penulisan Artikel, dll)"
            className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20"
          />
        </div>
      </div>

      {/* ── SEKSI 3: Pilihan Divisi & Motivasi ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-zinc-200 pb-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-xs font-black text-zinc-950">
            3
          </span>
          <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-zinc-900">
            Pilihan Divisi &amp; Motivasi
          </h3>
        </div>

        {/* Alasan Bergabung HIMA TI */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-600" htmlFor="alasanBergabung">
            Alasan Bergabung dengan HIMA TI Undiknas <span className="text-amber-500">*</span>
          </label>
          <textarea
            id="alasanBergabung"
            name="alasanBergabung"
            required
            rows={3}
            placeholder="Kemukakan motivasi dan tujuan utama kamu bergabung sebagai fungsionaris..."
            className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20"
          />
        </div>

        {/* Divisi Checkbox Selection */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-600">
              Divisi yang Diminati <span className="text-amber-500">*</span>
            </label>
            <span className="text-xs font-semibold text-zinc-500">
              {selectedDivisi.length} dipilih
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {DIVISI_OPTIONS.map((d) => {
              const checked = selectedDivisi.includes(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDivisi(d.id)}
                  className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                    checked
                      ? "border-amber-400 bg-amber-50/80 shadow-sm ring-2 ring-amber-400/20"
                      : "border-zinc-200/90 bg-zinc-50/80 hover:border-zinc-300 hover:bg-white"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${
                      checked
                        ? "border-amber-500 bg-amber-400 scale-105"
                        : "border-zinc-300 bg-white"
                    }`}
                  >
                    {checked && (
                      <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="#1c1c1c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span>
                    <span className={`block text-sm font-semibold ${checked ? "text-zinc-950" : "text-zinc-700"}`}>
                      {d.label}
                    </span>
                    <span className="block text-xs text-zinc-500 mt-0.5">{d.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Alasan Memilih Divisi */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-600" htmlFor="alasanDivisi">
            Alasan Memilih Divisi Tersebut <span className="text-amber-500">*</span>
          </label>
          <textarea
            id="alasanDivisi"
            name="alasanDivisi"
            required
            rows={3}
            placeholder="Jelaskan alasan dan kontribusi apa yang ingin kamu berikan pada divisi pilihan kamu..."
            className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20"
          />
        </div>
      </div>

      {/* ── SEKSI 4: Berkas Lampiran Tambahan (Opsional) ── */}
      <div className="space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-zinc-600">
          Berkas Lampiran Tambahan
          <span className="ml-2 font-normal normal-case text-zinc-400">
            (Opsional, format PDF maks. 10 MB)
          </span>
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
          className={`relative flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-6 text-center transition-all ${
            fileDragOver
              ? "border-amber-400 bg-amber-50 scale-[1.01]"
              : file
                ? "border-amber-400 bg-amber-50/60"
                : "border-zinc-200 bg-zinc-50/70 hover:border-amber-400/80 hover:bg-white"
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
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-600">
                <UploadSimple size={22} weight="bold" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900">{file.name}</p>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="absolute right-3 top-3 rounded-full bg-white p-1.5 text-zinc-400 shadow-sm hover:text-zinc-700"
              >
                <X size={14} weight="bold" />
              </button>
            </>
          ) : (
            <>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
                <UploadSimple size={22} weight="bold" />
              </div>
              <div>
                <p className="text-sm text-zinc-600">
                  <span className="font-semibold text-zinc-900">Klik untuk memilih</span> atau drag &amp; drop file PDF
                </p>
                <p className="text-xs text-zinc-400 mt-1">Ukuran berkas maksimal 10 MB</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {(status === "error" || errorMsg) && (
        <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <Warning size={18} weight="bold" className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={status === "loading"}
        className="group mt-2 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-zinc-950 px-8 py-4 text-sm font-bold text-white shadow-lg shadow-zinc-950/20 transition-all hover:bg-zinc-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        {status === "loading" ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            <span>Memproses Pendaftaran...</span>
          </>
        ) : (
          <>
            <span>Kirim Pendaftaran &amp; Buat Berkas</span>
            <ArrowRight size={16} weight="bold" className="transition-transform group-hover:translate-x-1" />
          </>
        )}
      </button>

      <p className="text-center text-xs text-zinc-500">
        Setelah mengirim pendaftaran, berkas PDF resmi formulir dan surat pernyataan akan otomatis siap dicetak.
      </p>
    </form>
  );
}
