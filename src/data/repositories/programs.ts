import "server-only";
import { getPrisma } from "../prisma";
import { mediaUrl } from "../supabase/storage";
import { ValidationError } from "@/domain/admin";
import { normalizeProgramFormConfig } from "@/domain/program-form-config";
import {
  PROGRAM_ICONS,
  type Program,
  type ProgramRepository,
} from "@/domain/programs";
import { Prisma, type Program as ProgramRow } from "@/generated/prisma/client";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const present = (row: ProgramRow): Program => ({
  id: row.id,
  title: row.title,
  body: row.body,
  fullDescription: row.fullDescription,
  period: row.period,
  executionDate: row.executionDate,
  time: row.time,
  location: row.location,
  status: row.status,
  icon: Object.hasOwn(PROGRAM_ICONS, row.icon)
    ? (row.icon as Program["icon"])
    : "code",
  gformLink: row.gformLink,
  registrationMode: row.registrationMode,
  registrationGroupLink: row.registrationGroupLink,
  registrationMaxQuota: row.registrationMaxQuota,
  registrationFormConfig: normalizeProgramFormConfig(
    row.registrationFormConfig,
  ),
  speakers: row.speakers,
  benefits: row.benefits,
  price: row.price,
  contactPerson: row.contactPerson,
  imagePath: row.imagePath,
  imageUrl: row.imagePath ? mediaUrl(row.imagePath) : null,
  sortOrder: row.sortOrder,
  isPublished: row.isPublished,
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
    if (!UUID_PATTERN.test(id)) return null;
    const row = await getPrisma().program.findUnique({ where: { id } });
    return row ? present(row) : null;
  },
  async getPublished(id) {
    if (!UUID_PATTERN.test(id)) return null;
    const row = await getPrisma().program.findFirst({
      where: {
        id,
        isPublished: true,
        programPeriod: { isPublished: true },
      },
    });
    return row ? present(row) : null;
  },
  async save(input, id, imagePath) {
    const data = {
      ...input,
      registrationFormConfig:
        input.registrationFormConfig as unknown as Prisma.InputJsonValue,
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
    if (!UUID_PATTERN.test(id))
      throw new ValidationError("Program kerja tidak ditemukan.");
    try {
      return present(await getPrisma().program.delete({ where: { id } }));
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      ) {
        throw new ValidationError(
          "Program kerja yang sudah memiliki pendaftar tidak dapat dihapus.",
        );
      }
      throw error;
    }
  },
};
