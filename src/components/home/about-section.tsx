import { Compass, Target } from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { VisionMissionTabs } from "@/components/detail/vision-mission-tabs";
import { BalineseDivider, BalineseWatermark } from "@/components/ui/balinese-ornaments";

const iconProps = {
  size: 24,
  weight: "bold" as const,
  className: "text-amber-500",
};

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
  { value: "180+", label: "Mahasiswa Aktif TI" },
  { value: "5", label: "Divisi Pengurus" },
  { value: "2026", label: "Periode Aktif" },
];

export function AboutSection() {
  return (
    <section id="about" className="relative overflow-hidden scroll-mt-16 bg-white py-20 sm:py-28">
      {/* Ornamen Watermark Khas Bali */}
      <BalineseWatermark className="-left-20 -top-20 opacity-[0.04] text-amber-600" size={360} />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-2 lg:items-start lg:gap-16">
        <div>
          <Reveal>
            <SectionHeading script="Tentang" bold="Kami" />
            <BalineseDivider className="justify-start py-2 -ml-2 sm:-ml-4" />
          </Reveal>
          <Reveal delay={120}>
            <p className="mt-4 max-w-md text-base leading-relaxed text-zinc-600">
              <span className="font-semibold text-zinc-900">
                Himpunan Mahasiswa Teknologi Informasi (HIMA TI)
              </span>{" "}
              adalah organisasi kemahasiswaan Program Studi Teknologi Informasi
              Universitas Pendidikan Nasional (Undiknas), Denpasar.
            </p>
          </Reveal>
          <Reveal delay={200}>
            <p className="mt-3 max-w-md text-base leading-relaxed text-zinc-600">
              Badan Pengurus HIMA TI mengelola rangkaian program kerja akademik,
              pengembangan keterampilan teknis mahasiswa, serta memfasilitasi
              aspirasi mahasiswa bersama pimpinan program studi.
            </p>
          </Reveal>

          <div className="mt-8 grid grid-cols-3 gap-3.5">
            {stats.map((stat, i) => (
              <Reveal
                key={stat.label}
                delay={280 + i * 80}
                className="group rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-4 text-center transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/50 hover:bg-white hover:shadow-md"
              >
                <p className="font-heading text-xl font-black text-zinc-900 transition-colors duration-200 group-hover:text-amber-500 sm:text-2xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-[11px] font-medium leading-tight text-zinc-500 sm:text-xs">
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
