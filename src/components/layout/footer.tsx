"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  EnvelopeSimple,
  InstagramLogo,
  MapPin,
} from "@phosphor-icons/react/dist/ssr";
import { scrollToSection } from "@/lib/smooth-scroll";

const exploreLinks = [
  { id: "about", label: "Tentang" },
  { id: "fungsionaris", label: "Fungsionaris" },
  { id: "program-kerja", label: "Program Kerja" },
  { id: "galeri", label: "Galeri" },
  { id: "pendaftaran", label: "Pendaftaran" },
];

const socials = [
  {
    href: "https://www.instagram.com/hima_ti_undiknas",
    label: "Instagram",
    icon: InstagramLogo,
  },
];

export function Footer() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <footer id="kontak" className="scroll-mt-16 bg-zinc-950 text-white">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <Link
            href="/"
            onClick={(e) => {
              if (pathname === "/") {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
                if (window.location.hash) {
                  window.history.replaceState(
                    null,
                    "",
                    window.location.pathname,
                  );
                }
              }
            }}
            className="flex items-center gap-2 text-base font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <Image
              src="/brand/logo-emblem.png"
              alt="Logo HIMA TI"
              width={42}
              height={32}
              className="h-8 w-auto"
            />
            HIMA TI
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">
            Himpunan Mahasiswa Teknologi Informasi, Universitas Pendidikan
            Nasional. Organisasi kemahasiswaan pengembang keahlian teknologi dan
            kepemimpinan mahasiswa TI.
          </p>
        </div>

        <div>
          <p className="font-heading text-sm font-semibold text-white">
            Jelajahi
          </p>
          <ul className="mt-4 space-y-3 text-sm text-white/60">
            {exploreLinks.map((item) => (
              <li key={item.id}>
                <a
                  href={`/#${item.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection(item.id, pathname, router);
                  }}
                  className="transition-colors hover:text-amber-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-heading text-sm font-semibold text-white">
            Kontak
          </p>
          <ul className="mt-4 space-y-3 text-sm text-white/60">
            <li className="flex items-start gap-2.5">
              <MapPin size={18} className="mt-0.5 shrink-0 text-amber-400" />
              Jl. Bedugul No.39, Sidakarya, Kec. Denpasar Sel., Kota Denpasar,
              Bali, Denpasar, Bali, Indonesia 80224
            </li>
            <li className="flex items-start gap-2.5">
              <EnvelopeSimple
                size={18}
                className="mt-0.5 shrink-0 text-amber-400"
              />
              <a
                href="mailto:himaprodi.ti.undiknas@gmail.com"
                className="transition-colors hover:text-amber-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400"
              >
                himaprodi.ti.undiknas@gmail.com
              </a>
            </li>
          </ul>

          <div className="mt-5 flex items-center gap-3">
            {socials.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-amber-400 hover:text-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <social.icon size={18} weight="bold" />
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-6 py-5 text-xs text-white/40">
          &copy; {new Date().getFullYear()} HIMA TI Undiknas. Seluruh hak cipta
          dilindungi.
        </p>
      </div>
    </footer>
  );
}
