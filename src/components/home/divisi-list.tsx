"use client";

import { useState } from "react";
import {
  Broadcast,
  GraduationCap,
  Handshake,
  IdentificationBadge,
} from "@phosphor-icons/react/dist/ssr";
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
      <div className="flex flex-wrap justify-center gap-3 px-6">
        {groups.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setActive(active === item.key ? null : item.key)}
            aria-pressed={active === item.key}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              active === item.key
                ? "border-amber-400 bg-amber-400 text-zinc-950"
                : "border-zinc-200 bg-white text-zinc-700 hover:border-amber-400"
            }`}
          >
            <item.icon
              size={16}
              weight="bold"
              className={active === item.key ? "text-zinc-950" : "text-amber-500"}
            />
            {item.name}
          </button>
        ))}
      </div>

      {current && (
        <div className="mt-6 flex flex-wrap justify-center gap-4 px-6">
          {current.members.map((member) => (
            <div
              key={member.name}
              className="flex w-40 flex-col items-center overflow-hidden rounded-2xl bg-white p-4 text-center shadow-sm"
            >
              <div className="relative h-20 w-20 overflow-hidden rounded-full">
                <ProfileAvatar />
              </div>
              <p className="mt-3 text-sm font-semibold text-zinc-900">
                {member.name}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">{member.role}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
