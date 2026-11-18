"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowSquareOut,
  CalendarBlank,
  CheckCircle,
  Clock,
  Printer,
  Users,
  Warning,
} from "@phosphor-icons/react/dist/ssr";
import Link from "@/components/ui/navigation-link";
import { PendingLabel } from "@/components/ui/pending-label";
import { ValidationError } from "@/domain/admin";
import type { Program } from "@/domain/programs";
import { validateProgramRegistrationInput } from "@/domain/program-registrations";

const ANGKATAN_OPTIONS = ["2020", "2021", "2022", "2023", "2024", "2025", "2026"] as const;

const INPUT_CLASS =
  "min-h-[44px] w-full rounded-xl border border-zinc-500 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-600 transition-colors focus-visible:border-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 disabled:bg-zinc-100 disabled:text-zinc-600";

export type ProgramRegistrationFormProps = {
  program: Program;
  registeredCount: number;
  configured: boolean;
};

type RegistrationResult = {
  registration: {
    id: string;
    programId: string;
    nama: string;
    nim: string;
    angkatan: string;
    submittedAt: string;
  };
  programTitle: string;
  registrationGroupLink: string;
  submittedNoHp: string;
  submittedIdLine: string;
  submittedEmail: string;
  submittedCatatan: string;
};

function isSafeHttpUrl(value: string): boolean {
  if (!value) return false;
  try {
    const protocol = new URL(value).protocol;
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

function formatSubmittedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Baru saja";
  return (
    new Intl.DateTimeFormat("id-ID", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Asia/Makassar",
    }).format(date) + " WITA"
  );
}

function StatusNoticeCard({
  icon,
  title,
  description,
  extra,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  extra?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="space-y-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-6 sm:p-8">
      <div className="flex items-start gap-3.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-900">
          {icon}
        </div>
        <div className="min-w-0 space-y-1.5">
          <h2 className="font-heading text-lg font-bold text-zinc-900 sm:text-xl">
            {title}
          </h2>
          <p className="text-sm leading-relaxed text-zinc-700 break-words">
            {description}
          </p>
          {extra}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        {action}
        <Link
          href="/program-kerja"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-zinc-500 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2"
        >
          Lihat Program Kerja lain
        </Link>
      </div>
    </div>
  );
}

