import { requireAdmin } from "@/data/auth";
import { programPeriodRepository } from "@/data/repositories/program-periods";
import { apiError, assertSameOrigin, readJson } from "@/lib/api-response";
import { saveProgramPeriod } from "@/use-cases/manage-program-periods";

async function save(request: Request, create: boolean) {
  try {
    assertSameOrigin(request);
    await requireAdmin();
    const period = await saveProgramPeriod(
      programPeriodRepository,
      await readJson(request, 1024),
      create,
    );
    return Response.json({ period }, { status: create ? 201 : 200 });
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  return save(request, true);
}
export async function PATCH(request: Request) {
  return save(request, false);
}
