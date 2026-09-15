import Link from "next/link";
import { ArrowRight, BellRinging, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/ui/reveal";
import { FlourishDivider } from "@/components/ui/flourish-divider";
import { REGISTRATION_CONFIG } from "@/lib/pendaftaran-config";

const { isOpen, statusLabel, heroTitle, heroDesc, ctaLabel } = REGISTRATION_CONFIG;

export function PendaftaranSection() {
  return (
    <section id="pendaftaran" className="scroll-mt-16 bg-white py-20 sm:pb-28 sm:pt-20">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="overflow-hidden rounded-3xl bg-zinc-950">
          <div className="flex flex-col gap-8 p-10 sm:flex-row sm:items-center sm:justify-between sm:p-14">
            <div className="max-w-lg">
              <Reveal delay={140}>
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                    isOpen
                      ? "border-green-400/40 text-green-400"
                      : "border-amber-400/40 text-amber-400"
                  }`}
                >
                  {isOpen ? (
                    <CheckCircle size={12} weight="fill" />
                  ) : (
                    <BellRinging size={12} weight="fill" />
                  )}
                  {statusLabel}
                </span>
              </Reveal>
              <Reveal delay={240}>
                <h2 className="mt-5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {heroTitle}
                </h2>
              </Reveal>
              <Reveal delay={340}>
                <p className="mt-3 text-sm leading-relaxed text-white/70">
                  {heroDesc}
                </p>
              </Reveal>
            </div>

            <Reveal delay={440} className="flex shrink-0 flex-col gap-3 sm:items-end">
              <Link
                href="/pendaftaran"
                className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-zinc-950 shadow-[0_0_32px_-6px_rgba(251,191,36,0.55)] transition-all hover:shadow-[0_0_40px_-4px_rgba(251,191,36,0.75)] ${
                  isOpen
                    ? "bg-amber-400 hover:bg-amber-300"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {ctaLabel}
                <ArrowRight size={16} weight="bold" />
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
