import Image from "next/image";
import { DetailHeader } from "@/components/detail/detail-header";

const pembina = {
  name: "Ir. Made Ari Riska Dayanti, S.T., M.T",
  role: "Pembina",
  seed: "hima-ti-pembina-1",
};

const pimpinan = [
  { name: "Renald Kevin Azzaky", role: "Ketua Umum", seed: "hima-ti-pimpinan-1" },
  { name: "Kadek Wahyu Santika Putra", role: "Wakil Ketua", seed: "hima-ti-pimpinan-2" },
  { name: "I Made Dedy Wanditya", role: "Sekretaris Umum", seed: "hima-ti-pimpinan-3" },
  { name: "Gusti Ayu Emilia Artika", role: "Sekretaris I", seed: "hima-ti-pimpinan-4" },
  { name: "Komang Bayu Trias Gautama", role: "Sekretaris II", seed: "hima-ti-pimpinan-5" },
  { name: "Catherine Soenarjo", role: "Bendahara I", seed: "hima-ti-pimpinan-6" },
  { name: "Made Adelia Febriana", role: "Bendahara II", seed: "hima-ti-pimpinan-7" },
];

const delegasi = [
  { name: "Ardelia Naenda Ahmadi", role: "Delegasi", seed: "hima-ti-delegasi-1" },
  { name: "Sad Bagus Ketut Ak", role: "Delegasi", seed: "hima-ti-delegasi-2" },
];

const groups = [
  {
    title: "Divisi HH",
    members: [
      { name: "Yunima Dioranda Manik", role: "Koordinator", seed: "hima-ti-hh-1" },
      { name: "Indriani Asten", role: "Anggota", seed: "hima-ti-hh-2" },
      { name: "A.A Ngurah Agung Mahendra Sedana", role: "Anggota", seed: "hima-ti-hh-3" },
      { name: "I Komang Dika Gus Septa", role: "Anggota", seed: "hima-ti-hh-4" },
      { name: "Gede Bagus Indra Tanaya", role: "Anggota", seed: "hima-ti-hh-5" },
    ],
  },
  {
    title: "Divisi PSDM",
    members: [
      { name: "Benedito Nidio Da Rosa Maia Tilman", role: "Koordinator", seed: "hima-ti-psdm-1" },
      { name: "Ida Bagus Sugiharta Dharma Putra", role: "Anggota", seed: "hima-ti-psdm-2" },
      { name: "Gusti Ngurah Ardana Wijaya", role: "Anggota", seed: "hima-ti-psdm-3" },
      { name: "Zintia Adella", role: "Anggota", seed: "hima-ti-psdm-4" },
      { name: "Adelia Surya Putri", role: "Anggota", seed: "hima-ti-psdm-5" },
      { name: "I Made Dandi Prayata Ardana", role: "Anggota", seed: "hima-ti-psdm-6" },
      { name: "Komang Indra Wirawan", role: "Anggota", seed: "hima-ti-psdm-7" },
    ],
  },
  {
    title: "Divisi Kominfo",
    members: [
      { name: "Cevyn Eduard Imanuel Dapa Talu", role: "Koordinator", seed: "hima-ti-kominfo-1" },
      { name: "Gabriel Jehuda Tamedo", role: "Anggota", seed: "hima-ti-kominfo-2" },
      { name: "Mochammad Akmal Anfal", role: "Anggota", seed: "hima-ti-kominfo-3" },
      { name: "Evan Safi Maulana Malik Ibrahim", role: "Anggota", seed: "hima-ti-kominfo-4" },
      { name: "I Wayan Yoga Karang", role: "Anggota", seed: "hima-ti-kominfo-5" },
      { name: "Friendly Riantha Dwi Pratama", role: "Anggota", seed: "hima-ti-kominfo-6" },
    ],
  },
];

function PersonCard({
  name,
  role,
  seed,
}: {
  name: string;
  role: string;
  seed: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-zinc-100">
      <div className="relative aspect-[3/4] w-full">
        <Image
          src={`https://picsum.photos/seed/${seed}/500/650`}
          alt={name}
          fill
          sizes="(min-width: 640px) 22vw, 45vw"
          className="object-cover"
        />
      </div>
      <div className="p-3.5">
        <p className="text-sm font-semibold text-zinc-900">{name}</p>
        <p className="mt-0.5 text-xs text-zinc-500">{role}</p>
      </div>
    </div>
  );
}

export default function FungsionarisPage() {
  return (
    <>
      <DetailHeader
        title="Fungsionaris"
        description="Susunan kepengurusan Himpunan Mahasiswa Program Studi Teknologi Informasi, Undiknas Denpasar."
      />

      <section className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
        <h2 className="text-xl font-bold text-zinc-900">Pembina</h2>
        <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-4">
          <PersonCard {...pembina} />
        </div>

        <h2 className="mt-16 text-xl font-bold text-zinc-900">Pimpinan Inti</h2>
        <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-4">
          {pimpinan.map((person) => (
            <PersonCard key={person.name} {...person} />
          ))}
        </div>

        <h2 className="mt-16 text-xl font-bold text-zinc-900">Delegasi</h2>
        <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-4">
          {delegasi.map((person) => (
            <PersonCard key={person.name} {...person} />
          ))}
        </div>

        {groups.map((group) => (
          <div key={group.title}>
            <h2 className="mt-16 text-xl font-bold text-zinc-900">
              {group.title}
            </h2>
            <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-4">
              {group.members.map((person) => (
                <PersonCard key={person.name} {...person} />
              ))}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
