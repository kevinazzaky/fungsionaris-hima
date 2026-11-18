import { AccessError, requireAdmin } from "@/data/auth";
import { programRepository } from "@/data/repositories/programs";
import { programRegistrationRepository } from "@/data/repositories/program-registrations";
import {
  handleAdminProgramRegistrationDelete,
  handleAdminProgramRegistrationPatch,
} from "@/lib/program-registrations-api";
import {
  deleteProgramRegistration,
  updateProgramRegistration,
} from "@/use-cases/manage-program-registrations";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  return handleAdminProgramRegistrationPatch(
    request,
    context.params.then((p) => p.id),
    {
      requireAdmin,
      isAccessError: (error) => error instanceof AccessError,
      programRepository,
      updateProgramRegistration: (
        targetId,
        body,
        progRepo = programRepository,
      ) =>
        updateProgramRegistration(
          programRegistrationRepository,
          targetId,
          body,
          progRepo,
        ),
    },
  );
}

export async function DELETE(request: Request, context: Context) {
  return handleAdminProgramRegistrationDelete(
    request,
    context.params.then((p) => p.id),
    {
      requireAdmin,
      isAccessError: (error) => error instanceof AccessError,
      deleteProgramRegistration: (targetId) =>
        deleteProgramRegistration(programRegistrationRepository, targetId),
    },
  );
}
