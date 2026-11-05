import "server-only";
import { getPrisma } from "../prisma";
import { mediaUrl } from "../supabase/storage";
import {
  PROGRAM_ICONS,
  type Program,
  type ProgramRepository,
} from "@/domain/programs";
import type { Program as ProgramRow } from "@/generated/prisma/client";

const present = (row: ProgramRow): Program => ({
  ...row,
  icon: Object.hasOwn(PROGRAM_ICONS, row.icon)
    ? (row.icon as Program["icon"])
    : "code",
  imageUrl: row.imagePath ? mediaUrl(row.imagePath) : null,
});
export const programRepository: ProgramRepository = {
  async list(publishedOnly = false) {
    return (
      await getPrisma().program.findMany({
        where: publishedOnly
          ? { isPublished: true, programPeriod: { isPublished: true } }
          : {},
        orderBy: [{ period: "desc" }, { sortOrder: "asc" }, { id: "asc" }],
      })
    ).map(present);
  },
  async get(id) {
    const row = await getPrisma().program.findUnique({ where: { id } });
    return row ? present(row) : null;
  },
  async save(input, id, imagePath) {
    const data = {
      ...input,
      ...(imagePath !== undefined ? { imagePath } : {}),
    };
    return getPrisma().$transaction(async (db) => {
      await db.programPeriod.upsert({
        where: { period: input.period },
        create: { period: input.period },
        update: {},
      });
      return present(
        id
          ? await db.program.update({ where: { id }, data })
          : await db.program.create({ data }),
      );
    });
  },
  async delete(id) {
    return present(await getPrisma().program.delete({ where: { id } }));
  },
};
