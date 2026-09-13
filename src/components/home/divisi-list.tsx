"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Broadcast,
  GraduationCap,
  Handshake,
  IdentificationBadge,
} from "@phosphor-icons/react/dist/ssr";

const groups = [
  {
    key: "delegasi",
    icon: IdentificationBadge,
    name: "Delegasi",
    members: [
      { name: "Ardelia Naenda Ahmadi", role: "Delegasi", seed: "hima-ti-delegasi-1" },
      { name: "Sad Bagus Ketut Ak", role: "Delegasi", seed: "hima-ti-delegasi-2" },
    ],
  },
  {
    key: "hh",
    icon: Handshake,
    name: "Divisi HH",
    members: [
      { name: "Yunima Dioranda Manik", role: "Koordinator", seed: "hima-ti-hh-1" },
      { name: "Indriani Asten", role: "Anggota", seed: "hima-ti-hh-2" },
      { name: "A.A Ngurah Agung Mahendra Sedana", role: "Anggota", seed: "hima-ti-hh-3" },
      { name: "I Komang Dika Gus Septa", role: "Anggota", seed: "hima-ti-hh-4" },
      { name: "Gede Bagus Indra Tanaya", role: "Anggota", seed: "hima-ti-hh-5" },
    ],
  },
  {
    key: "psdm",
    icon: GraduationCap,
    name: "Divisi PSDM",
    members: [
      { name: "Benedito Nidio Da Rosa Maia Tilman", role: "Koordinator", seed: "hima-ti-psdm-1" },
      { name: "Ida Bagus Sugiharta Dharma Putra", role: "Anggota", seed: "hima-ti-psdm-2" },
      { name: "Gusti Ngurah Ardana Wijaya", role: "Anggota", seed: "hima-ti-psdm-3" },
      { name: "Zintia Adella", role: "Anggota", seed: "hima-ti-psdm-4" },
      { name: "Adelia Surya Putri", role: "Anggota", seed: "hima-ti-psdm-5" },
      { name: "I Made Dandi Prayata Ardana", role: "Anggota", seed: "hima-ti-psdm-6" },
      { name: "Komang Indra Wirawan", role: "Anggota", seed: "hima-ti-psdm-7" },
    ],
  },
  {
    key: "kominfo",
    icon: Broadcast,
    name: "Divisi Kominfo",
    members: [
      { name: "Cevyn Eduard Imanuel Dapa Talu", role: "Koordinator", seed: "hima-ti-kominfo-1" },
      { name: "Gabriel Jehuda Tamedo", role: "Anggota", seed: "hima-ti-kominfo-2" },
      { name: "Mochammad Akmal Anfal", role: "Anggota", seed: "hima-ti-kominfo-3" },
      { name: "Evan Safi Maulana Malik Ibrahim", role: "Anggota", seed: "hima-ti-kominfo-4" },
      { name: "I Wayan Yoga Karang", role: "Anggota", seed: "hima-ti-kominfo-5" },
      { name: "Friendly Riantha Dwi Pratama", role: "Anggota", seed: "hima-ti-kominfo-6" },
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
                <Image
                  src={`https://picsum.photos/seed/${member.seed}/200/200`}
                  alt={member.name}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
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
