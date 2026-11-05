import "server-only";
import { getPrisma } from "@/data/prisma";
import { mediaUrl } from "@/data/supabase/storage";
import type { ContentRepository } from "@/domain/repositories";
import type { GalleryPhoto, Member } from "@/domain/admin";
import type {
  GalleryPhoto as PhotoRow,
  Member as MemberRow,
} from "@/generated/prisma/client";

function member(row: MemberRow): Member {
  return { ...row, photo: row.photoPath ? mediaUrl(row.photoPath) : undefined };
}
function photo(row: PhotoRow): GalleryPhoto {
  return { ...row, imageUrl: mediaUrl(row.imagePath) };
}

export function contentRepository(
  publishedOnly = false,
  photoKind: "gallery" | "hero" = "gallery",
): ContentRepository {
  const where = publishedOnly ? { isPublished: true } : {};
  return {
    async members() {
      return (
        await getPrisma().member.findMany({
          where,
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        })
      ).map(member);
    },
    async gallery() {
      const query = {
        where,
        orderBy: [{ sortOrder: "asc" as const }, { id: "asc" as const }],
      };
      const rows =
        photoKind === "hero"
          ? await getPrisma().heroSlide.findMany(query)
          : await getPrisma().galleryPhoto.findMany(query);
      return rows.map(photo);
    },
    async member(id) {
      const row = await getPrisma().member.findUnique({ where: { id } });
      return row ? member(row) : null;
    },
    async photo(id) {
      const row =
        photoKind === "hero"
          ? await getPrisma().heroSlide.findUnique({ where: { id } })
          : await getPrisma().galleryPhoto.findUnique({ where: { id } });
      return row ? photo(row) : null;
    },
    async saveMember(input, id, photoPath) {
      const data = {
        ...input,
        ...(photoPath !== undefined ? { photoPath } : {}),
      };
      return member(
        id
          ? await getPrisma().member.update({ where: { id }, data })
          : await getPrisma().member.create({ data }),
      );
    },
    async savePhoto(input, id, imagePath) {
      if (id) {
        const args = {
          where: { id },
          data: { ...input, ...(imagePath ? { imagePath } : {}) },
        };
        return photo(
          photoKind === "hero"
            ? await getPrisma().heroSlide.update(args)
            : await getPrisma().galleryPhoto.update(args),
        );
      }
      if (!imagePath) throw new Error("Foto wajib diunggah.");
      const args = { data: { ...input, imagePath } };
      return photo(
        photoKind === "hero"
          ? await getPrisma().heroSlide.create(args)
          : await getPrisma().galleryPhoto.create(args),
      );
    },
    async deleteMember(id) {
      await getPrisma().member.delete({ where: { id } });
    },
    async deletePhoto(id) {
      if (photoKind === "hero")
        await getPrisma().heroSlide.delete({ where: { id } });
      else await getPrisma().galleryPhoto.delete({ where: { id } });
    },
  };
}
