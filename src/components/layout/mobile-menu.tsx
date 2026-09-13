"use client";

import Link from "next/link";
import { useState } from "react";
import { List, X } from "@phosphor-icons/react/dist/ssr";

const navLinks = [
  { href: "/#about", label: "Tentang" },
  { href: "/#program-kerja", label: "Program Kerja" },
  { href: "/#fungsionaris", label: "Fungsionaris" },
  { href: "/#galeri", label: "Galeri" },
  { href: "/#kontak", label: "Kontak" },
];

export function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? "Tutup menu" : "Buka menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-white transition-colors hover:text-amber-400"
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
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block py-3 text-white/90 transition-colors hover:text-amber-400"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="pt-3">
              <Link
                href="/#pendaftaran"
                onClick={() => setOpen(false)}
                className="block rounded-full bg-amber-400 px-5 py-2.5 text-center text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-300"
              >
                Gabung
              </Link>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
