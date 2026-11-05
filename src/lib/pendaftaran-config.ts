export const LINE_GROUP_URL = "https://line.me/ti/g/NGMA8UNN6k";

export function registrationConfig(isOpen: boolean, period = "2026") {
  return {
    isOpen,
    statusLabel: isOpen ? "Pendaftaran Dibuka" : "Pendaftaran Ditutup",
    statusColor: isOpen ? ("green" as const) : ("amber" as const),
    heroTitle: isOpen
      ? "Bergabunglah Bersama HIMA TI"
      : "Pendaftaran Sedang Ditutup",
    heroDesc: isOpen
      ? `Pendaftaran fungsionaris periode ${period} aktif. Pilih divisi yang diminati dan unggah berkas persyaratan.`
      : "Informasi pembukaan pendaftaran akan diumumkan melalui kanal resmi HIMA TI.",
    ctaLabel: isOpen ? "Daftar Fungsionaris" : "Lihat Informasi",
    pageDesc: isOpen
      ? `Pendaftaran fungsionaris periode ${period} aktif. Lengkapi formulir pendaftaran dan tentukan pilihan divisi.`
      : "Pendaftaran fungsionaris sedang ditutup. Pantau kanal informasi resmi HIMA TI untuk pengumuman berikutnya.",
  };
}

export const DIVISI_OPTIONS = [
  { id: "inti", label: "Inti", desc: "Pimpinan dan koordinator kepengurusan" },
  {
    id: "delegasi",
    label: "Delegasi",
    desc: "Perwakilan resmi dalam kegiatan eksternal",
  },
  { id: "hh", label: "HH", desc: "Hubungan dan Harmoni antar anggota" },
  { id: "psdm", label: "PSDM", desc: "Pengembangan Sumber Daya Manusia" },
  { id: "kominfo", label: "Kominfo", desc: "Komunikasi dan Informasi publik" },
];
