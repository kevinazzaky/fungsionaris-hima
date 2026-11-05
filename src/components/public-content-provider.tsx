"use client";

import { createContext, useContext } from "react";
import type { GalleryPhoto, Member } from "@/domain/admin";
import { DIVISI_LIST } from "@/lib/fungsionaris-data";

export type PublicDivision = Omit<(typeof DIVISI_LIST)[number], "koordinator" | "anggota"> & { koordinator?: Member; anggota: Member[] };

const ContentContext = createContext<{ members: Member[]; gallery: GalleryPhoto[] } | null>(null);

export function PublicContentProvider({ members, gallery, children }: { members: Member[]; gallery: GalleryPhoto[]; children: React.ReactNode }) {
  return <ContentContext.Provider value={{ members, gallery }}>{children}</ContentContext.Provider>;
}

export function usePublicContent() {
  const context = useContext(ContentContext);
  if (!context) throw new Error("PublicContentProvider tidak ditemukan.");
  return context;
}

export function useOrganization() {
  const { members } = usePublicContent();
  return {
    PEMBINA_LIST: members.filter((person) => person.group === "pembina"),
    PIMPINAN: members.filter((person) => person.group === "pimpinan"),
    SEKRETARIAT: members.filter((person) => person.group === "sekretariat"),
    BENDAHARA: members.filter((person) => person.group === "bendahara"),
    DELEGASI: members.filter((person) => person.group === "delegasi"),
    DIVISI_LIST: DIVISI_LIST.map((division): PublicDivision => {
      const people = members.filter((person) => person.group === division.id);
      const koordinator = people.find((person) => /koordinator/i.test(person.role));
      return { ...division, koordinator, anggota: people.filter((person) => person.id !== koordinator?.id) };
    }),
  };
}
