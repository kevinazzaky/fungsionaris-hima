import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { GlowButton } from "@/components/ui/glow-button";
import { DivisiList } from "@/components/home/divisi-list";
import { DragScroll } from "@/components/ui/drag-scroll";
import { ProfileAvatar } from "@/components/ui/profile-avatar";

const pengurus = [
  { name: "Renald Kevin Azzaky", role: "Ketua Umum" },
  { name: "Kadek Wahyu Santika Putra", role: "Wakil Ketua" },
  { name: "I Made Dedy Wanditya", role: "Sekretaris Umum" },
  { name: "Gusti Ayu Emilia Artika", role: "Sekretaris I" },
  { name: "Komang Bayu Trias Gautama", role: "Sekretaris II" },
  { name: "Catherine Soenarjo", role: "Bendahara I" },
  { name: "Made Adelia Febriana", role: "Bendahara II" },
];

export function FungsionarisSection() {
  return (
    <section id="fungsionaris" className="scroll-mt-16 bg-zinc-100 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <Reveal>
          <SectionHeading script="Susunan" bold="Fungsionaris" className="text-center" />
        </Reveal>
      </div>

      <DragScroll className="mt-10 flex cursor-grab snap-x snap-mandatory gap-5 overflow-x-auto px-6 pb-4 select-none active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-6 sm:[justify-content:safe_center]">
        {pengurus.map((person, i) => (
          <Reveal
            key={person.name}
            delay={100 + i * 90}
            className="relative aspect-[3/4] w-56 shrink-0 snap-start overflow-hidden rounded-2xl"
          >
            <ProfileAvatar />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 text-left">
              <p className="font-heading font-semibold text-white">{person.name}</p>
              <p className="mt-0.5 text-sm text-white/70">{person.role}</p>
            </div>
          </Reveal>
        ))}
      </DragScroll>

      <Reveal delay={100 + pengurus.length * 90} className="mt-10">
        <DivisiList />
      </Reveal>

      <Reveal
        delay={200 + pengurus.length * 90}
        className="mt-8 flex justify-center px-6"
      >
        <GlowButton href="/fungsionaris">Lihat Semua Fungsionaris</GlowButton>
      </Reveal>
    </section>
  );
}
