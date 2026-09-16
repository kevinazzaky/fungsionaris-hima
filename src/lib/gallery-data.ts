// Urutan foto galeri diacak secara merata antar-kegiatan/periode
// agar setiap batch (misal 8 atau 12 foto pertama) menampilkan ragam kegiatan yang seimbang.
// Catatan: Foto 15 dan 22 sudah dihapus oleh pengguna sehingga dikeluarkan dari daftar (total 36 foto).
const SHUFFLED_PHOTO_IDS = [
  29, 4, 17, 37, 2, 20, 32, 11,
  16, 34, 6, 30, 14, 23, 27, 5,
  19, 35, 7, 25, 8, 24, 33, 1,
  18, 31, 10, 21, 38, 12, 26, 9,
  36, 13, 28, 3,
];

export const GALLERY_PHOTOS: string[] = SHUFFLED_PHOTO_IDS.map(
  (id) => `/gallery/gallery-${String(id).padStart(2, "0")}.webp`,
);
