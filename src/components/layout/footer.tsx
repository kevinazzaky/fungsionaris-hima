import Link from "next/link";
import Image from "next/image";
import {
  EnvelopeSimple,
  InstagramLogo,
  MapPin,
  TiktokLogo,
  YoutubeLogo,
} from "@phosphor-icons/react/dist/ssr";

const exploreLinks = [
  { href: "/#about", label: "Tentang" },
  { href: "/#program-kerja", label: "Program Kerja" },
  { href: "/#fungsionaris", label: "Fungsionaris" },
  { href: "/#galeri", label: "Galeri" },
  { href: "/#pendaftaran", label: "Pendaftaran" },
];

const socials = [
  { href: "https://instagram.com/himati.undiknas", label: "Instagram", icon: InstagramLogo },
  { href: "https://tiktok.com/@himati.undiknas", label: "TikTok", icon: TiktokLogo },
  { href: "https://youtube.com/@himatiundiknas", label: "YouTube", icon: YoutubeLogo },
];

export function Footer() {
  return (
    <footer id="kontak" className="scroll-mt-16 bg-zinc-950 text-white">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <Link href="/" className="flex items-center gap-2 text-base font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
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
            Nasional. Organisasi kemahasiswaan pengembang keahlian teknologi
            dan kepemimpinan mahasiswa TI.
          </p>
        </div>

        <div>
          <p className="font-heading text-sm font-semibold text-white">Jelajahi</p>
          <ul className="mt-4 space-y-3 text-sm text-white/60">
            {exploreLinks.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition-colors hover:text-amber-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-heading text-sm font-semibold text-white">Kontak</p>
          <ul className="mt-4 space-y-3 text-sm text-white/60">
            <li className="flex items-start gap-2.5">
              <MapPin size={18} className="mt-0.5 shrink-0 text-amber-400" />
              Kampus Undiknas, Denpasar, Bali
            </li>
            <li className="flex items-start gap-2.5">
              <EnvelopeSimple size={18} className="mt-0.5 shrink-0 text-amber-400" />
              <a
                href="mailto:himati@undiknas.ac.id"
                className="transition-colors hover:text-amber-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400"
              >
                himati@undiknas.ac.id
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
          &copy; {new Date().getFullYear()} HIMA TI Undiknas. Seluruh hak cipta dilindungi.
        </p>
      </div>
    </footer>
  );
}
