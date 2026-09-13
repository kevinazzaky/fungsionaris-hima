import { Compass, Target } from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { VisionMissionTabs } from "@/components/detail/vision-mission-tabs";

const iconProps = { size: 24, weight: "bold" as const, className: "text-amber-500" };

const visionMission = [
  {
    key: "visi",
    icon: <Target {...iconProps} />,
    label: "Visi",
    body: "Menjadi wadah pengembangan mahasiswa Teknologi Informasi yang kolaboratif, adaptif, dan berdampak bagi kampus serta masyarakat.",
  },
  {
    key: "misi",
    icon: <Compass {...iconProps} />,
    label: "Misi",
    body: "Menyelenggarakan kegiatan akademik, kompetisi, dan pengabdian masyarakat yang membangun kompetensi dan karakter anggota.",
  },
];

const stats = [
  { value: "180+", label: "Mahasiswa TI" },
  { value: "5", label: "Divisi Pengurus" },
  { value: "2026", label: "Periode Aktif" },
];

export function AboutSection() {
  return (
    <section id="about" className="scroll-mt-16 bg-white py-20 sm:py-28">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-2 lg:items-start lg:gap-16">
        <div>
          <Reveal>
            <SectionHeading script="Tentang" bold="Kami" />
          </Reveal>
          <Reveal delay={120}>
            <p className="mt-4 max-w-md text-base leading-relaxed text-zinc-600">
              <span className="font-semibold text-zinc-900">
                Himpunan Mahasiswa Teknologi Informasi (HIMA TI)
              </span>{" "}
              adalah rumah dan wadah bersama bagi seluruh mahasiswa Program
              Studi Teknologi Informasi Undiknas.
            </p>
          </Reveal>
          <Reveal delay={200}>
            <p className="mt-3 max-w-md text-base leading-relaxed text-zinc-600">
              Untuk menjalankan program kerja dan melayani kebutuhan bersama,
              dibentuklah Badan Pengurus HIMA TI sebagai pengelola kegiatan
              serta jembatan aspirasi antara mahasiswa, dosen, dan institusi
              kampus.
            </p>
          </Reveal>

          <div className="mt-8 grid grid-cols-3 gap-3">
            {stats.map((stat, i) => (
              <Reveal
                key={stat.label}
                delay={280 + i * 80}
                className="rounded-2xl border border-zinc-200 p-4 text-center"
              >
                <p className="text-xl font-bold text-zinc-900 sm:text-2xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-[11px] leading-tight text-zinc-500 sm:text-xs">
                  {stat.label}
                </p>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal delay={160}>
          <VisionMissionTabs tabs={visionMission} />
        </Reveal>
      </div>
    </section>
  );
}
