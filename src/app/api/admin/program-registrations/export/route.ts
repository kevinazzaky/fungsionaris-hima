import { AccessError, requireAdmin } from "@/data/auth";
import { programRegistrationRepository } from "@/data/repositories/program-registrations";
import { handleAdminProgramRegistrationsExportGet } from "@/lib/program-registrations-api";
import { listProgramRegistrations } from "@/use-cases/manage-program-registrations";

export async function GET(request: Request) {
  return handleAdminProgramRegistrationsExportGet(request, {
    requireAdmin,
    isAccessError: (error) => error instanceof AccessError,
    listProgramRegistrations: (filter) =>
      listProgramRegistrations(programRegistrationRepository, filter),
  });
}
