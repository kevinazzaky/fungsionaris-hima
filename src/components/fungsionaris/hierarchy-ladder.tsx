"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BENDAHARA,
  DELEGASI,
  DIVISI_LIST,
  KETUA_UMUM,
  PEMBINA,
  SEKRETARIAT,
  WAKIL_KETUA,
  type DivisiData,
} from "@/lib/fungsionaris-data";
import { MemberNode } from "./member-node";
import { BalineseCorner, BalineseDivider } from "@/components/ui/balinese-ornaments";

type TabKey = "inti" | "hh" | "psdm" | "kominfo" | "semua";

const tabs: { key: TabKey; label: string }[] = [
  { key: "inti", label: "Pimpinan Inti" },
  { key: "hh", label: "Divisi HH" },
  { key: "psdm", label: "Divisi PSDM" },
  { key: "kominfo", label: "Divisi Kominfo" },
  { key: "semua", label: "Semua Divisi" },
];

export function HierarchyLadder() {
  const [activeTab, setActiveTab] = useState<TabKey>("inti");

  return (
    <div className="w-full">
      {/* ── Tab Switcher Berpindah (Sliding Pill) ────────────────────── */}
      <div className="flex justify-center px-4">
        <div className="relative inline-flex max-w-full flex-wrap justify-center gap-1.5 rounded-full border border-zinc-200/80 bg-white/90 p-1.5 shadow-sm backdrop-blur-md">
          {tabs.map((tab) => {
            const isSelected = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                aria-pressed={isSelected}
                className={`relative z-10 rounded-full px-4 py-2 text-xs font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 sm:px-5 sm:text-sm ${
                  isSelected ? "text-zinc-950" : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                {isSelected && (
                  <motion.span
                    layoutId="active-hierarchy-tab"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className="absolute inset-0 z-[-1] rounded-full bg-amber-400 shadow-md shadow-amber-400/30"
                  />
                )}
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content Area with AnimatePresence ─────────────────────── */}
      <div className="mt-12">
        <AnimatePresence mode="wait">
          {activeTab === "inti" && (
            <motion.div
              key="tab-inti"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <IntiLadder />
            </motion.div>
          )}

          {(activeTab === "hh" || activeTab === "psdm" || activeTab === "kominfo") && (
            <motion.div
              key={`tab-${activeTab}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <SingleDivisiLadder
                divisi={DIVISI_LIST.find((d) => d.id === activeTab)!}
              />
            </motion.div>
          )}

          {activeTab === "semua" && (
            <motion.div
              key="tab-semua"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-20"
            >
              <IntiLadder />
              <div className="border-t border-zinc-200/80 pt-16">
                <div className="mb-14 text-center">
                  <span className="font-script text-2xl italic text-amber-500 sm:text-3xl">
                    Struktur
                  </span>
                  <h3 className="font-heading text-3xl font-black uppercase tracking-tight text-zinc-900 sm:text-4xl">
                    Divisi Pengurus
                  </h3>
                </div>
                <div className="space-y-20">
                  {DIVISI_LIST.map((divisi) => (
                    <SingleDivisiLadder key={divisi.id} divisi={divisi} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/**
 * Tangga Hirarki Pimpinan Inti:
 * 1. Paling Atas: Pembina HIMA TI (Ms. Riska)
 * 2. Pimpinan Himpunan: Ketua Umum (Kevin) & Wakil Ketua (Wahyu) SEJAJAR
 * 3. Sekretaris Umum (Dedy)
 * 4. Bidang Sekretariat & Kebendaharaan
 * 5. Delegasi
 */
function IntiLadder() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col items-center">
      {/* ── Pucuk: Pembina Organisasi (Solo Terhormat) ─────────────── */}
      <div className="flex flex-col items-center">
        <span className="mb-5 rounded-full border border-zinc-200 bg-white px-4 py-1 text-xs font-bold uppercase tracking-widest text-zinc-600 shadow-sm">
          Pembina HIMA TI
        </span>

        <MemberNode person={PEMBINA} size="lg" />
      </div>

      {/* ── Konektor Vertikal dari Pembina ke Pimpinan Himpunan ─────── */}
      <div className="flex flex-col items-center my-5">
        <div className="h-10 w-0.5 bg-gradient-to-b from-zinc-300 via-amber-400 to-amber-500" />
        <div className="h-2 w-2 rounded-full bg-amber-400" />
      </div>

      {/* ── Tingkat Pimpinan Himpunan: Kevin & Wahyu Sejajar ────────── */}
      <div className="w-full flex flex-col items-center">
        <span className="mb-6 rounded-full border border-amber-400/50 bg-amber-50 px-4 py-1 text-xs font-bold uppercase tracking-widest text-amber-800 shadow-sm">
          Tingkat I: Pimpinan Himpunan
        </span>

        {/* Kevin (Ketua Umum) & Wahyu (Wakil Ketua) Berdampingan Sejajar */}
        <div className="relative flex w-full max-w-2xl justify-center gap-10 sm:gap-20 px-4">
          <MemberNode person={KETUA_UMUM} size="lg" highlight />
          <MemberNode person={WAKIL_KETUA} size="lg" highlight />
        </div>
      </div>

      {/* ── Konektor Vertikal ke Sekretariat & Kebendaharaan ──────── */}
      <div className="flex flex-col items-center my-6">
        <div className="h-10 w-0.5 bg-gradient-to-b from-amber-400 to-zinc-300" />
        <div className="h-2 w-2 rounded-full bg-amber-400" />
      </div>

      {/* ── Tingkat II: Sekretariat & Kebendaharaan ──────────────────── */}
      <div className="w-full">
        <div className="mb-6 text-center">
          <span className="rounded-full border border-zinc-200 bg-white px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-500 shadow-sm">
            Tingkat II: Sekretariat &amp; Kebendaharaan
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Kolom Sekretariat (Dedy, Emilia, Bayu) */}
          <div className="group relative rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm sm:p-8">
            <BalineseCorner position="top-left" className="top-2 left-2" size={36} />
            <BalineseCorner position="top-right" className="top-2 right-2" size={36} />
            <div className="mb-6 border-b border-zinc-100 pb-3 text-center">
              <p className="font-heading text-sm font-bold uppercase tracking-wider text-zinc-900">
                Bidang Sekretariat
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">Administrasi &amp; Persuratan</p>
            </div>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
              {SEKRETARIAT.map((p) => (
                <MemberNode key={p.name} person={p} size="sm" />
              ))}
            </div>
          </div>

          {/* Kolom Bendahara (Catherine, Adelia) */}
          <div className="group relative rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm sm:p-8">
            <BalineseCorner position="top-left" className="top-2 left-2" size={36} />
            <BalineseCorner position="top-right" className="top-2 right-2" size={36} />
            <div className="mb-6 border-b border-zinc-100 pb-3 text-center">
              <p className="font-heading text-sm font-bold uppercase tracking-wider text-zinc-900">
                Bidang Kebendaharaan
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">Keuangan &amp; Anggaran</p>
            </div>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
              {BENDAHARA.map((p) => (
                <MemberNode key={p.name} person={p} size="sm" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Konektor Vertikal ke Delegasi ───────────────────────────── */}
      <div className="flex flex-col items-center my-6">
        <div className="h-10 w-0.5 bg-gradient-to-b from-zinc-300 to-zinc-300" />
        <div className="h-2 w-2 rounded-full bg-zinc-400" />
      </div>

      {/* ── Tingkat III: Delegasi Resmi ─────────────────────────────── */}
      <div className="w-full flex flex-col items-center">
        <span className="mb-6 rounded-full border border-zinc-200 bg-white px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-500 shadow-sm">
          Perwakilan &amp; Delegasi Resmi
        </span>

        <div className="group relative flex flex-wrap justify-center gap-8 sm:gap-14 rounded-3xl border border-zinc-200/80 bg-white px-8 py-6 shadow-sm">
          <BalineseCorner position="top-left" className="top-2 left-2" size={36} />
          <BalineseCorner position="top-right" className="top-2 right-2" size={36} />
          {DELEGASI.map((p) => (
            <MemberNode key={p.name} person={p} size="md" />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Tangga Hirarki Per Divisi
 * Pucuk: Koordinator Divisi (Node Besar)
 * Garis Konektor Tangga
 * Bawah: Seluruh Anggota Divisi
 */
function SingleDivisiLadder({ divisi }: { divisi: DivisiData }) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col items-center">
      {/* Header Divisi */}
      <div className="text-center">
        <span className="font-script text-xl italic text-amber-500 sm:text-2xl">
          {divisi.label}
        </span>
        <h3 className="font-heading mt-1 text-2xl font-black uppercase tracking-tight text-zinc-900 sm:text-3xl">
          {divisi.fullName}
        </h3>
        <BalineseDivider className="my-2" />
        <p className="mx-auto max-w-md text-xs leading-relaxed text-zinc-500 sm:text-sm">
          {divisi.description}
        </p>
      </div>

      {/* Puncak Divisi: Koordinator */}
      <div className="mt-8 flex flex-col items-center">
        <span className="mb-4 rounded-full border border-amber-400/40 bg-amber-50 px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-700">
          Koordinator Divisi
        </span>
        <MemberNode person={divisi.koordinator} size="lg" highlight />
      </div>

      {/* Konektor Vertikal Menuju Anggota */}
      <div className="flex flex-col items-center my-6">
        <div className="h-10 w-0.5 bg-gradient-to-b from-amber-400 to-zinc-300" />
        <div className="h-2 w-2 rounded-full bg-amber-400" />
      </div>

      {/* Barisan Anggota Divisi */}
      <div className="group relative w-full rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm sm:p-10">
        <BalineseCorner position="top-left" className="top-2 left-2" size={40} />
        <BalineseCorner position="top-right" className="top-2 right-2" size={40} />
        <div className="mb-8 border-b border-zinc-100 pb-3 text-center">
          <p className="font-heading text-xs font-bold uppercase tracking-widest text-zinc-400">
            Anggota Divisi ({divisi.anggota.length} Orang)
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-6 sm:gap-10">
          {divisi.anggota.map((anggota) => (
            <MemberNode key={anggota.name} person={anggota} size="sm" />
          ))}
        </div>
      </div>
    </div>
  );
}
