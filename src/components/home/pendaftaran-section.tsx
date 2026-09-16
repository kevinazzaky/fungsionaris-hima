import Link from "next/link";
import { ArrowRight, BellRinging } from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/ui/reveal";
import { FlourishDivider } from "@/components/ui/flourish-divider";
import { REGISTRATION_CONFIG } from "@/lib/pendaftaran-config";

const { isOpen, statusLabel, heroTitle, heroDesc, ctaLabel } = REGISTRATION_CONFIG;

export function PendaftaranSection() {
  return (
    <section id="pendaftaran" className="scroll-mt-16 bg-white py-20 sm:pb-28 sm:pt-20">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="relative overflow-hidden rounded-3xl bg-zinc-950 border border-white/10 shadow-2xl shadow-black/40">
          {/* Ambient glowing orbs */}
          <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-amber-500/15 blur-[100px] animate-pulse-slow" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-amber-400/10 blur-[100px] animate-pulse-slow [animation-delay:3s]" />

          <div className="relative z-10 flex flex-col gap-8 p-10 sm:flex-row sm:items-center sm:justify-between sm:p-14">
            <div className="max-w-lg">
              <Reveal delay={140}>
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider backdrop-blur-md ${
                    isOpen
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border-amber-400/30 bg-amber-400/10 text-amber-400"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isOpen ? "bg-emerald-400" : "bg-amber-400"
                    }`}
                  />
                  {statusLabel}
                </span>
              </Reveal>
              <Reveal delay={240}>
                <h2 className="mt-5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {heroTitle}
                </h2>
              </Reveal>
              <Reveal delay={340}>
                <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                  {heroDesc}
                </p>
              </Reveal>
            </div>

            <Reveal delay={440} className="flex shrink-0 flex-col gap-3 sm:items-end">
              <Link
                href="/pendaftaran"
                className={`group inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold shadow-[0_0_32px_-6px_rgba(251,191,36,0.55)] transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
                  isOpen
                    ? "bg-amber-400 text-zinc-950 hover:bg-amber-300 hover:shadow-[0_0_44px_-4px_rgba(251,191,36,0.85)]"
                    : "border border-white/20 bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {ctaLabel}
                <ArrowRight size={16} weight="bold" className="transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <p className="inline-flex items-center gap-1.5 text-xs text-white/50">
                <BellRinging size={14} />
                Kami akan umumkan lewat Instagram
              </p>
            </Reveal>
          </div>
        </Reveal>

        <Reveal delay={150} className="mt-16">
          <FlourishDivider />
        </Reveal>
      </div>
    </section>
  );
}
