import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { FlourishDivider } from "@/components/ui/flourish-divider";
import { GlowButton } from "@/components/ui/glow-button";
import { ProgramKerjaTabs } from "@/components/home/program-kerja-tabs";

export function ProgramKerjaSection() {
  return (
    <section id="program-kerja" className="scroll-mt-16 bg-zinc-100 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <FlourishDivider />
        </Reveal>

        <Reveal delay={100} className="mt-8 text-center">
          <SectionHeading script="Program" bold="Kerja" className="text-center" />
          <p className="mx-auto mt-3 max-w-md text-sm text-zinc-500">
            Daftar program kerja dalam naungan HIMA TI
          </p>
        </Reveal>

        <div className="mt-10">
          <ProgramKerjaTabs />
        </div>

        <div className="mt-10 flex justify-center">
          <GlowButton href="/program-kerja">Lihat Semua Program Kerja</GlowButton>
        </div>
      </div>
    </section>
  );
}
