"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import { scrollToSection } from "@/lib/smooth-scroll";

const navLinks = [
  { id: "about", label: "Tentang" },
  { id: "fungsionaris", label: "Fungsionaris" },
  { id: "program-kerja", label: "Program Kerja" },
  { id: "galeri", label: "Galeri" },
  { id: "kontak", label: "Kontak" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    scrollToSection(id, pathname, router);
  };

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (window.location.hash) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    }
  };

  return (
    <header className="animate-fade-in sticky top-0 z-50 border-b border-white/10 bg-zinc-950/85 backdrop-blur-md transition-colors">
      <nav className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          onClick={handleLogoClick}
          className="group flex items-center gap-2.5 text-base font-bold tracking-wide text-white transition-transform duration-200 hover:scale-[1.02]"
        >
          <Image
            src="/brand/logo-emblem.png"
            alt="Logo HIMA TI"
            width={42}
            height={32}
            className="h-8 w-auto transition-transform duration-300 group-hover:rotate-[-6deg]"
          />
          <span className="font-heading tracking-tight">HIMA TI</span>
        </Link>

        <ul className="hidden items-center gap-7 text-sm font-medium text-white/80 md:flex">
          {navLinks.map((item) => (
            <li key={item.id}>
              <a
                href={`/#${item.id}`}
                onClick={(e) => handleNavClick(e, item.id)}
                className="relative py-1 text-white/75 transition-colors duration-200 hover:text-amber-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-amber-400 after:transition-all after:duration-300 hover:after:w-full"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden md:block">
          <button
            type="button"
            onClick={() => scrollToSection("pendaftaran", pathname, router)}
            className="inline-flex items-center justify-center rounded-full bg-amber-400 px-5 py-2 text-sm font-semibold text-zinc-950 shadow-[0_0_20px_-4px_rgba(251,191,36,0.45)] transition-all duration-200 hover:bg-amber-300 hover:shadow-[0_0_28px_-4px_rgba(251,191,36,0.7)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          >
            Gabung
          </button>
        </div>

        <MobileMenu />
      </nav>
      <ScrollProgress />
    </header>
  );
}
