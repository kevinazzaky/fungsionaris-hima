"use client";

import { useState } from "react";
import { List, X } from "@phosphor-icons/react/dist/ssr";

const navLinks = [
  { id: "about", label: "Tentang" },
  { id: "fungsionaris", label: "Fungsionaris" },
  { id: "program-kerja", label: "Program Kerja" },
  { id: "galeri", label: "Galeri" },
  { id: "kontak", label: "Kontak" },
];

export function MobileMenu({ navigateSection }: { navigateSection: (id: string) => void }) {
  const [open, setOpen] = useState(false);

  const handleLinkClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setOpen(false);
    navigateSection(id);
  };

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? "Tutup menu" : "Buka menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white transition-colors hover:text-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        {open ? (
          <X size={22} weight="bold" />
        ) : (
          <List size={22} weight="bold" />
        )}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-16 border-t border-white/10 bg-zinc-950">
          <ul className="flex flex-col px-6 py-4 text-sm font-medium">
            {navLinks.map((item) => (
              <li key={item.id}>
                <a
                  href={`/#${item.id}`}
                  onClick={(e) => handleLinkClick(e, item.id)}
                  className="block py-3 text-white/90 transition-colors hover:text-amber-400"
                >
                  {item.label}
                </a>
              </li>
            ))}
            <li className="pt-3">
              <button
                type="button"
                onClick={(e) => handleLinkClick(e, "pendaftaran")}
                className="block w-full rounded-full bg-amber-400 px-5 py-2.5 text-center text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-300"
              >
                Gabung
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
