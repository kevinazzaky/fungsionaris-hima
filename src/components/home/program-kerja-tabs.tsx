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
  Info,
} from "@phosphor-icons/react/dist/ssr";
import { motion, AnimatePresence } from "motion/react";
import { ProgramModal, type ProgramItem } from "@/components/home/program-modal";

interface PeriodData {
  key: string;
  label: string;
  programs: ProgramItem[];
}

const periods: PeriodData[] = [
  {
    key: "2025-2026",
    label: "2025/2026",
    programs: [
      {
        icon: Microphone,
        title: "Seminar Nasional",
        body: "Pembicara nasional membahas tren teknologi informasi terkini.",
        fullDescription:
          "Seminar tahunan berskala nasional yang menghadirkan praktisi industri terkemuka serta akademisi untuk mengupas perkembangan terkini di dunia teknologi informasi, kesiapan talenta digital, dan peluang masa depan.",
        image: "/hero/foto-3.jpg",
        executionDate: "Kalender Akademik 2025/2026",
        time: "Menyesuaikan Jadwal",
        location: "Auditorium Kampus Undiknas",
        status: "upcoming",
        statusText: "Segera Hadir",
      },
      {
        icon: Broadcast,
        title: "Webinar Nasional",
        body: "The Autonomous Era: Bagaimana Integrasi AIoT Menjadikan Perangkat Berpikir dan Bertindak Otomatis.",
        fullDescription:
          "Webinar Nasional bertajuk 'THE AUTONOMOUS ERA: Bagaimana Integrasi AIoT Menjadikan Perangkat Berpikir dan Bertindak secara Otomatis'. Menghadirkan pembicara ahli untuk mengupas tuntas penerapan nyata kecerdasan buatan dan IoT di industri modern.",
        image: "/proker/webinar-nasional.jpg",
        date: "03 Oktober 2026",
        executionDate: "03 Oktober 2026",
        time: "09:30 WITA",
        location: "Daring via Zoom Meeting",
        status: "open",
        statusText: "Pendaftaran Masih Dibuka",
        gformLink:
          "https://docs.google.com/forms/d/e/1FAIpQLSe07p0vZgjx1W1NzMpBUGsXfh6TuUE9s6SCmb8aLVM-F8QZnw/viewform",
        extraDetails: {
          speakers: [
            "I Putu Arich Arthawan S.Kom, M.T. (Narasumber 1)",
            "Ni Luh Putu Ika Candrawengi S.Stat., M.Stat. (Narasumber 2)",
            "Ewaldo Zenobia S.Tr.T. (Narasumber 3)",
            "Ir. I Gusti Ngurah Darma Paramartha S.T., M.T., I.P.M. (Moderator)",
          ],
          price: "Rp 25.000 (Early Bird)",
          benefits: ["E-Certificate", "Pengalaman & Relasi", "Wawasan Praktis AIoT", "Poin SKP A"],
          contactPerson: "Dhea (0818-0522-8056) / Indah (0822-1344-4798)",
        },
      },
      {
        icon: HandHeart,
        title: "Kerja Sosial",
        body: "Pengabdian masyarakat di lingkungan sekitar kampus.",
        fullDescription:
          "Program kepedulian sosial dan bakti kemasyarakatan nyata mahasiswa Teknologi Informasi untuk memberikan kontribusi positif melalui edukasi teknologi, aksi peduli sosial, dan pendampingan masyarakat.",
        image: null,
        executionDate: "Semester Genap 2025/2026",
        time: "Menyesuaikan Jadwal",
        location: "Denpasar dan Sekitarnya",
        status: "upcoming",
        statusText: "Segera Hadir",
      },
      {
        icon: Cake,
        title: "IT Versary",
        body: "Perayaan tahunan Program Studi Teknologi Informasi.",
        fullDescription:
          "Peringatan hari jadi Program Studi Teknologi Informasi yang dirayakan melalui rangkaian kompetisi inovasi mahasiswa, pameran karya teknologi, pentas ekspresi seni, dan keakraban seluruh civitas akademika.",
        image: null,
        executionDate: "Dies Natalis TI 2026",
        time: "Menyesuaikan Jadwal",
        location: "Kampus Undiknas Denpasar",
        status: "upcoming",
        statusText: "Segera Hadir",
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
        fullDescription:
          "Malam perayaan hari jadi Program Studi TI sekaligus serah terima jabatan (sertijab) kepengurusan HIMA TI periode 2024/2025 kepada penerus tongkat estafet berikutnya.",
        image: "/proker/it-versary.jpg",
        executionDate: "Tahun 2024",
        time: "Selesai Dilaksanakan",
        location: "Auditorium Undiknas",
        status: "closed",
        statusText: "Pendaftaran Ditutup",
      },
      {
        icon: Microphone,
        title: "Seminar Nasional",
        body: "Pembicara nasional membahas tren teknologi informasi.",
        fullDescription:
          "Seminar nasional inspiratif yang mempertemukan mahasiswa dengan pembicara berpengalaman nasional dalam memahami dinamika dan ekosistem industri teknologi modern.",
        image: "/proker/seminar-nasional.jpg",
        executionDate: "Tahun 2024",
        time: "Selesai Dilaksanakan",
        location: "Auditorium Undiknas",
        status: "closed",
        statusText: "Pendaftaran Ditutup",
      },
      {
        icon: HandHeart,
        title: "Kerja Sosial",
        body: "Pengabdian masyarakat di lingkungan sekitar kampus.",
        fullDescription:
          "Aksi sosial mahasiswa TI yang berfokus pada pendampingan masyarakat dan kepedulian lingkungan sekitar guna mempererat relasi mahasiswa dengan warga lokal.",
        image: "/proker/kersos-2025.jpg",
        executionDate: "Tahun 2024/2025",
        time: "Selesai Dilaksanakan",
        location: "Denpasar, Bali",
        status: "closed",
        statusText: "Pendaftaran Ditutup",
      },
      {
        icon: Code,
        title: "IT Bootcamp",
        body: "Pelatihan intensif pengembangan skill teknis mahasiswa.",
        fullDescription:
          "Pelatihan intensif hands-on pemrograman dan pemecahan masalah algoritma untuk meningkatkan kompetensi teknis mahasiswa TI menghadapi kebutuhan industri digital.",
        image: "/proker/it-bootcamp.webp",
        executionDate: "Tahun 2024/2025",
        time: "Selesai Dilaksanakan",
        location: "Laboratorium Komputer Undiknas",
        status: "closed",
        statusText: "Pendaftaran Ditutup",
      },
    ],
  },
];

