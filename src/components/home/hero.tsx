import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { HeroSlideshow } from "@/components/home/hero-slideshow";

const heroPhotos = [
  "/hero/foto-1.jpg",
  "/hero/foto-2.jpg",
  "/hero/foto-3.jpg",
];

export function Hero() {
  return (
    <section className="relative flex min-h-[88dvh] items-end overflow-hidden bg-zinc-950">
      <HeroSlideshow
        images={heroPhotos}
        alt="Dokumentasi kegiatan Himpunan Mahasiswa Teknologi Informasi"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/85 via-zinc-950/35 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/70 via-zinc-950/15 to-transparent" />

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
            <Sparkle
              size={16}
              weight="fill"
              className="animate-fade-up text-amber-400 [animation-delay:100ms]"
            />
          </div>

          <h1 className="font-display mt-6 text-3xl font-black uppercase leading-[1.05] tracking-tight text-amber-400 sm:text-5xl">
            <span className="animate-fade-up [animation-delay:150ms] block">
              Himpunan Mahasiswa
            </span>
            <span className="animate-fade-up [animation-delay:280ms] block">
              Teknologi Informasi
            </span>
          </h1>
          <p className="animate-fade-up mt-4 max-w-lg text-sm leading-relaxed text-white/80 [animation-delay:420ms] sm:text-base">
            Wadah kolaborasi mahasiswa TI Universitas Pendidikan Nasional
            untuk berkarya, berorganisasi, dan mengembangkan diri bersama.
          </p>

          <div className="animate-fade-up mt-8 flex flex-wrap items-center gap-4 [animation-delay:550ms]">
            <Link
              href="/#pendaftaran"
              className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-zinc-950 shadow-[0_0_32px_-6px_rgba(251,191,36,0.55)] transition-all hover:bg-amber-300 hover:shadow-[0_0_40px_-4px_rgba(251,191,36,0.75)]"
            >
              Gabung Bersama Kami
              <ArrowRight size={16} weight="bold" />
            </Link>
            <Link
              href="/#about"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-amber-400 hover:text-amber-400"
            >
              Tentang Kami
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
