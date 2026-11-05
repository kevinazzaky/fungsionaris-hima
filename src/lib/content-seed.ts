import {
  BENDAHARA,
  DELEGASI,
  DIVISI_LIST,
  KETUA_UMUM,
  PEMBINA,
  SEKRETARIAT,
  WAKIL_KETUA,
} from "./fungsionaris-data";
import { GALLERY_PHOTOS } from "./gallery-data";
import type { GalleryPhoto, Member, MemberGroup } from "../domain/admin";

const groups = [
  ["pembina", [PEMBINA]],
  ["pimpinan", [KETUA_UMUM, WAKIL_KETUA]],
  ["sekretariat", SEKRETARIAT],
  ["bendahara", BENDAHARA],
  ["delegasi", DELEGASI],
  ...DIVISI_LIST.map(
    (division) =>
      [division.id, [division.koordinator, ...division.anggota]] as const,
  ),
] as const;

export const initialMembers: Member[] = groups.flatMap(([group, people]) =>
  people.map((person, index) => ({
    id: `seed-${group}-${index}`,
    name: person.name,
    role: person.role,
    group: group as MemberGroup,
    photoPath: null,
    sortOrder: index,
    isPublished: true,
  })),
);

export const initialGallery: GalleryPhoto[] = GALLERY_PHOTOS.map(
  (path, index) => ({
    id: `seed-gallery-${index}`,
    title: `Dokumentasi kegiatan HIMA TI ${index + 1}`,
    alt: `Dokumentasi kegiatan HIMA TI ${index + 1}`,
    imagePath: path,
    imageUrl: path,
    sortOrder: index,
    isPublished: true,
  }),
);
export const initialHero = [
  "/gallery/gallery-01.webp",
  "/gallery/gallery-14.webp",
  "/hero/foto-3.jpg",
].map((imagePath, index) => ({
  id: `hero-initial-${index + 1}`,
  title: `Foto hero ${index + 1}`,
  alt: "Dokumentasi kegiatan Himpunan Mahasiswa Teknologi Informasi",
  imagePath,
  imageUrl: imagePath,
  sortOrder: index,
  isPublished: true,
}));