export function ProgramKerjaTabs() {
  const [active, setActive] = useState(periods[0].key);
  const [selectedProgram, setSelectedProgram] = useState<ProgramItem | null>(null);

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
              <motion.button
                key={program.title}
                type="button"
                onClick={() => setSelectedProgram(program)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="group relative aspect-[3/4] w-full cursor-pointer overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-900 text-left shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-amber-400/60 hover:shadow-xl hover:shadow-amber-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
                aria-haspopup="dialog"
                aria-label={`Lihat rincian program ${program.title}`}
              >
                <Image
                  src={program.image}
                  alt={program.title}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent transition-opacity duration-300 group-hover:opacity-90" />

                {/* Status Beacon on Top */}
                <div className="absolute left-4 top-4 z-10">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold backdrop-blur-md ${
                      program.status === "open"
                        ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40"
                        : program.status === "upcoming"
                        ? "bg-amber-950/80 text-amber-300 border border-amber-500/40"
                        : "bg-zinc-900/85 text-zinc-300 border border-zinc-700/50"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        program.status === "open"
                          ? "bg-emerald-400 animate-pulse"
                          : program.status === "upcoming"
                          ? "bg-amber-400"
                          : "bg-zinc-400"
                      }`}
                    />
                    {program.statusText}
                  </span>
                </div>

                {/* Card Content at Bottom */}
                <div className="relative z-10 flex h-full flex-col justify-end p-5">
                  <h3 className="font-heading text-base font-bold uppercase tracking-tight text-white transition-colors group-hover:text-amber-300 sm:text-lg">
                    {program.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-300 line-clamp-2">
                    {program.body}
                  </p>

                  <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 transition-transform group-hover:translate-x-1">
                    <span>Lihat Detail Program</span>
                    <ArrowRight size={13} weight="bold" />
                  </div>
                </div>
              </motion.button>
            ) : (
              <motion.button
                key={program.title}
                type="button"
                onClick={() => setSelectedProgram(program)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="group relative flex aspect-[3/4] w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-amber-400/50 hover:shadow-xl hover:shadow-amber-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
                aria-haspopup="dialog"
                aria-label={`Lihat rincian program ${program.title}`}
              >
                {/* Status Beacon Top */}
                <div className="absolute top-5">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold tracking-wider ${
                      program.status === "open"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : program.status === "upcoming"
                        ? "bg-amber-50 text-amber-900 border border-amber-200"
                        : "bg-zinc-100 text-zinc-700 border border-zinc-200"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        program.status === "open"
                          ? "bg-emerald-500 animate-pulse"
                          : program.status === "upcoming"
                          ? "bg-amber-500"
                          : "bg-zinc-400"
                      }`}
                    />
                    {program.statusText}
                  </span>
                </div>

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-500 transition-transform duration-300 group-hover:scale-110">
                  <program.icon size={28} weight="bold" />
                </div>

                <h3 className="font-heading mt-4 text-base font-bold text-zinc-900 transition-colors group-hover:text-amber-600 sm:text-lg">
                  {program.title}
                </h3>

                {program.executionDate ? (
                  <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-amber-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    {program.executionDate}
                  </p>
                ) : null}

                <p className="mt-2 text-xs leading-relaxed text-zinc-600 line-clamp-3">
                  {program.body}
                </p>

                <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-zinc-900 transition-colors group-hover:text-amber-600">
                  <Info size={14} weight="bold" className="text-amber-500" />
                  Lihat Detail
                  <ArrowRight size={13} weight="bold" className="transition-transform group-hover:translate-x-1" />
                </span>
              </motion.button>
            ),
          )}
        </motion.div>
      </AnimatePresence>

      {/* Program Detail Popup Modal */}
      <ProgramModal
        program={selectedProgram}
        onClose={() => setSelectedProgram(null)}
      />
    </div>
  );
}
