export type Person = {
  name: string;
  role: string;
  photo?: string;
};

export type DivisiData = {
  id: "hh" | "psdm" | "kominfo";
  label: string;
  fullName: string;
  description: string;
  koordinator: Person;
  anggota: Person[];
};

export const PEMBINA: Person = {
  name: "Ir. Made Ari Riska Dayanti, S.T., M.T",
  role: "Pembina HIMA TI",
};

export const KETUA_UMUM: Person = {
  name: "Renald Kevin Azzaky",
  role: "Ketua Umum",
};

export const WAKIL_KETUA: Person = {
  name: "Kadek Wahyu Santika Putra",
  role: "Wakil Ketua",
};

export const SEKRETARIAT: Person[] = [
  { name: "I Made Dedy Wanditya", role: "Sekretaris Umum" },
  { name: "Gusti Ayu Emilia Artika", role: "Sekretaris I" },
  { name: "Komang Bayu Trias Gautama", role: "Sekretaris II" },
];

export const BENDAHARA: Person[] = [
  { name: "Catherine Soenarjo", role: "Bendahara I" },
  { name: "Made Adelia Febriana", role: "Bendahara II" },
];

export const DELEGASI: Person[] = [
  { name: "Ardelia Naenda Ahmadi", role: "Delegasi" },
  { name: "Sad Bagus Ketut Ak", role: "Delegasi" },
];

export const DIVISI_LIST: DivisiData[] = [
  {
    id: "hh",
    label: "Divisi HH",
    fullName: "Divisi Hubungan dan Harmoni",
    description: "Membangun relasi harmonis internal anggota serta menjalin komunikasi antar lembaga.",
    koordinator: {
      name: "Yunima Dioranda Manik",
      role: "Koordinator Divisi HH",
    },
    anggota: [
      { name: "Indriani Asten", role: "Anggota" },
      { name: "A.A Ngurah Agung Mahendra Sedana", role: "Anggota" },
      { name: "I Komang Dika Gus Septa", role: "Anggota" },
      { name: "Gede Bagus Indra Tanaya", role: "Anggota" },
    ],
  },
  {
    id: "psdm",
    label: "Divisi PSDM",
    fullName: "Divisi Pengembangan Sumber Daya Manusia",
    description: "Mengasah potensi kepemimpinan, karakter, dan soft skill seluruh pengurus serta mahasiswa TI.",
    koordinator: {
      name: "Benedito Nidio Da Rosa Maia Tilman",
      role: "Koordinator Divisi PSDM",
    },
    anggota: [
      { name: "Ida Bagus Sugiharta Dharma Putra", role: "Anggota" },
      { name: "Gusti Ngurah Ardana Wijaya", role: "Anggota" },
      { name: "Zintia Adella", role: "Anggota" },
      { name: "Adelia Surya Putri", role: "Anggota" },
      { name: "I Made Dandi Prayata Ardana", role: "Anggota" },
      { name: "Komang Indra Wirawan", role: "Anggota" },
    ],
  },
  {
    id: "kominfo",
    label: "Divisi Kominfo",
    fullName: "Divisi Komunikasi dan Informasi",
    description: "Mengelola media publikasi, desain grafis, dokumentasi, dan teknologi informasi organisasi.",
    koordinator: {
      name: "Cevyn Eduard Imanuel Dapa Talu",
      role: "Koordinator Divisi Kominfo",
    },
    anggota: [
      { name: "Gabriel Jehuda Tamedo", role: "Anggota" },
      { name: "Mochammad Akmal Anfal", role: "Anggota" },
      { name: "Evan Safi Maulana Malik Ibrahim", role: "Anggota" },
      { name: "I Wayan Yoga Karang", role: "Anggota" },
      { name: "Friendly Riantha Dwi Pratama", role: "Anggota" },
    ],
  },
];
