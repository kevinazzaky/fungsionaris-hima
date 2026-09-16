import { DetailHeader } from "@/components/detail/detail-header";
import { HierarchyLadder } from "@/components/fungsionaris/hierarchy-ladder";
import { BalineseDivider, BalineseWatermark } from "@/components/ui/balinese-ornaments";

export default function FungsionarisPage() {
  return (
    <>
      <DetailHeader
        title="Susunan Fungsionaris"
        description="Bagan struktur kepengurusan dan susunan fungsionaris Himpunan Mahasiswa Teknologi Informasi, Universitas Pendidikan Nasional periode 2026."
      />

      <section className="relative overflow-hidden bg-zinc-50/60 py-16 sm:py-24">
        {/* Ornamen Watermark Khas Bali di Latar Belakang */}
        <BalineseWatermark className="-left-20 -top-20 opacity-[0.06] text-amber-600" size={380} />
        <BalineseWatermark className="-right-20 top-1/2 opacity-[0.05] text-amber-600" size={420} />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Header Title dengan Ornamen Bali */}
          <div className="mb-12 text-center">
            <span className="font-script text-2xl italic text-amber-500 sm:text-4xl">
              Susunan
            </span>
            <h2 className="font-heading mt-1 text-3xl font-black uppercase tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl">
              FUNGSIONARIS
            </h2>
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="inline-flex items-center rounded-full border border-amber-400/40 bg-amber-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-700">
                Kabinet Reinvensi 2026
              </span>
            </div>

            {/* Divider Ornamen Padma & Patra Bali */}
            <BalineseDivider className="mt-4" />

            <p className="mx-auto mt-2 max-w-lg text-sm text-zinc-500">
              Struktur bagan tangga kepengurusan HIMA TI Undiknas. Pilih divisi untuk melihat rincian anggota koordinator dan jajarannya.
            </p>
          </div>

          {/* Tangga Susunan Interaktif */}
          <HierarchyLadder />
        </div>
      </section>
    </>
  );
}
