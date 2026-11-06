import { requireAdmin } from "@/data/auth";
import { programRepository } from "@/data/repositories/programs";
import { programPeriodRepository } from "@/data/repositories/program-periods";
import { uploadImage, removeFile } from "@/data/supabase/storage";
import { MEDIA_BUCKET } from "@/lib/backend-config";
import {
  apiError,
  assertSameOrigin,
  assertUuid,
  readForm,
  readJson,
} from "@/lib/api-response";
import { saveProgram, deleteProgram } from "@/use-cases/manage-programs";
import { ValidationError } from "@/domain/admin";

const storage = {
  upload: uploadImage,
  remove: (path: string) => removeFile(MEDIA_BUCKET, path),
};
export async function GET() {
  try {
    await requireAdmin();
    const [items, periods] = await Promise.all([
      programRepository.list(),
      programPeriodRepository.list(),
    ]);
    return Response.json({ items, periods });
  } catch (error) {
    return apiError(error);
  }
}
async function save(request: Request, edit: boolean) {
  try {
    assertSameOrigin(request);
    await requireAdmin();
    const form = await readForm(request);
    const raw = form.get("data");
    if (typeof raw !== "string")
      throw new ValidationError("Data program kosong.");
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data))
      throw new ValidationError("Data program tidak valid.");
    const id = edit ? String(form.get("id") || "") : undefined;
    if (id !== undefined) assertUuid(id);
    const file = form.get("file");
    const item = await saveProgram(
      programRepository,
      storage,
      data as Record<string, unknown>,
      id,
      file instanceof File && file.size ? file : undefined,
      form.get("removeImage") === "true",
    );
    return Response.json({ item }, { status: edit ? 200 : 201 });
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  return save(request, false);
}
export async function PATCH(request: Request) {
  return save(request, true);
}
export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    await requireAdmin();
    const data = await readJson(request, 1024);
    const id = String(data.id || "");
    assertUuid(id);
    await deleteProgram(programRepository, storage, id);
    return Response.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
