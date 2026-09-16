"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Broadcast,
  Cake,
  Code,
  HandHeart,
  Microphone,
  ArrowRight,
} from "@phosphor-icons/react/dist/ssr";
import { motion, AnimatePresence } from "motion/react";

const periods = [
  {
    key: "2025-2026",
    label: "2025/2026",
    programs: [
      {
        icon: Microphone,
        title: "Seminar Nasional",
        body: "Pembicara nasional membahas tren teknologi informasi.",
        image: "/hero/foto-3.jpg",
      },
      {
        icon: Broadcast,
        title: "Webinar Nasional",
        body: "Diskusi daring bersama praktisi dan akademisi seputar inovasi AI & cloud.",
        image: null,
        date: "03 Oktober",
        gformLink: "https://docs.google.com/forms/d/e/1FAIpQLSe07p0vZgjx1W1NzMpBUGsXfh6TuUE9s6SCmb8aLVM-F8QZnw/viewform",
      },
      {
        icon: HandHeart,
        title: "Kerja Sosial",
        body: "Pengabdian masyarakat di lingkungan sekitar kampus.",
        image: null,
      },
      {
        icon: Cake,
        title: "IT Versary",
        body: "Perayaan tahunan Program Studi Teknologi Informasi.",
        image: null,
      },
    ],
  },
  {
    key: "2024-2025",
    label: "2024/2025",
    programs: [
      {
        icon: Cake,
        title: "IT Versary & Sertijab",
        body: "Perayaan tahunan sekaligus serah terima jabatan kepengurusan.",
        image: "/proker/it-versary.jpg",
      },
      {
        icon: Microphone,
        title: "Seminar Nasional",
        body: "Pembicara nasional membahas tren teknologi informasi.",
        image: "/proker/seminar-nasional.jpg",
      },
      {
        icon: HandHeart,
        title: "Kerja Sosial",
        body: "Pengabdian masyarakat di lingkungan sekitar kampus.",
        image: "/proker/kersos-2025.jpg",
      },
      {
        icon: Code,
        title: "IT Bootcamp",
        body: "Pelatihan intensif pengembangan skill teknis mahasiswa.",
        image: "/proker/it-bootcamp.webp",
      },
    ],
  },
];

export function ProgramKerjaTabs() {
  const [active, setActive] = useState(periods[0].key);
  const current = periods.find((p) => p.key === active) ?? periods[0];

  return (
    <div>
      {/* Sliding Pill Tab Switcher */}
      <div className="flex justify-center">
        <div className="relative inline-flex rounded-full border border-zinc-200/80 bg-white/80 p-1 shadow-sm backdrop-blur-sm">
          {periods.map((period) => {
            const isSelected = active === period.key;
            return (
              <button
                key={period.key}
                type="button"
                onClick={() => setActive(period.key)}
                aria-pressed={isSelected}
                className={`relative z-10 rounded-full px-6 py-2 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                  isSelected ? "text-zinc-950" : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                {isSelected && (
                  <motion.span
                    layoutId="active-period-pill"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className="absolute inset-0 z-[-1] rounded-full bg-amber-400 shadow-md shadow-amber-400/30"
                  />
                )}
                {period.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Animated Card Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {current.programs.map((program, i) =>
            program.image ? (
              <motion.div
                key={program.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="group relative aspect-[3/4] overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-900 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-amber-400/60 hover:shadow-xl hover:shadow-amber-500/10"
              >
                <Image
                  src={program.image}
                  alt={program.title}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent transition-opacity duration-300 group-hover:opacity-90" />
                <div className="relative z-10 flex h-full flex-col justify-end p-5">
                  <h3 className="font-heading text-base font-bold uppercase tracking-tight text-white sm:text-lg">
                    {program.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-300">
                    {program.body}
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={program.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="group relative flex aspect-[3/4] flex-col items-center justify-center overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-amber-400/50 hover:shadow-xl hover:shadow-amber-500/10"
              >
                {/* Status Beacon Top */}
                <div className="absolute top-5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Coming Soon
                  </span>
                </div>

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-500 transition-transform duration-300 group-hover:scale-110">
                  <program.icon size={28} weight="bold" />
                </div>

                <h3 className="font-heading mt-4 text-base font-bold text-zinc-900 sm:text-lg">
                  {program.title}
                </h3>

                {program.date ? (
                  <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-amber-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Hari H: {program.date}
                  </p>
                ) : null}

                <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                  {program.body}
                </p>

                {program.gformLink && (
                  <a
                    href={program.gformLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-5 left-5 right-5 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-bold text-zinc-950 shadow-sm transition-all duration-200 hover:bg-amber-300 hover:shadow-md active:scale-95"
                  >
                    Daftar Sekarang
                    <ArrowRight size={13} weight="bold" />
                  </a>
                )}
              </motion.div>
            ),
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
