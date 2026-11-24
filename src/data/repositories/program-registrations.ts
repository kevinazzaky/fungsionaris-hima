import "server-only";
import { getPrisma } from "@/data/prisma";
import { ValidationError } from "@/domain/admin";
import {
  normalizeProgramFormConfig,
  normalizeStoredCustomResponses,
  resolveCohortQuotaConfig,
} from "@/domain/program-form-config";
import {
  ConflictError,
  NotFoundError,
  validateProgramRegistrationInput,
  type ProgramRegistration,
  type ProgramRegistrationRepository,
} from "@/domain/program-registrations";
import {
  Prisma,
  type ProgramRegistration as ProgramRegistrationRow,
  type ProgramRegistrationMode,
  type ProgramStatus,
} from "@/generated/prisma/client";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function presentRegistration(row: ProgramRegistrationRow): ProgramRegistration {
  return {
    ...row,
    customResponses: normalizeStoredCustomResponses(row.customResponses),
  };
}

export const programRegistrationRepository: ProgramRegistrationRepository = {
  async create(programId, input) {
    if (!UUID_PATTERN.test(programId))
      throw new NotFoundError("Program kerja tidak ditemukan.");
    try {
      return await getPrisma().$transaction(async (tx) => {
        // Lock the program row so concurrent submissions cannot exceed registrationMaxQuota.
        const programs = await tx.$queryRaw<
          {
            id: string;
            status: ProgramStatus;
            registrationMode: ProgramRegistrationMode;
            registrationMaxQuota: number | null;
            registrationFormConfig: unknown;
            isPublished: boolean;
            periodPublished: boolean;
          }[]
        >`
          SELECT
            p.id,
            p.status,
            p."registrationMode",
            p."registrationMaxQuota",
            p."registrationFormConfig",
            p."isPublished",
            pp."isPublished" AS "periodPublished"
          FROM "Program" p
          JOIN "ProgramPeriod" pp ON pp.period = p.period
          WHERE p.id = ${programId}::uuid
          FOR UPDATE OF p
        `;
        const program = programs[0];
        if (!program || !program.isPublished || !program.periodPublished)
          throw new NotFoundError("Program kerja tidak ditemukan.");
        if (program.registrationMode !== "internal")
          throw new ValidationError(
            "Program kerja ini tidak menggunakan pendaftaran melalui formulir website.",
          );
        if (program.status === "upcoming")
          throw new ValidationError(
            "Pendaftaran program kerja ini belum dibuka.",
          );
        if (program.status !== "open")
          throw new ValidationError(
            "Pendaftaran program kerja ini sudah ditutup.",
          );

        const formConfig = normalizeProgramFormConfig(
          program.registrationFormConfig,
        );
        const validated = validateProgramRegistrationInput(input, formConfig);

        if (program.registrationMaxQuota !== null) {
          const registered = await tx.programRegistration.count({
            where: { programId },
          });
          if (registered >= program.registrationMaxQuota)
            throw new ConflictError(
              "Kuota peserta untuk program kerja ini sudah penuh.",
              "quota",
            );
        }
        const cohortConfig = resolveCohortQuotaConfig(formConfig);
        if (cohortConfig.enabled) {
          const tier = cohortConfig.tiers.find(
            (entry) => entry.angkatan === validated.angkatan,
          );
          if (!tier) {
            throw new ValidationError(
              `Pendaftaran program ini hanya dibuka untuk angkatan ${cohortConfig.tiers.map((entry) => entry.angkatan).join(", ")}.`,
            );
          }
          const cohortRegistered = await tx.programRegistration.count({
            where: { programId, angkatan: validated.angkatan },
          });
          if (cohortRegistered >= tier.maxQuota) {
            throw new ConflictError(
              `Kuota pendaftaran untuk angkatan ${tier.angkatan} sudah penuh (maksimal ${tier.maxQuota} peserta).`,
              "quota",
            );
          }
        }
        const created = await tx.programRegistration.create({
          data: {
            programId,
            nama: validated.nama,
            nim: validated.nim,
            angkatan: validated.angkatan,
            noHp: validated.noHp,
            idLine: validated.idLine,
            email: validated.email,
            catatan: validated.catatan,
            customResponses:
              validated.customResponses as unknown as Prisma.InputJsonValue,
          },
        });
        return presentRegistration(created);
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictError(
          "NIM ini sudah terdaftar pada program kerja ini.",
          "duplicate",
        );
      }
      throw error;
    }
  },
  async get(id) {
    if (!UUID_PATTERN.test(id)) return null;
    const row = await getPrisma().programRegistration.findUnique({
      where: { id },
    });
    return row ? presentRegistration(row) : null;
  },
  async list(filter) {
    const programId = filter?.programId?.trim();
    const q = filter?.q?.trim();
    if (programId && !UUID_PATTERN.test(programId)) return [];
    const where: Prisma.ProgramRegistrationWhereInput = {
      ...(programId ? { programId } : {}),
      ...(q
        ? {
            OR: [
              { nama: { contains: q, mode: "insensitive" } },
              { nim: { contains: q } },
              { angkatan: { contains: q } },
              { noHp: { contains: q } },
              { idLine: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const rows = await getPrisma().programRegistration.findMany({
      where,
      include: {
        program: {
          select: { title: true, period: true },
        },
      },
      orderBy: [{ submittedAt: "desc" }, { id: "asc" }],
    });
    return rows.map(({ program, ...row }) => ({
      ...presentRegistration(row),
      programTitle: program.title,
      programPeriod: program.period,
    }));
  },
  async update(id, input) {
    if (!UUID_PATTERN.test(id))
      throw new NotFoundError("Data pendaftar tidak ditemukan.");
    try {
      const updated = await getPrisma().programRegistration.update({
        where: { id },
        data: {
          nama: input.nama,
          nim: input.nim,
          angkatan: input.angkatan,
          noHp: input.noHp,
          idLine: input.idLine,
          email: input.email,
          catatan: input.catatan,
          customResponses: normalizeStoredCustomResponses(
            input.customResponses,
          ) as unknown as Prisma.InputJsonValue,
        },
      });
      return presentRegistration(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002")
          throw new ConflictError(
            "NIM ini sudah terdaftar pada program kerja ini.",
            "duplicate",
          );
        if (error.code === "P2025")
          throw new NotFoundError("Data pendaftar tidak ditemukan.");
      }
      throw error;
    }
  },
  async delete(id) {
    if (!UUID_PATTERN.test(id))
      throw new NotFoundError("Data pendaftar tidak ditemukan.");
    try {
      return presentRegistration(
        await getPrisma().programRegistration.delete({ where: { id } }),
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new NotFoundError("Data pendaftar tidak ditemukan.");
      }
      throw error;
    }
  },
  async countByProgram(programId) {
    if (!UUID_PATTERN.test(programId)) return 0;
    return getPrisma().programRegistration.count({ where: { programId } });
  },
  async countsByProgram() {
    const grouped = await getPrisma().programRegistration.groupBy({
      by: ["programId"],
      _count: { _all: true },
    });
    const counts: Record<string, number> = {};
    for (const row of grouped) counts[row.programId] = row._count._all;
    return counts;
  },
  async countsByCohort(programId) {
    if (!UUID_PATTERN.test(programId)) return {};
    const grouped = await getPrisma().programRegistration.groupBy({
      by: ["angkatan"],
      where: { programId },
      _count: { _all: true },
    });
    const counts: Record<string, number> = {};
    for (const row of grouped) {
      if (row.angkatan) counts[row.angkatan] = row._count._all;
    }
    return counts;
  },
};
