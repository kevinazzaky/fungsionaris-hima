import "server-only";
import { getPrisma } from "@/data/prisma";
import type { RegistrationRepository } from "@/domain/repositories";

export const registrationRepository: RegistrationRepository = {
  async existingNims(nims, period) {
    if (nims.length === 0) return [];
    return (
      await getPrisma().registration.findMany({
        where: { nim: { in: nims }, period },
        select: { nim: true },
      })
    ).map((row) => row.nim);
  },
  async insertImported(rows) {
    const result = await getPrisma().registration.createMany({
      data: rows.map((row) => ({ ...row, source: "spreadsheet" })),
      skipDuplicates: true,
    });
    return result.count;
  },
  async list(search, page, period) {
    const where = {
      ...(period ? { period } : {}),
      ...(search
        ? {
            OR: [
              { nama: { contains: search, mode: "insensitive" as const } },
              { nim: { contains: search } },
              { divisi: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await getPrisma().$transaction([
      getPrisma().registration.findMany({
        where,
        select: {
          id: true,
          nama: true,
          nim: true,
          angkatan: true,
          divisi: true,
          period: true,
          source: true,
          submittedAt: true,
        },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        skip: (page - 1) * 25,
        take: 25,
      }),
      getPrisma().registration.count({ where }),
    ]);
    return { items, total };
  },
  detail: (id) => getPrisma().registration.findUnique({ where: { id } }),
  update: (id, input, period) =>
    getPrisma().registration.update({
      where: { id },
      data: { ...input, period },
    }),
  delete: (id) => getPrisma().registration.delete({ where: { id } }),
  create: (input, period, file) =>
    getPrisma().registration.create({
      data: {
        ...input,
        period,
        submittedAt: new Date(),
        ...(file
          ? { berkas: file.name, berkasPath: file.path, berkasSize: file.size }
          : {}),
      },
      select: { id: true },
    }),
  exportAll: () =>
    getPrisma().registration.findMany({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
};
