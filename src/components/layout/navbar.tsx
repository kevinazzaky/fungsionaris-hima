import Link from "next/link";
import Image from "next/image";
import { MobileMenu } from "@/components/layout/mobile-menu";

const navLinks = [
  { href: "/#about", label: "Tentang" },
  { href: "/#program-kerja", label: "Program Kerja" },
  { href: "/#fungsionaris", label: "Fungsionaris" },
  { href: "/#galeri", label: "Galeri" },
  { href: "/#kontak", label: "Kontak" },
];

export function Navbar() {
  return (
    <header className="animate-fade-in sticky top-0 z-50 bg-zinc-950/95 backdrop-blur">
      <nav className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-base font-bold tracking-wide text-white"
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

        <ul className="hidden items-center gap-7 text-sm font-medium text-white/80 md:flex">
          {navLinks.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="transition-colors hover:text-amber-400">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden md:block">
          <Link
            href="/#pendaftaran"
            className="rounded-full bg-amber-400 px-5 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-300"
          >
            Gabung
          </Link>
        </div>

        <MobileMenu />
      </nav>
    </header>
  );
}
