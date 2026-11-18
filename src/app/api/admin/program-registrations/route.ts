import { AccessError, requireAdmin } from "@/data/auth";
import { programRepository } from "@/data/repositories/programs";
import { programRegistrationRepository } from "@/data/repositories/program-registrations";
import { handleAdminProgramRegistrationsGet } from "@/lib/program-registrations-api";
import {
  getProgramRegistrationCounts,
  listProgramRegistrations,
} from "@/use-cases/manage-program-registrations";

export async function GET(request: Request) {
  return handleAdminProgramRegistrationsGet(request, {
    requireAdmin,
    isAccessError: (error) => error instanceof AccessError,
    listProgramRegistrations: (filter) =>
      listProgramRegistrations(programRegistrationRepository, filter),
    getProgramRegistrationCounts: () =>
      getProgramRegistrationCounts(programRegistrationRepository),
    listPrograms: () => programRepository.list(false),
  });
}
