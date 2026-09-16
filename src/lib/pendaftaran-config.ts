/**
 * Konfigurasi pendaftaran HIMA TI.
 * Ubah REGISTRATION_OPEN ke true/false untuk membuka atau menutup pendaftaran.
 * Perubahan di sini otomatis sinkron ke landing page dan halaman pendaftaran.
 */

export const REGISTRATION_OPEN = false;

export const REGISTRATION_CONFIG = {
  isOpen: REGISTRATION_OPEN,
  statusLabel: REGISTRATION_OPEN ? "Pendaftaran Dibuka" : "Pendaftaran Ditutup",
  statusColor: REGISTRATION_OPEN ? ("green" as const) : ("amber" as const),
  heroTitle: REGISTRATION_OPEN
    ? "Bergabunglah Bersama HIMA TI"
    : "Pendaftaran Belum Dibuka",
  heroDesc: REGISTRATION_OPEN
    ? "Pendaftaran fungsionaris periode 2026 aktif. Pilih divisi yang diminati dan unggah berkas persyaratan."
    : "Periode pendaftaran fungsionaris saat ini belum dibuka karena belum memasuki periode perekrutan. Pengumuman resmi akan disampaikan melalui media sosial kami.",
  ctaLabel: REGISTRATION_OPEN ? "Daftar Fungsionaris" : "Lihat Informasi",
  pageDesc: REGISTRATION_OPEN
    ? "Pendaftaran fungsionaris periode 2026 aktif. Lengkapi formulir pendaftaran dan tentukan pilihan divisi."
    : "Periode pendaftaran saat ini belum dibuka karena belum memasuki periode perekrutan. Pantau kanal informasi resmi kami untuk jadwal seleksi berikutnya.",
} as const;

export const DIVISI_OPTIONS = [
  { id: "inti", label: "Inti", desc: "Pimpinan dan koordinator kepengurusan" },
  { id: "delegasi", label: "Delegasi", desc: "Perwakilan resmi dalam kegiatan eksternal" },
  { id: "hh", label: "HH", desc: "Hubungan dan Harmoni antar anggota" },
  { id: "psdm", label: "PSDM", desc: "Pengembangan Sumber Daya Manusia" },
  { id: "kominfo", label: "Kominfo", desc: "Komunikasi dan Informasi publik" },
];
