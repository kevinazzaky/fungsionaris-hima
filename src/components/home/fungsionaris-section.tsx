"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { DivisiList } from "@/components/home/divisi-list";
import { DragScroll } from "@/components/ui/drag-scroll";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { BalineseCorner, BalineseDivider, BalineseWatermark } from "@/components/ui/balinese-ornaments";
import {
  BENDAHARA,
  DELEGASI,
  DIVISI_LIST,
  KETUA_UMUM,
  PEMBINA,
  SEKRETARIAT,
  WAKIL_KETUA,
} from "@/lib/fungsionaris-data";

const pengurus = [
  KETUA_UMUM,
  WAKIL_KETUA,
  ...SEKRETARIAT,
  ...BENDAHARA,
];

const pimpinanLengkap = [
  PEMBINA,
  KETUA_UMUM,
  WAKIL_KETUA,
  ...SEKRETARIAT,
  ...BENDAHARA,
];

function PersonCard({ name, role }: { name: string; role: string }) {
  return (
    <div className="group overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-100/90 transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/60 hover:shadow-md">
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-zinc-900">
        <ProfileAvatar />
      </div>
      <div className="p-3 text-left sm:p-4">
        <p className="font-heading text-sm font-semibold leading-snug text-zinc-900 transition-colors group-hover:text-amber-600">
          {name}
        </p>
        <p className="mt-1 text-xs font-medium text-zinc-500">{role}</p>
      </div>
    </div>
  );
}

export function FungsionarisSection() {
  const [showAll, setShowAll] = useState(false);

  return (
    <section id="fungsionaris" className="relative overflow-hidden scroll-mt-16 bg-zinc-100 py-20 sm:py-28">
      {/* Ornamen Watermark Khas Bali */}
      <BalineseWatermark className="-right-16 -top-16 opacity-[0.05] text-amber-600" size={320} />
      <BalineseWatermark className="-left-16 bottom-10 opacity-[0.04] text-amber-600" size={300} />

      <div className="relative mx-auto max-w-6xl px-6 text-center">
        <Reveal>
          <SectionHeading script="Susunan" bold="Fungsionaris" className="text-center" />
          <BalineseDivider className="mt-3" />
        </Reveal>
      </div>

      <div className="mx-auto max-w-6xl px-8 sm:px-12 lg:px-16">
        <DragScroll className="mt-10 flex cursor-grab snap-x snap-mandatory gap-5 overflow-x-auto pb-4 select-none active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:[justify-content:safe_center]">
          {pengurus.map((person, i) => (
            <Reveal
              key={person.name}
              delay={100 + i * 80}
              className="group relative aspect-[3/4] w-56 shrink-0 snap-start overflow-hidden rounded-2xl border border-zinc-900/10 shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:border-amber-400/60 hover:shadow-xl hover:shadow-amber-500/15"
            >
              <div className="h-full w-full transition-transform duration-500 ease-out group-hover:scale-105">
                <ProfileAvatar />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent transition-opacity duration-300" />
              <div className="absolute inset-x-0 bottom-0 p-4 text-left">
                <p className="font-heading font-semibold text-white">{person.name}</p>
                <p className="mt-0.5 text-sm text-amber-400/90">{person.role}</p>
              </div>
            </Reveal>
          ))}
        </DragScroll>
      </div>

      <Reveal delay={100 + pengurus.length * 80} className="mt-10">
        <DivisiList />
      </Reveal>

      {/* Expanded: semua foto fungsionaris */}
      <AnimatePresence>
        {showAll && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mx-auto mt-12 max-w-6xl px-6">
              <div className="group relative rounded-3xl border border-zinc-200/80 bg-white p-6 sm:p-10 shadow-sm">
                <BalineseCorner position="top-left" className="top-3 left-3" size={44} />
                <BalineseCorner position="top-right" className="top-3 right-3" size={44} />
                {/* Pimpinan Inti */}
                <div>
                  <h3 className="font-heading text-lg font-bold text-zinc-900 sm:text-xl">
                    Pimpinan Inti
                  </h3>
                  <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                    {pimpinanLengkap.map((person) => (
                      <PersonCard key={person.name} name={person.name} role={person.role} />
                    ))}
                  </div>
                </div>

                {/* Delegasi */}
                <div className="mt-10">
                  <h3 className="font-heading text-lg font-bold text-zinc-900 sm:text-xl">
                    Perwakilan &amp; Delegasi
                  </h3>
                  <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                    {DELEGASI.map((person) => (
                      <PersonCard key={person.name} name={person.name} role={person.role} />
                    ))}
                  </div>
                </div>

                {/* Semua Divisi */}
                {DIVISI_LIST.map((divisi) => (
                  <div key={divisi.id} className="mt-10">
                    <h3 className="font-heading text-lg font-bold text-zinc-900 sm:text-xl">
                      {divisi.fullName}
                    </h3>
                    <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                      <PersonCard
                        name={divisi.koordinator.name}
                        role={divisi.koordinator.role}
                      />
                      {divisi.anggota.map((person) => (
                        <PersonCard key={person.name} name={person.name} role={person.role} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Reveal
        delay={200 + pengurus.length * 80}
        className="mt-8 flex flex-wrap items-center justify-center gap-4 px-6"
      >
        <button
          type="button"
          onClick={() => setShowAll((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-sm font-bold text-zinc-950 shadow-[0_0_32px_-6px_rgba(251,191,36,0.55)] transition-all duration-200 hover:bg-amber-300 hover:shadow-[0_0_40px_-4px_rgba(251,191,36,0.8)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-100"
        >
          {showAll ? "Sembunyikan" : "Lihat Semua Fungsionaris"}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 256 256"
            fill="currentColor"
            className={`transition-transform duration-300 ${showAll ? "rotate-180" : ""}`}
          >
            <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z" />
          </svg>
        </button>

        <a
          href="/fungsionaris"
          className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold text-zinc-800 shadow-sm transition-all duration-200 hover:border-amber-400 hover:text-amber-600 hover:shadow-md active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          Bagan Tangga Organisasi
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 256 256"
            fill="currentColor"
          >
            <path d="M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z" />
          </svg>
        </a>
      </Reveal>
    </section>
  );
}
