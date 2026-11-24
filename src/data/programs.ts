import "server-only";
import { connection } from "next/server";
import type { Program } from "@/domain/programs";
import { isDatabaseConfigured } from "@/lib/backend-config";
import { initialPrograms } from "@/lib/program-seed";
import { programRepository } from "./repositories/programs";
import { programRegistrationRepository } from "./repositories/program-registrations";

export type PublicProgramRegistrationPageData = {
  program: Program | null;
  registeredCount: number;
  cohortCounts: Record<string, number>;
  configured: boolean;
};

// Strip private group invite links from public pre-registration reads.
const toPublicProgram = (program: Program): Program => ({
  ...program,
  registrationGroupLink: "",
});

export async function loadPrograms(): Promise<Program[]> {
  if (!isDatabaseConfigured()) return initialPrograms.map(toPublicProgram);
  await connection();
  return (await programRepository.list(true)).map(toPublicProgram);
}

export async function loadProgramRegistrationPage(
  id: string,
): Promise<PublicProgramRegistrationPageData> {
  if (!isDatabaseConfigured()) {
    const match = initialPrograms.find(
      (item) => item.id === id && item.isPublished,
    );
    return {
      program: match ? toPublicProgram(match) : null,
      registeredCount: 0,
      cohortCounts: {},
      configured: false,
    };
  }
  await connection();
  const program = await programRepository.getPublished(id);
  if (!program) {
    return {
      program: null,
      registeredCount: 0,
      cohortCounts: {},
      configured: true,
    };
  }
  const [registeredCount, cohortCounts] = await Promise.all([
    programRegistrationRepository.countByProgram(program.id),
    programRegistrationRepository.countsByCohort(program.id),
  ]);
  return {
    program: toPublicProgram(program),
    registeredCount,
    cohortCounts,
    configured: true,
  };
}
