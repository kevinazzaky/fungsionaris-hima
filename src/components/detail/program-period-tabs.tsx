"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Broadcast,
  Cake,
  Code,
  HandHeart,
  Microphone,
} from "@phosphor-icons/react/dist/ssr";

const periods = [
  {
    key: "2025-2026",
    label: "2025/2026",
    programs: [
      {
        icon: Microphone,
        title: "Seminar Nasional",
        body: "Seminar dengan pembicara nasional membahas tren dan isu terkini teknologi informasi.",
        image: "/hero/foto-3.jpg",
      },
      {
        icon: Broadcast,
        title: "Webinar Nasional",
        body: "Diskusi daring bersama praktisi dan akademisi seputar dunia teknologi.",
        image: null,
      },
      {
        icon: HandHeart,
        title: "Kerja Sosial",
        body: "Pengabdian masyarakat lewat edukasi dan kegiatan sosial di lingkungan sekitar kampus.",
        image: null,
      },
      {
        icon: Cake,
        title: "IT Versary",
        body: "Perayaan tahunan Program Studi Teknologi Informasi bersama seluruh civitas akademika.",
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
        body: "Perayaan tahunan sekaligus serah terima jabatan kepengurusan HIMA TI.",
        image: "/proker/it-versary.jpg",
      },
      {
        icon: Microphone,
        title: "Seminar Nasional",
        body: "Seminar dengan pembicara nasional membahas tren dan isu terkini teknologi informasi.",
        image: "/proker/seminar-nasional.jpg",
      },
      {
        icon: HandHeart,
        title: "Kerja Sosial",
        body: "Pengabdian masyarakat lewat edukasi dan kegiatan sosial di lingkungan sekitar kampus.",
        image: "/proker/kersos-2025.jpg",
      },
      {
        icon: Code,
        title: "IT Bootcamp",
        body: "Pelatihan intensif pengembangan skill teknis bagi mahasiswa Teknologi Informasi.",
        image: "/proker/it-bootcamp.webp",
      },
    ],
  },
];

export function ProgramPeriodTabs() {
  const [active, setActive] = useState(periods[0].key);
  const current = periods.find((p) => p.key === active) ?? periods[0];

  return (
    <div>
      <div className="inline-flex rounded-full border border-zinc-200 p-1">
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

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {current.programs.map((program) => (
          <div
            key={program.title}
            className="overflow-hidden rounded-2xl border border-zinc-200"
          >
            {program.image && (
              <div className="relative aspect-video w-full">
                <Image
                  src={program.image}
                  alt={program.title}
                  fill
                  sizes="(min-width: 640px) 40vw, 90vw"
                  className="object-cover"
                />
              </div>
            )}
            <div className="p-6">
              <program.icon size={26} weight="bold" className="text-amber-500" />
              <h3 className="mt-4 text-lg font-bold text-zinc-900">
                {program.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                {program.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
