"use client";

import { useEffect, type ComponentType } from "react";
import Image from "next/image";
import {
  X,
  CalendarBlank,
  Clock,
  MapPin,
  CheckCircle,
  Circle,
  ArrowSquareOut,
  Tag,
  Users,
  Check,
} from "@phosphor-icons/react/dist/ssr";
import type { IconProps } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";

export interface ProgramItem {
  icon: ComponentType<IconProps>;
  title: string;
  body: string;
  fullDescription?: string;
  image?: string | null;
  date?: string;
  executionDate: string;
  time?: string;
  location?: string;
  status: "open" | "closed" | "upcoming";
  statusText: string;
  gformLink?: string;
  extraDetails?: {
    speakers?: string[];
    price?: string;
    benefits?: string[];
    contactPerson?: string;
  };
}

interface ProgramModalProps {
  program: ProgramItem | null;
  onClose: () => void;
}

export function ProgramModal({ program, onClose }: ProgramModalProps) {
  useEffect(() => {
    if (!program) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [program, onClose]);

  return (
    <AnimatePresence>
      {program && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-zinc-950/75 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Modal Container */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="program-modal-title"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-zinc-200/90 bg-white shadow-2xl"
          >
            {/* Header Image or Icon Header */}
            {program.image ? (
              <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-zinc-950 sm:aspect-[21/9]">
                <Image
                  src={program.image}
                  alt={program.title}
                  fill
                  sizes="(max-width: 640px) 100vw, 672px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />

                {/* Close Button */}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Tutup jendela detail program kerja"
                  className="absolute right-4 top-4 z-20 flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-zinc-950/60 text-white backdrop-blur-md transition-colors hover:bg-zinc-900 hover:text-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <X size={20} weight="bold" />
                </button>

                {/* Status Badge on banner */}
                <div className="absolute bottom-4 left-6 right-6 z-10">
                  <div className="inline-flex items-center gap-2 rounded-full bg-zinc-950/80 px-3.5 py-1.5 text-xs font-semibold backdrop-blur-md">
                    {program.status === "open" ? (
                      <>
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                        </span>
                        <span className="text-emerald-400">{program.statusText}</span>
                      </>
                    ) : program.status === "upcoming" ? (
                      <>
                        <span className="h-2 w-2 rounded-full bg-amber-400" />
                        <span className="text-amber-300">{program.statusText}</span>
                      </>
                    ) : (
                      <>
                        <span className="h-2 w-2 rounded-full bg-zinc-400" />
                        <span className="text-zinc-300">{program.statusText}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/80 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-600">
                    <program.icon size={24} weight="bold" />
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold shadow-xs">
                    {program.status === "open" ? (
                      <>
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="text-emerald-700">{program.statusText}</span>
                      </>
                    ) : program.status === "upcoming" ? (
                      <>
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        <span className="text-amber-800">{program.statusText}</span>
                      </>
                    ) : (
                      <>
                        <span className="h-2 w-2 rounded-full bg-zinc-400" />
                        <span className="text-zinc-600">{program.statusText}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Tutup jendela detail program kerja"
                  className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-200/70 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <X size={20} weight="bold" />
                </button>
              </div>
            )}

            {/* Scrollable Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
              {/* Title */}
              <div>
                <h2
                  id="program-modal-title"
                  className="font-heading text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl"
                >
                  {program.title}
                </h2>
              </div>

              {/* Program Metadata Grid */}
              <div className="grid grid-cols-1 gap-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-4 sm:grid-cols-3">
                {/* Tanggal Eksekusi */}
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                    <CalendarBlank size={18} weight="bold" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                      Tanggal Pelaksanaan
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-zinc-900">
                      {program.executionDate}
                    </p>
                  </div>
                </div>

                {/* Waktu / Jadwal */}
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                    <Clock size={18} weight="bold" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                      Waktu
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-zinc-900">
                      {program.time || "Sesuai Jadwal"}
                    </p>
                  </div>
                </div>

                {/* Lokasi */}
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                    <MapPin size={18} weight="bold" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                      Lokasi / Format
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-zinc-900">
                      {program.location || "Kampus Undiknas"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Pendaftaran Banner */}
              <div
                className={`flex items-center gap-3 rounded-2xl border p-4 ${
                  program.status === "open"
                    ? "border-emerald-200 bg-emerald-50/70 text-emerald-950"
                    : program.status === "upcoming"
                    ? "border-amber-200 bg-amber-50/70 text-amber-950"
                    : "border-zinc-200 bg-zinc-100/70 text-zinc-800"
                }`}
              >
                {program.status === "open" ? (
                  <CheckCircle size={22} weight="fill" className="shrink-0 text-emerald-600" />
                ) : program.status === "upcoming" ? (
                  <Circle size={22} weight="bold" className="shrink-0 text-amber-600" />
                ) : (
                  <CheckCircle size={22} weight="fill" className="shrink-0 text-zinc-500" />
                )}
                <div>
                  <p className="text-xs font-bold">
                    {program.status === "open"
                      ? "Pendaftaran Sedang Dibuka"
                      : program.status === "upcoming"
                      ? "Pendaftaran Belum Dibuka"
                      : "Pendaftaran Telah Ditutup"}
                  </p>
                  <p className="mt-0.5 text-xs opacity-80">
                    {program.status === "open"
                      ? "Segera amankan tiket dan slot pendaftaran Anda sekarang."
                      : program.status === "upcoming"
                      ? "Informasi pembukaan registrasi akan diumumkan menjelang pelaksanaan."
                      : "Kegiatan ini telah selesai dilaksanakan pada periode yang bersangkutan."}
                  </p>
                </div>
              </div>

              {/* Deskripsi Lengkap */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Tentang Program Kerja
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-700">
                  {program.fullDescription || program.body}
                </p>
              </div>

              {/* Extra Details (Speakers, Pricing, Benefits, Contact) */}
              {program.extraDetails && (
                <div className="space-y-4 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-5">
                  {/* Speakers list */}
                  {program.extraDetails.speakers && program.extraDetails.speakers.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-700">
                        <Users size={16} weight="bold" className="text-amber-600" />
                        <span>Narasumber & Moderator</span>
                      </div>
                      <ul className="mt-2 space-y-1.5 text-xs text-zinc-700">
                        {program.extraDetails.speakers.map((speaker) => (
                          <li key={speaker} className="flex items-start gap-2">
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                            <span>{speaker}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Pricing & Benefits */}
                  <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
                    {program.extraDetails.price && (
                      <div>
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-700">
                          <Tag size={16} weight="bold" className="text-amber-600" />
                          <span>Biaya Registrasi</span>
                        </div>
                        <p className="mt-1.5 text-sm font-bold text-zinc-950">
                          {program.extraDetails.price}
                        </p>
                      </div>
                    )}

                    {program.extraDetails.contactPerson && (
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                          Narahubung (CP)
                        </div>
                        <p className="mt-1.5 text-xs text-zinc-700 font-medium">
                          {program.extraDetails.contactPerson}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Benefits */}
                  {program.extraDetails.benefits && program.extraDetails.benefits.length > 0 && (
                    <div className="pt-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                        Benefit Peserta
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {program.extraDetails.benefits.map((benefit) => (
                          <span
                            key={benefit}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 shadow-2xs"
                          >
                            <Check size={12} weight="bold" className="text-amber-600" />
                            {benefit}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-zinc-200/80 bg-zinc-50/80 px-6 py-4 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                Tutup
              </button>

              {program.status === "open" && program.gformLink ? (
                <a
                  href={program.gformLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-2.5 text-sm font-bold text-zinc-950 shadow-sm transition-all duration-200 hover:bg-amber-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 active:scale-95"
                >
                  Daftar Sekarang (Google Form)
                  <ArrowSquareOut size={16} weight="bold" />
                </a>
              ) : program.status === "upcoming" ? (
                <span className="inline-flex items-center text-xs font-semibold text-amber-700">
                  Pendaftaran segera dibuka
                </span>
              ) : (
                <span className="inline-flex items-center text-xs font-semibold text-zinc-500">
                  Pendaftaran telah selesai
                </span>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