export function ProgramRegistrationForm({
  program,
  registeredCount,
  configured,
}: ProgramRegistrationFormProps) {
  const [nama, setNama] = useState("");
  const [nim, setNim] = useState("");
  const [angkatan, setAngkatan] = useState("");
  const [noHp, setNoHp] = useState("");
  const [idLine, setIdLine] = useState("");
  const [email, setEmail] = useState("");
  const [catatan, setCatatan] = useState("");

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<RegistrationResult | null>(null);

  const inFlight = useRef(false);
  const alertRef = useRef<HTMLDivElement>(null);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (result) {
      successHeadingRef.current?.focus();
    }
  }, [result]);

  if (!configured) {
    return (
      <StatusNoticeCard
        icon={<Clock size={22} weight="bold" aria-hidden="true" />}
        title="Layanan Pendaftaran Belum Aktif"
        description="Sistem pendaftaran peserta belum dikonfigurasi pada server ini. Silakan hubungi panitia untuk informasi pendaftaran."
        extra={
          program.contactPerson ? (
            <p className="pt-1 text-sm font-medium text-zinc-800 break-words">
              Narahubung: {program.contactPerson}
            </p>
          ) : null
        }
      />
    );
  }

  if (program.registrationMode !== "internal") {
    const canOpenExternal =
      program.status === "open" && isSafeHttpUrl(program.gformLink);
    return (
      <StatusNoticeCard
        icon={<ArrowSquareOut size={22} weight="bold" aria-hidden="true" />}
        title={
          canOpenExternal
            ? "Pendaftaran Melalui Formulir Eksternal"
            : program.status === "upcoming"
              ? "Pendaftaran Belum Dibuka"
              : "Pendaftaran Tidak Tersedia di Website"
        }
        description={
          canOpenExternal
            ? `Pendaftaran peserta untuk ${program.title} dibuka melalui tautan formulir resmi panitia di luar website ini.`
            : `Program kerja ${program.title} menggunakan kanal pendaftaran eksternal dan saat ini tidak menerima pendaftaran melalui formulir website.`
        }
        extra={
          program.contactPerson ? (
            <p className="pt-1 text-sm font-medium text-zinc-800 break-words">
              Narahubung: {program.contactPerson}
            </p>
          ) : null
        }
        action={
          canOpenExternal ? (
            <a
              href={program.gformLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-zinc-950 transition-colors hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2"
            >
              Buka Formulir Pendaftaran
              <ArrowSquareOut size={16} weight="bold" aria-hidden="true" />
            </a>
          ) : undefined
        }
      />
    );
  }

  if (program.status === "upcoming") {
    return (
      <StatusNoticeCard
        icon={<CalendarBlank size={22} weight="bold" aria-hidden="true" />}
        title="Pendaftaran Belum Dibuka"
        description={`Pendaftaran peserta untuk ${program.title} belum dibuka. Silakan pantau informasi terbaru menjelang jadwal pelaksanaan.`}
        extra={
          <div className="space-y-1 pt-1 text-sm text-zinc-800">
            {program.executionDate ? (
              <p className="font-medium break-words">
                Jadwal pelaksanaan: {program.executionDate}
              </p>
            ) : null}
            {program.contactPerson ? (
              <p className="font-medium break-words">
                Narahubung: {program.contactPerson}
              </p>
            ) : null}
          </div>
        }
      />
    );
  }

  if (program.status !== "open") {
    return (
      <StatusNoticeCard
        icon={<Clock size={22} weight="bold" aria-hidden="true" />}
        title="Pendaftaran Ditutup"
        description={`Pendaftaran peserta untuk ${program.title} telah ditutup dan tidak lagi menerima pengisian formulir baru.`}
        extra={
          program.contactPerson ? (
            <p className="pt-1 text-sm font-medium text-zinc-800 break-words">
              Narahubung: {program.contactPerson}
            </p>
          ) : null
        }
      />
    );
  }

  if (
    program.registrationMaxQuota !== null &&
    registeredCount >= program.registrationMaxQuota
  ) {
    return (
      <StatusNoticeCard
        icon={<Users size={22} weight="bold" aria-hidden="true" />}
        title="Kuota Peserta Penuh"
        description={`Seluruh ${program.registrationMaxQuota} slot peserta untuk ${program.title} telah terisi (${registeredCount} dari ${program.registrationMaxQuota} peserta terdaftar).`}
        extra={
          program.contactPerson ? (
            <p className="pt-1 text-sm font-medium text-zinc-800 break-words">
              Narahubung: {program.contactPerson}
            </p>
          ) : null
        }
      />
    );
  }

  function handlePrint() {
    const originalTitle = document.title;
    if (result) {
      document.title = `Bukti Pendaftaran ${result.programTitle} - ${result.registration.nama}`;
    }
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current) return;

    let validated;
    try {
      validated = validateProgramRegistrationInput({
        nama,
        nim,
        angkatan,
        noHp,
        idLine,
        email,
        catatan,
      });
    } catch (error) {
      setErrorMsg(
        error instanceof ValidationError
          ? error.message
          : "Periksa kembali data yang dimasukkan.",
      );
      requestAnimationFrame(() => alertRef.current?.focus());
      return;
    }

    inFlight.current = true;
    setBusy(true);
    setErrorMsg("");

    try {
      const response = await fetch("/api/program-registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId: program.id, ...validated }),
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        registration?: RegistrationResult["registration"];
        programTitle?: string;
        registrationGroupLink?: string;
      } | null;

      if (!response.ok || !payload?.registration) {
        setErrorMsg(
          payload?.error ||
            "Terjadi kesalahan saat memproses pendaftaran. Silakan coba kembali.",
        );
        requestAnimationFrame(() => alertRef.current?.focus());
        return;
      }

      setResult({
        registration: payload.registration,
        programTitle: payload.programTitle || program.title,
        registrationGroupLink: payload.registrationGroupLink || "",
        submittedNoHp: validated.noHp,
        submittedIdLine: validated.idLine,
        submittedEmail: validated.email,
        submittedCatatan: validated.catatan,
      });
    } catch {
      setErrorMsg(
        "Gagal terhubung ke server. Periksa koneksi internet Anda lalu coba kembali.",
      );
      requestAnimationFrame(() => alertRef.current?.focus());
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  if (result) {
    const hasGroupLink = isSafeHttpUrl(result.registrationGroupLink);
    const formattedTime = formatSubmittedAt(result.registration.submittedAt);

    return (
      <div className="space-y-6">
        <div className="space-y-5 no-print">
          <div className="flex items-start gap-3.5 rounded-2xl border border-emerald-300 bg-emerald-50 p-5">
            <CheckCircle
              size={26}
              weight="fill"
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-emerald-900"
            />
            <div className="min-w-0 space-y-1">
              <span className="inline-block rounded-md bg-white px-2.5 py-0.5 text-xs font-bold text-emerald-900 border border-emerald-200">
                Pendaftaran Tercatat
              </span>
              <h2
                ref={successHeadingRef}
                tabIndex={-1}
                className="pt-1 font-heading text-xl font-bold text-zinc-900 focus:outline-none sm:text-2xl"
              >
                Pendaftaran Berhasil Dikirim
              </h2>
              <p className="text-sm leading-relaxed text-zinc-700">
                Data keikutsertaan Anda pada {result.programTitle} sudah tersimpan
                di sistem panitia.
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-5 sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                Nama Lengkap
              </dt>
              <dd className="mt-1 text-sm font-bold text-zinc-900 break-words">
                {result.registration.nama}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                NIM
              </dt>
              <dd className="mt-1 text-sm font-bold text-zinc-900 break-words">
                {result.registration.nim}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                Angkatan
              </dt>
              <dd className="mt-1 text-sm font-bold text-zinc-900">
                {result.registration.angkatan}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                Program Kerja
              </dt>
              <dd className="mt-1 text-sm font-bold text-zinc-900 break-words">
                {result.programTitle}
              </dd>
            </div>
            <div className="min-w-0 sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                Waktu Daftar
              </dt>
              <dd className="mt-1 text-sm font-semibold text-zinc-900">
                {formattedTime}
              </dd>
            </div>
          </dl>

          {hasGroupLink ? (
            <div className="space-y-3 rounded-2xl border border-amber-300 bg-amber-50 p-5">
              <div className="space-y-1">
                <h3 className="font-heading text-base font-bold text-zinc-900">
                  Gabung Grup Resmi Peserta
                </h3>
                <p className="text-sm leading-relaxed text-zinc-700">
                  Masuk ke grup koordinasi peserta untuk menerima pembaruan
                  jadwal, lokasi, dan arahan teknis dari panitia.
                </p>
              </div>
              <a
                href={result.registrationGroupLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-3 text-sm font-bold text-zinc-950 transition-colors hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2 sm:w-auto"
              >
                Gabung Grup Peserta
                <ArrowSquareOut size={16} weight="bold" aria-hidden="true" />
              </a>
            </div>
          ) : (
            <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
              Informasi teknis pelaksanaan dan undangan koordinasi akan
              disampaikan oleh panitia melalui kontak WhatsApp atau ID LINE yang
              Anda daftarkan.
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-zinc-500 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2"
            >
              <Printer size={18} weight="bold" aria-hidden="true" />
              Cetak / Simpan Bukti
            </button>
            <Link
              href="/program-kerja"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-zinc-500 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2"
            >
              Lihat Program Kerja lain
            </Link>
          </div>
        </div>

        {/* Portal receipt outside <main>, because globals.css hides <main> during @media print. */}
        {typeof document !== "undefined" &&
          createPortal(
            <div className="hidden print:block p-8 text-zinc-900">
              <div className="mx-auto max-w-2xl border border-zinc-400 p-8 space-y-6">
                <div className="border-b border-zinc-400 pb-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                    HIMA TI Universitas Pendidikan Nasional
                  </p>
                  <h1 className="mt-1 text-2xl font-bold text-zinc-900">
                    Bukti Pendaftaran Peserta Program Kerja
                  </h1>
                  <p className="mt-1 text-sm text-zinc-700">
                    {result.programTitle} (Periode {program.period})
                  </p>
                </div>

                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-xs uppercase text-zinc-600">ID Pendaftaran</dt>
                    <dd className="mt-0.5 font-mono text-xs text-zinc-900">
                      {result.registration.id}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-zinc-600">Waktu Daftar</dt>
                    <dd className="mt-0.5 font-semibold text-zinc-900">
                      {formattedTime}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-zinc-600">Nama Lengkap</dt>
                    <dd className="mt-0.5 font-semibold text-zinc-900">
                      {result.registration.nama}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-zinc-600">NIM</dt>
                    <dd className="mt-0.5 font-semibold text-zinc-900">
                      {result.registration.nim}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-zinc-600">Angkatan</dt>
                    <dd className="mt-0.5 font-semibold text-zinc-900">
                      {result.registration.angkatan}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-zinc-600">Nomor HP / WA</dt>
                    <dd className="mt-0.5 font-semibold text-zinc-900">
                      {result.submittedNoHp}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-zinc-600">ID LINE</dt>
                    <dd className="mt-0.5 font-semibold text-zinc-900">
                      {result.submittedIdLine}
                    </dd>
                  </div>
                  {result.submittedEmail ? (
                    <div>
                      <dt className="text-xs uppercase text-zinc-600">Email</dt>
                      <dd className="mt-0.5 font-semibold text-zinc-900">
                        {result.submittedEmail}
                      </dd>
                    </div>
                  ) : null}
                  {result.submittedCatatan ? (
                    <div className="col-span-2">
                      <dt className="text-xs uppercase text-zinc-600">
                        Catatan untuk Panitia
                      </dt>
                      <dd className="mt-0.5 text-zinc-900">
                        {result.submittedCatatan}
                      </dd>
                    </div>
                  ) : null}
                </dl>

                {hasGroupLink ? (
                  <div className="border-t border-zinc-300 pt-4 text-xs text-zinc-700">
                    <p className="font-semibold text-zinc-900">
                      Tautan Grup Resmi Peserta:
                    </p>
                    <p className="mt-1 break-all">{result.registrationGroupLink}</p>
                  </div>
                ) : null}
              </div>
            </div>,
            document.body,
          )}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-busy={busy}
      className="space-y-6 no-print"
    >
      <div className="space-y-1">
        <h2 className="font-heading text-xl font-bold text-zinc-900 sm:text-2xl">
          Formulir Pendaftaran Peserta
        </h2>
        <p className="text-sm text-zinc-600">
          Lengkapi identitas peserta untuk mendaftar ke kegiatan {program.title}.
          Kolom bertanda bintang (*) wajib diisi.
        </p>
      </div>

      <fieldset disabled={busy} className="m-0 min-w-0 space-y-5 border-0 p-0">
        <div className="space-y-1.5">
          <label
            htmlFor="reg-nama"
            className="block text-sm font-semibold text-zinc-900"
          >
            Nama lengkap <span className="text-amber-800">*</span>
          </label>
          <input
            id="reg-nama"
            name="nama"
            type="text"
            required
            autoComplete="name"
            minLength={2}
            maxLength={100}
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="Masukkan nama lengkap"
            className={INPUT_CLASS}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="min-w-0 space-y-1.5">
            <label
              htmlFor="reg-nim"
              className="block text-sm font-semibold text-zinc-900"
            >
              NIM <span className="text-amber-800">*</span>
            </label>
            <input
              id="reg-nim"
              name="nim"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              required
              minLength={5}
              maxLength={30}
              value={nim}
              onChange={(e) => setNim(e.target.value.replace(/\D/g, ""))}
              aria-describedby="reg-nim-hint"
              placeholder="Masukkan NIM (hanya angka)"
              className={INPUT_CLASS}
            />
            <p id="reg-nim-hint" className="text-xs leading-relaxed text-zinc-600">
              Hanya angka, 5 sampai 30 digit (misalnya 8 digit NIM Undiknas).
            </p>
          </div>

          <div className="min-w-0 space-y-1.5">
            <label
              htmlFor="reg-angkatan"
              className="block text-sm font-semibold text-zinc-900"
            >
              Angkatan <span className="text-amber-800">*</span>
            </label>
            <select
              id="reg-angkatan"
              name="angkatan"
              required
              value={angkatan}
              onChange={(e) => setAngkatan(e.target.value)}
              className={INPUT_CLASS}
            >
              <option value="" disabled>
                Pilih tahun angkatan
              </option>
              {ANGKATAN_OPTIONS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="min-w-0 space-y-1.5">
            <label
              htmlFor="reg-noHp"
              className="block text-sm font-semibold text-zinc-900"
            >
              Nomor HP / WhatsApp aktif <span className="text-amber-800">*</span>
            </label>
            <input
              id="reg-noHp"
              name="noHp"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              maxLength={20}
              value={noHp}
              onChange={(e) => setNoHp(e.target.value)}
              aria-describedby="reg-noHp-hint"
              placeholder="Contoh: 08xxxxxxxxxx"
              className={INPUT_CLASS}
            />
            <p id="reg-noHp-hint" className="text-xs leading-relaxed text-zinc-600">
              Digunakan panitia untuk komunikasi darurat atau konfirmasi.
            </p>
          </div>

          <div className="min-w-0 space-y-1.5">
            <label
              htmlFor="reg-idLine"
              className="block text-sm font-semibold text-zinc-900"
            >
              ID LINE aktif <span className="text-amber-800">*</span>
            </label>
            <input
              id="reg-idLine"
              name="idLine"
              type="text"
              autoComplete="off"
              required
              minLength={2}
              maxLength={64}
              value={idLine}
              onChange={(e) => setIdLine(e.target.value)}
              placeholder="Masukkan ID LINE aktif"
              className={INPUT_CLASS}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="reg-email"
            className="block text-sm font-semibold text-zinc-900"
          >
            Email (opsional)
          </label>
          <input
            id="reg-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={120}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@email.com"
            className={INPUT_CLASS}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <label
              htmlFor="reg-catatan"
              className="block text-sm font-semibold text-zinc-900"
            >
              Catatan untuk panitia (opsional)
            </label>
            <span className="text-xs text-zinc-600">{catatan.length}/300</span>
          </div>
          <textarea
            id="reg-catatan"
            name="catatan"
            rows={3}
            maxLength={300}
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Tulis informasi tambahan seperti kebutuhan konsumsi atau pertanyaan singkat"
            className="w-full rounded-xl border border-zinc-500 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-600 transition-colors focus-visible:border-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 disabled:bg-zinc-100 disabled:text-zinc-600"
          />
        </div>

        {errorMsg ? (
          <div
            ref={alertRef}
            tabIndex={-1}
            role="alert"
            className="scroll-mt-24 flex items-start gap-2.5 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
          >
            <Warning
              size={18}
              weight="bold"
              aria-hidden="true"
              className="mt-0.5 shrink-0"
            />
            <span className="min-w-0 break-words">{errorMsg}</span>
          </div>
        ) : null}

        <div className="pt-1">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-amber-400 px-6 py-3 text-sm font-bold text-zinc-950 shadow-xs transition-colors hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[240px]"
          >
            <PendingLabel pending={busy} text="Mengirim pendaftaran...">
              Kirim Pendaftaran
            </PendingLabel>
          </button>
        </div>
      </fieldset>
    </form>
  );
}
