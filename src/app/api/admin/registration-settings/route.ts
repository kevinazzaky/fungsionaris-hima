import { requireAdmin } from "@/data/auth";
import { registrationSettingsRepository } from "@/data/repositories/registration-settings";
import { apiError, assertSameOrigin, readJson } from "@/lib/api-response";
import { setRegistrationOpen } from "@/use-cases/registration-settings";

export async function GET() {
  try {
    await requireAdmin();
    return Response.json(await registrationSettingsRepository.get());
  } catch (error) {
    return apiError(error);
  }
}
export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    await requireAdmin();
    return Response.json(
      await setRegistrationOpen(
        registrationSettingsRepository,
        await readJson(request, 1024),
      ),
    );
  } catch (error) {
    return apiError(error);
  }
}
