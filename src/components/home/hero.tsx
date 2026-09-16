import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { HeroSlideshow } from "@/components/home/hero-slideshow";

const heroPhotos = [
  "/gallery/gallery-01.webp",
  "/gallery/gallery-14.webp",
  "/hero/foto-3.jpg",
];

export function Hero() {
  return (
    <section className="relative flex min-h-[90dvh] items-end overflow-hidden bg-zinc-950">
      <HeroSlideshow
        images={heroPhotos}
        alt="Dokumentasi kegiatan Himpunan Mahasiswa Teknologi Informasi"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 via-zinc-950/20 to-transparent" />

      {/* Ambient depth lighting */}
      <div className="pointer-events-none absolute -left-20 top-1/4 h-96 w-96 rounded-full bg-amber-500/15 blur-[128px] animate-pulse-slow" />
      <div className="pointer-events-none absolute -bottom-10 right-10 h-80 w-80 rounded-full bg-amber-400/10 blur-[110px] animate-pulse-slow [animation-delay:3s]" />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-24 pt-24 sm:pb-32">
        <div className="max-w-3xl text-left">
          <div className="flex items-center gap-3">
            <Image
              src="/brand/logo-emblem.png"
              alt="Logo HIMA TI"
              width={84}
              height={64}
              className="animate-fade-up h-12 w-auto [animation-delay:40ms] sm:h-14"
            />
            <div className="animate-fade-up leading-tight [animation-delay:100ms]">
              <p className="font-script text-base italic font-medium text-amber-400">
                Kabinet
              </p>
              <p className="-mt-1 text-xs font-bold uppercase tracking-wide text-white/70">
                Reinvensi
              </p>
            </div>
          </div>

          <h1 className="font-display mt-6 text-3xl font-black uppercase leading-[1.05] tracking-tight text-amber-400 sm:text-5xl lg:text-6xl">
            <span className="animate-fade-up [animation-delay:180ms] block">
              Himpunan Mahasiswa
            </span>
            <span className="animate-fade-up [animation-delay:300ms] block text-white">
              Teknologi Informasi
            </span>
          </h1>

          <p className="animate-fade-up mt-5 max-w-xl text-sm leading-relaxed text-zinc-300 [animation-delay:420ms] sm:text-base">
            Organisasi kemahasiswaan Program Studi Teknologi Informasi
            Universitas Pendidikan Nasional yang berfokus pada pengembangan
            keahlian teknologi, kepemimpinan, dan jejaring kolaboratif.
          </p>

          <div className="animate-fade-up mt-8 flex flex-wrap items-center gap-4 [animation-delay:540ms]">
            <Link
              href="/#pendaftaran"
              className="group inline-flex items-center gap-2 rounded-full bg-amber-400 px-7 py-3.5 text-sm font-bold text-zinc-950 shadow-[0_0_32px_-6px_rgba(251,191,36,0.6)] transition-all duration-200 hover:bg-amber-300 hover:shadow-[0_0_44px_-4px_rgba(251,191,36,0.85)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              Gabung Bersama Kami
              <ArrowRight
                size={16}
                weight="bold"
                className="transition-transform duration-200 group-hover:translate-x-1"
              />
            </Link>
            <Link
              href="/#about"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:border-amber-400 hover:bg-white/10 hover:text-amber-400 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              Tentang Kami
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
