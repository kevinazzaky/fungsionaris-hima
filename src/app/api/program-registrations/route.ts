import { programRepository } from "@/data/repositories/programs";
import { programRegistrationRepository } from "@/data/repositories/program-registrations";
import { isDatabaseConfigured } from "@/lib/backend-config";
import { handlePublicProgramRegistrationPost } from "@/lib/program-registrations-api";
import { registerProgram } from "@/use-cases/register-program";

export async function POST(request: Request) {
  return handlePublicProgramRegistrationPost(request, {
    isDatabaseConfigured,
    registerProgram: (programId, body) =>
      registerProgram(
        programRepository,
        programRegistrationRepository,
        programId,
        body,
      ),
  });
}
