import {
  ArrowDown,
  BellRinging,
  ChatCircleText,
  ClipboardText,
  Megaphone,
  Users,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { DetailHeader } from "@/components/detail/detail-header";
import { RegistrationForm } from "@/components/pendaftaran/registration-form";
import { REGISTRATION_CONFIG, DIVISI_OPTIONS } from "@/lib/pendaftaran-config";

const { isOpen, statusLabel, pageDesc } = REGISTRATION_CONFIG;

const alur = [
  {
    step: "01",
    icon: ClipboardText,
    title: "Isi Formulir",
    body: "Lengkapi data diri dan pilih minimal 2 divisi yang diminati.",
  },
  {
    step: "02",
    icon: Megaphone,
    title: "Gabung Grup LINE",
    body: "Setelah mengisi formulir, kamu akan mendapatkan link untuk bergabung ke grup LINE resmi. Seluruh informasi tahapan selanjutnya akan diinfokan di sana.",
  },
  {
    step: "03",
    icon: ChatCircleText,
    title: "Wawancara",
    body: "Sesi wawancara singkat bersama tim pengurus HIMA TI.",
  },
];

export default function PendaftaranPage() {
  return (
    <>
      <DetailHeader
        title="Pendaftaran Fungsionaris"
        description="Pendaftaran resmi fungsionaris HIMA TI Undiknas periode 2026. Lengkapi formulir dan pilih divisi yang diminati."
      />

      <div className="mx-auto max-w-5xl px-6 pb-20 pt-12">

        {/* ── Hero Banner ────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl bg-zinc-950 border border-white/10 shadow-2xl shadow-black/40">
          {/* Decorative ambient lighting */}
          <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-amber-500/15 blur-[100px] animate-pulse-slow" />
          <div className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-amber-400/10 blur-[90px] animate-pulse-slow [animation-delay:3s]" />

          <div className="relative z-10 grid gap-8 p-8 sm:grid-cols-[1fr_auto] sm:items-center sm:p-12">
            <div>
              {/* Badge */}
              <span className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-black uppercase tracking-widest backdrop-blur-md ${
                isOpen
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-amber-400/30 bg-amber-400/10 text-amber-400"
              }`}>
                <span
                  className={`h-2 w-2 rounded-full ${
                    isOpen ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                />
                {statusLabel}
              </span>

              <h2 className="mt-5 max-w-md text-2xl font-bold leading-snug tracking-tight text-white sm:text-3xl">
                {isOpen
                  ? <>Pendaftaran Fungsionaris<br />HIMA TI 2026 Dibuka</>
                  : "Pendaftaran Sedang Ditutup"}
              </h2>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-300">
                {pageDesc}
              </p>
            </div>

            {isOpen ? (
              <a
                href="#formulir"
                className="group flex shrink-0 flex-col items-center gap-2.5 rounded-2xl bg-amber-400 p-6 text-center shadow-[0_0_48px_-8px_rgba(251,191,36,0.55)] transition-all duration-200 hover:bg-amber-300 hover:shadow-[0_0_56px_-6px_rgba(251,191,36,0.85)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 sm:w-36"
              >
                <ClipboardText size={26} weight="bold" className="text-zinc-950 transition-transform duration-300 group-hover:scale-110" />
                <span className="text-sm font-black text-zinc-950 leading-tight">
                  Daftar<br />Sekarang
                </span>
              </a>
            ) : (
              <Link
                href="/#kontak"
                className="flex shrink-0 flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-6 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 sm:w-36"
              >
                <BellRinging size={26} weight="bold" className="text-white/40" />
                <span className="text-sm font-semibold text-white/40 leading-tight">
                  Pantau<br />Info
                </span>
              </Link>
            )}
          </div>
        </div>

        {/* ── Alur Pendaftaran ──────────────────────────────────────── */}
        <div className="mt-14">
          <p className="mb-5 text-xs font-black uppercase tracking-widest text-zinc-400">
            Alur Pendaftaran
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {alur.map((step, i) => (
              <div
                key={step.step}
                className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/50 hover:shadow-lg hover:shadow-zinc-200/60"
              >
                {/* Connector dot */}
                {i < alur.length - 1 && (
                  <div className="absolute -right-2 top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 items-center justify-center sm:flex">
                    <div className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
                  </div>
                )}

                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-xs font-black text-amber-400 transition-transform duration-300 group-hover:scale-105">
                  {step.step}
                </div>

                <step.icon
                  size={20}
                  weight="bold"
                  className="text-zinc-400 transition-colors duration-200 group-hover:text-amber-500"
                />
                <p className="mt-3 font-heading font-bold text-zinc-900">{step.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">{step.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Divisi ────────────────────────────────────────────────── */}
        <div className="mt-14">
          <p className="mb-5 text-xs font-black uppercase tracking-widest text-zinc-400">
            Divisi yang Tersedia
          </p>
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-5">
            {DIVISI_OPTIONS.map((d) => (
              <div
                key={d.id}
                className="group flex flex-col gap-2 rounded-2xl border border-zinc-200/80 bg-white p-4.5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/50 hover:shadow-md"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/15 text-amber-600 transition-transform duration-300 group-hover:scale-110">
                  <Users size={16} weight="bold" />
                </div>
                <p className="font-heading font-bold text-sm text-zinc-900">{d.label}</p>
                <p className="text-[11px] leading-relaxed text-zinc-500">{d.desc}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-zinc-400">* Wajib memilih minimal 2 divisi</p>
        </div>

        {/* ── Formulir ────────────────────────────────────────────── */}
        {isOpen ? (
          <div id="formulir" className="mt-16 scroll-mt-24">
            {/* Separator */}
            <div className="mb-10 flex items-center gap-4">
              <div className="h-px flex-1 bg-zinc-100" />
              <div className="flex items-center gap-2 text-zinc-400">
                <ArrowDown size={14} weight="bold" className="text-amber-500" />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  Formulir
                </span>
              </div>
              <div className="h-px flex-1 bg-zinc-100" />
            </div>

            {/* Form card */}
            <div className="overflow-hidden rounded-3xl border border-zinc-200 shadow-2xl shadow-zinc-100">
              {/* Card header */}
              <div className="flex items-center justify-between bg-zinc-950 px-8 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400">
                    <ClipboardText size={18} weight="bold" className="text-zinc-950" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Formulir Pendaftaran</p>
                    <p className="text-[11px] text-white/40">Isi data diri dan tentukan divisi secara teliti</p>
                  </div>
                </div>
              </div>

              {/* Card body */}
              <div className="bg-white px-8 py-10 sm:px-10">
                <RegistrationForm />
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-16 flex flex-col items-center gap-4 rounded-3xl border border-dashed border-zinc-200 py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
              <BellRinging size={28} weight="duotone" className="text-zinc-300" />
            </div>
            <p className="font-semibold text-zinc-400">Formulir tidak tersedia saat ini</p>
            <p className="max-w-xs text-xs text-zinc-400">
              Follow Instagram kami untuk mendapatkan notifikasi ketika pendaftaran dibuka kembali.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
