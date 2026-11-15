import Link from "@/components/ui/navigation-link";

export function VotingSection() {
  return (
    <section
      id="home-voting"
      aria-labelledby="home-voting-title"
      className="scroll-mt-16 bg-white px-6 py-10 sm:py-14"
    >
      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-3xl bg-zinc-950 lg:grid-cols-[1.4fr_1fr]">
        <div className="px-7 py-9 sm:px-10 sm:py-12">
          <p className="text-sm font-semibold text-amber-400">
            Pemilihan Ketua HIMA TI Undiknas
          </p>
          <h2
            id="home-voting-title"
            className="font-heading mt-4 max-w-xl text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl"
          >
            Pemilihan Ketua
            <br />
            <span className="text-amber-400">HIMA TI Undiknas</span>
          </h2>
          <p className="mt-5 max-w-lg text-sm leading-relaxed text-zinc-300 sm:text-base">
            Pelajari visi, misi, dan program kerja para calon ketua. Gunakan
            hak pilih Anda untuk menentukan kepengurusan HIMA TI berikutnya.
          </p>
        </div>
        <div className="flex flex-col justify-center border-t border-white/15 bg-white/[0.04] px-7 py-8 sm:px-10 lg:border-l lg:border-t-0">
          <p className="font-heading text-xl font-semibold text-white">
            Informasi dan pemungutan suara
          </p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-300">
            Hak pemberian suara diberikan kepada mahasiswa Teknologi Informasi
            angkatan 2023, 2024, 2025, dan 2026.
          </p>
          <Link
            href="/voting"
            className="mt-6 inline-flex min-h-11 self-start items-center justify-center rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-400"
          >
            Buka halaman pemilihan
          </Link>
          <p className="mt-4 text-xs leading-relaxed text-zinc-300">
            Pemungutan suara mengikuti jadwal yang ditetapkan panitia.
          </p>
        </div>
      </div>
    </section>
  );
}
