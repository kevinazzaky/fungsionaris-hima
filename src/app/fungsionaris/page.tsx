import { DetailHeader } from "@/components/detail/detail-header";
import { ProfileAvatar } from "@/components/ui/profile-avatar";

const pimpinan = [
  { name: "Ir. Made Ari Riska Dayanti, S.T., M.T", role: "Pembina" },
  { name: "Renald Kevin Azzaky", role: "Ketua Umum" },
  { name: "Kadek Wahyu Santika Putra", role: "Wakil Ketua" },
  { name: "I Made Dedy Wanditya", role: "Sekretaris Umum" },
  { name: "Gusti Ayu Emilia Artika", role: "Sekretaris I" },
  { name: "Komang Bayu Trias Gautama", role: "Sekretaris II" },
  { name: "Catherine Soenarjo", role: "Bendahara I" },
  { name: "Made Adelia Febriana", role: "Bendahara II" },
];

const delegasi = [
  { name: "Ardelia Naenda Ahmadi", role: "Delegasi" },
  { name: "Sad Bagus Ketut Ak", role: "Delegasi" },
];

const groups = [
  {
    title: "Divisi HH",
    members: [
      { name: "Yunima Dioranda Manik", role: "Koordinator" },
      { name: "Indriani Asten", role: "Anggota" },
      { name: "A.A Ngurah Agung Mahendra Sedana", role: "Anggota" },
      { name: "I Komang Dika Gus Septa", role: "Anggota" },
      { name: "Gede Bagus Indra Tanaya", role: "Anggota" },
    ],
  },
  {
    title: "Divisi PSDM",
    members: [
      { name: "Benedito Nidio Da Rosa Maia Tilman", role: "Koordinator" },
      { name: "Ida Bagus Sugiharta Dharma Putra", role: "Anggota" },
      { name: "Gusti Ngurah Ardana Wijaya", role: "Anggota" },
      { name: "Zintia Adella", role: "Anggota" },
      { name: "Adelia Surya Putri", role: "Anggota" },
      { name: "I Made Dandi Prayata Ardana", role: "Anggota" },
      { name: "Komang Indra Wirawan", role: "Anggota" },
    ],
  },
  {
    title: "Divisi Kominfo",
    members: [
      { name: "Cevyn Eduard Imanuel Dapa Talu", role: "Koordinator" },
      { name: "Gabriel Jehuda Tamedo", role: "Anggota" },
      { name: "Mochammad Akmal Anfal", role: "Anggota" },
      { name: "Evan Safi Maulana Malik Ibrahim", role: "Anggota" },
      { name: "I Wayan Yoga Karang", role: "Anggota" },
      { name: "Friendly Riantha Dwi Pratama", role: "Anggota" },
    ],
  },
];

function PersonCard({ name, role }: { name: string; role: string }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-zinc-100">
      <div className="relative aspect-[3/4] w-full">
        <ProfileAvatar />
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
        <h2 className="text-xl font-bold text-zinc-900">Pimpinan Inti</h2>
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
