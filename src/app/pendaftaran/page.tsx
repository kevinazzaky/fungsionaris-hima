import {
  BellRinging,
  ChatCircleText,
  ClipboardText,
  Megaphone,
} from "@phosphor-icons/react/dist/ssr";
import { DetailHeader } from "@/components/detail/detail-header";

const syarat = [
  "Mahasiswa aktif Program Studi Teknologi Informasi",
  "Mengisi formulir pendaftaran pada periode yang ditentukan",
  "Mengikuti seluruh rangkaian seleksi dan wawancara",
  "Bersedia aktif mengikuti program kerja selama satu periode",
];

const alur = [
  { icon: ClipboardText, title: "Isi Formulir", body: "Lengkapi data diri dan minat divisi melalui formulir resmi." },
  { icon: ChatCircleText, title: "Wawancara", body: "Sesi wawancara singkat bersama tim pengurus." },
  { icon: Megaphone, title: "Pengumuman", body: "Hasil diumumkan lewat grup dan media sosial resmi." },
];

export default function PendaftaranPage() {
  return (
    <>
      <DetailHeader
        title="Pendaftaran Anggota"
        description="Informasi lengkap seputar syarat dan alur pendaftaran anggota baru HIMA TI."
      />

      <section className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
        <div className="flex flex-col gap-4 rounded-2xl bg-zinc-950 p-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-400">
              Pendaftaran ditutup
            </span>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/70">
              Periode pendaftaran saat ini telah berakhir. Ikuti media sosial
              kami agar tidak ketinggalan info periode berikutnya.
            </p>
          </div>
          <BellRinging size={32} weight="bold" className="shrink-0 text-amber-400" />
        </div>

        <h2 className="mt-14 text-xl font-bold text-zinc-900">Syarat Pendaftaran</h2>
        <ul className="mt-6 divide-y divide-zinc-200 border-y border-zinc-200">
          {syarat.map((item) => (
            <li key={item} className="py-3.5 text-sm leading-relaxed text-zinc-600">
              {item}
            </li>
          ))}
        </ul>

        <h2 className="mt-14 text-xl font-bold text-zinc-900">Alur Pendaftaran</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-3">
          {alur.map((step) => (
            <div key={step.title} className="rounded-2xl border border-zinc-200 p-6">
              <step.icon size={24} weight="bold" className="text-amber-500" />
              <h3 className="mt-4 font-bold text-zinc-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
