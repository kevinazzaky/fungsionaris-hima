import "server-only";
import { getPrisma } from "../prisma";
import type { ProgramPeriodRepository } from "@/domain/programs";

export const programPeriodRepository: ProgramPeriodRepository = {
  list: () =>
    getPrisma().programPeriod.findMany({
      orderBy: { period: "desc" },
      select: { period: true, isPublished: true },
    }),
  create: (input) => getPrisma().programPeriod.create({ data: input }),
  setPublished: (input) =>
    getPrisma().programPeriod.update({
      where: { period: input.period },
      data: { isPublished: input.isPublished },
    }),
};
