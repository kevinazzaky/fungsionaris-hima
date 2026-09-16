"use client";

import { useState } from "react";
import {
  Broadcast,
  GraduationCap,
  Handshake,
  IdentificationBadge,
} from "@phosphor-icons/react/dist/ssr";
import { motion, AnimatePresence } from "motion/react";
import { ProfileAvatar } from "@/components/ui/profile-avatar";

const groups = [
  {
    key: "delegasi",
    icon: IdentificationBadge,
    name: "Delegasi",
    members: [
      { name: "Ardelia Naenda Ahmadi", role: "Delegasi" },
      { name: "Sad Bagus Ketut Ak", role: "Delegasi" },
    ],
  },
  {
    key: "hh",
    icon: Handshake,
    name: "Divisi HH",
    members: [
      { name: "Yunima Dioranda Manik", role: "Koordinator" },
      { name: "Indriani Asten", role: "Anggota" },
      { name: "A.A Ngurah Agung Mahendra Sedana", role: "Anggota" },
      { name: "I Komang Dika Gus Septa", role: "Anggota" },
      { name: "Gede Bagus Indra Tanaya", role: "Anggota" },
    ],
  },
  {
    key: "psdm",
    icon: GraduationCap,
    name: "Divisi PSDM",
    members: [
      { name: "Benedito Nidio Da Rosa Maia Tilman", role: "Koordinator" },
      { name: "Ida Bagus Sugiharta Dharma Putra", role: "Anggota" },
      { name: "Gusti Ngurah Ardana Wijaya", role: "Anggota" },
      { name: "Zintia Adella", role: "Anggota" },
      { name: "Adelia Surya Putri", role: "Anggota" },
      { name: "I Made Dandi Prayata Ardana", role: "Anggota" },
      { name: "Komang Indra Wirawan", role: "Anggota" },
    ],
  },
  {
    key: "kominfo",
    icon: Broadcast,
    name: "Divisi Kominfo",
    members: [
      { name: "Cevyn Eduard Imanuel Dapa Talu", role: "Koordinator" },
      { name: "Gabriel Jehuda Tamedo", role: "Anggota" },
      { name: "Mochammad Akmal Anfal", role: "Anggota" },
      { name: "Evan Safi Maulana Malik Ibrahim", role: "Anggota" },
      { name: "I Wayan Yoga Karang", role: "Anggota" },
      { name: "Friendly Riantha Dwi Pratama", role: "Anggota" },
    ],
  },
];

export function DivisiList() {
  const [active, setActive] = useState<string | null>(null);
  const current = groups.find((g) => g.key === active);

  return (
    <div>
      <div className="flex flex-wrap justify-center gap-2.5 px-6">
        {groups.map((item) => {
          const isSelected = active === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setActive(isSelected ? null : item.key)}
              aria-pressed={isSelected}
              className={`relative inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                isSelected
                  ? "border-amber-400 text-zinc-950 shadow-md shadow-amber-400/20"
                  : "border-zinc-200/80 bg-white text-zinc-700 hover:border-amber-300 hover:text-zinc-900"
              }`}
            >
              {isSelected && (
                <motion.span
                  layoutId="active-divisi-pill"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  className="absolute inset-0 z-[-1] rounded-full bg-amber-400"
                />
              )}
              <item.icon
                size={16}
                weight="bold"
                className={isSelected ? "text-zinc-950" : "text-amber-500"}
              />
              {item.name}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={current.key}
            initial={{ opacity: 0, y: 12, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-8 flex flex-wrap justify-center gap-4 px-6">
              {current.members.map((member, idx) => (
                <motion.div
                  key={member.name}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  className="group flex w-40 flex-col items-center overflow-hidden rounded-2xl border border-zinc-200/70 bg-white p-4 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/50 hover:shadow-lg hover:shadow-zinc-200/60"
                >
                  <div className="relative h-20 w-20 overflow-hidden rounded-full ring-2 ring-zinc-100 transition-transform duration-300 group-hover:scale-105 group-hover:ring-amber-400/50">
                    <ProfileAvatar />
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm font-semibold text-zinc-900">
                    {member.name}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">{member.role}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
