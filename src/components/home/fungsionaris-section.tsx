"use client";

import { useState } from "react";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { DivisiList } from "@/components/home/divisi-list";
import { DragScroll } from "@/components/ui/drag-scroll";
import { ProfileAvatar } from "@/components/ui/profile-avatar";

const pengurus = [
  { name: "Renald Kevin Azzaky", role: "Ketua Umum" },
  { name: "Kadek Wahyu Santika Putra", role: "Wakil Ketua" },
  { name: "I Made Dedy Wanditya", role: "Sekretaris Umum" },
  { name: "Gusti Ayu Emilia Artika", role: "Sekretaris I" },
  { name: "Komang Bayu Trias Gautama", role: "Sekretaris II" },
  { name: "Catherine Soenarjo", role: "Bendahara I" },
  { name: "Made Adelia Febriana", role: "Bendahara II" },
];

const pimpinanLengkap = [
  { name: "Ir. Made Ari Riska Dayanti, S.T., M.T", role: "Pembina" },
  ...pengurus,
];

const delegasi = [
  { name: "Ardelia Naenda Ahmadi", role: "Delegasi" },
  { name: "Sad Bagus Ketut Ak", role: "Delegasi" },
];

const divisiGroups = [
  {
    title: "Divisi HH",
    members: [
      { name: "Yunima Dioranda Manik", role: "Koordinator" },
      { name: "Indriani Asten", role: "Anggota" },
      { name: "A.A Ngurah Agung Mahendra Sedana", role: "Anggota" },
      { name: "I Komang Dika Gus Septa", role: "Anggota" },
      { name: "Gede Bagus Indra Tanaya", role: "Anggota" },
    ],
  },
  {
    title: "Divisi PSDM",
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
    title: "Divisi Kominfo",
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

function PersonCard({ name, role }: { name: string; role: string }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-zinc-100">
      <div className="relative aspect-[3/4] w-full">
        <ProfileAvatar />
      </div>
      <div className="p-3.5">
        <p className="text-sm font-semibold text-zinc-900">{name}</p>
        <p className="mt-0.5 text-xs text-zinc-500">{role}</p>
      </div>
    </div>
  );
}

export function FungsionarisSection() {
  const [showAll, setShowAll] = useState(false);

  return (
    <section id="fungsionaris" className="scroll-mt-16 bg-zinc-100 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <Reveal>
          <SectionHeading script="Susunan" bold="Fungsionaris" className="text-center" />
        </Reveal>
      </div>

      <DragScroll className="mt-10 flex cursor-grab snap-x snap-mandatory gap-5 overflow-x-auto px-6 pb-4 select-none active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-6 sm:[justify-content:safe_center]">
        {pengurus.map((person, i) => (
          <Reveal
            key={person.name}
            delay={100 + i * 90}
            className="relative aspect-[3/4] w-56 shrink-0 snap-start overflow-hidden rounded-2xl"
          >
            <ProfileAvatar />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 text-left">
              <p className="font-heading font-semibold text-white">{person.name}</p>
              <p className="mt-0.5 text-sm text-white/70">{person.role}</p>
            </div>
          </Reveal>
        ))}
      </DragScroll>

      <Reveal delay={100 + pengurus.length * 90} className="mt-10">
        <DivisiList />
      </Reveal>

      {/* Expanded: semua fungsionaris */}
      {showAll && (
        <div className="mx-auto mt-12 max-w-6xl px-6">
          <div className="rounded-3xl bg-white p-8 sm:p-10">
            {/* Pimpinan Inti */}
            <h3 className="text-lg font-bold text-zinc-900">Pimpinan Inti</h3>
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {pimpinanLengkap.map((person) => (
                <PersonCard key={person.name} {...person} />
              ))}
            </div>

            {/* Delegasi */}
            <h3 className="mt-10 text-lg font-bold text-zinc-900">Delegasi</h3>
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {delegasi.map((person) => (
                <PersonCard key={person.name} {...person} />
              ))}
            </div>

            {/* Semua Divisi */}
            {divisiGroups.map((group) => (
              <div key={group.title}>
                <h3 className="mt-10 text-lg font-bold text-zinc-900">{group.title}</h3>
                <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {group.members.map((person) => (
                    <PersonCard key={person.name} {...person} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Reveal
        delay={200 + pengurus.length * 90}
        className="mt-8 flex justify-center px-6"
      >
        <button
          type="button"
          onClick={() => setShowAll((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-zinc-950 shadow-[0_0_32px_-6px_rgba(251,191,36,0.55)] transition-all hover:bg-amber-300 hover:shadow-[0_0_40px_-4px_rgba(251,191,36,0.75)]"
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
      </Reveal>
    </section>
  );
}
