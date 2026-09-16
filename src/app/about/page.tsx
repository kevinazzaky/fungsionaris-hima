import Image from "next/image";
import { Compass, HandHeart, Target } from "@phosphor-icons/react/dist/ssr";
import { DetailHeader } from "@/components/detail/detail-header";
import { VisionMissionTabs } from "@/components/detail/vision-mission-tabs";

const iconProps = { size: 24, weight: "bold" as const, className: "text-amber-500" };

const values = [
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
  {
    key: "nilai",
    icon: <HandHeart {...iconProps} />,
    label: "Nilai",
    body: "Kolaborasi, integritas, dan semangat belajar berkelanjutan menjadi landasan setiap kegiatan yang kami jalankan.",
  },
];

export default function AboutPage() {
  return (
    <>
      <DetailHeader
        title="Tentang HIMA TI"
        description="Mengenal lebih dekat organisasi kemahasiswaan Program Studi Teknologi Informasi, Universitas Pendidikan Nasional."
      />

      <section className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-100 shadow-sm">
          <Image
            src="/gallery/gallery-01.webp"
            alt="Dokumentasi kegiatan dan rapat kerja HIMA TI Undiknas"
            fill
            sizes="(min-width: 768px) 800px, 100vw"
            className="object-cover"
          />
        </div>

        <div className="mt-10 max-w-2xl">
          <h2 className="text-2xl font-bold text-zinc-900">Sejarah &amp; Peran Organisasi</h2>
          <p className="mt-4 text-base leading-relaxed text-zinc-600">
            Himpunan Mahasiswa Teknologi Informasi (HIMA TI) didirikan sebagai badan perwakilan mahasiswa Program Studi Teknologi Informasi di lingkungan Universitas Pendidikan Nasional, Denpasar. Organisasi ini mengoordinasikan berbagai kegiatan akademik, lokakarya teknologi, kompetisi bidang IT, dan program pengabdian masyarakat yang melibatkan mahasiswa aktif di setiap angkatan.
          </p>
        </div>

        <div className="mt-14">
          <VisionMissionTabs tabs={values} />
        </div>
      </section>
    </>
  );
}
