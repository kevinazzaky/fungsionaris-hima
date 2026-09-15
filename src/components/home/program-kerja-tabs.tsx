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
import { Reveal } from "@/components/ui/reveal";

const periods = [
  {
    key: "2025-2026",
    label: "2025/2026",
    programs: [
      {
        icon: Microphone,
        title: "Seminar Nasional",
        body: "Pembicara nasional membahas tren teknologi informasi.",
        image: "/proker/seminar-nasional.jpg",
      },
      {
        icon: Broadcast,
        title: "Webinar Nasional",
        body: "Diskusi daring bersama praktisi dan akademisi.",
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
      <div className="flex justify-center">
        <div className="inline-flex rounded-full border border-zinc-200 bg-white p-1">
          {periods.map((period) => (
            <button
              key={period.key}
              type="button"
              onClick={() => setActive(period.key)}
              aria-pressed={active === period.key}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                active === period.key
                  ? "bg-amber-400 text-zinc-950"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {current.programs.map((program, i) =>
          program.image ? (
            <Reveal
              key={program.title}
              delay={i * 100}
              className="relative aspect-[3/4] overflow-hidden rounded-xl border border-amber-400/40"
            >
              <Image
                src={program.image}
                alt={program.title}
                fill
                sizes="(min-width: 640px) 25vw, 50vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/95 via-zinc-950/30 to-transparent" />
              <div className="relative z-10 flex h-full flex-col justify-end p-4">
                <h3 className="font-heading text-sm font-bold uppercase leading-tight text-white sm:text-base">
                  {program.title}
                </h3>
                <p className="mt-1 text-xs leading-snug text-white/70">
                  {program.body}
                </p>
              </div>
            </Reveal>
          ) : (
            <Reveal
              key={program.title}
              delay={i * 100}
              className="relative flex aspect-[3/4] flex-col items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 text-center"
            >
              <div className="absolute top-4">
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  Coming Soon
                </span>
              </div>
              
              <program.icon size={26} weight="bold" className="text-amber-500" />
              
              <h3 className="font-heading mt-4 text-sm font-bold text-zinc-900 sm:text-base">
                {program.title}
              </h3>
              
              {program.date ? (
                <p className="mt-1 text-xs font-bold text-amber-500">
                  Hari H: {program.date}
                </p>
              ) : null}

              <p className="mt-1.5 text-[11px] leading-snug text-zinc-500">
                {program.body}
              </p>

              {program.gformLink && (
                <a
                  href={program.gformLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-4 left-4 right-4 inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-400 px-3 py-2 text-[11px] font-bold text-zinc-950 transition-colors hover:bg-amber-300"
                >
                  Daftar Sekarang
                  <ArrowRight size={12} weight="bold" />
                </a>
              )}
            </Reveal>
          ),
        )}
      </div>
    </div>
  );
}
