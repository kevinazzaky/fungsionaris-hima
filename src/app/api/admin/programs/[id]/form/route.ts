import { requireAdmin } from "@/data/auth";
import { programRepository } from "@/data/repositories/programs";
import { apiError, assertSameOrigin, assertUuid, readJson } from "@/lib/api-response";
import { saveProgramFormSettings } from "@/use-cases/manage-programs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    await requireAdmin();
    const { id } = await context.params;
    assertUuid(id);
    const data = await readJson(request, 64 * 1024);
    const item = await saveProgramFormSettings(programRepository, id, data);
    return Response.json({ item }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const response = apiError(error);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}
