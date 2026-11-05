import { requireAdmin } from "@/data/auth";
import { contentRepository } from "@/data/repositories/content";
import { removeFile, uploadImage } from "@/data/supabase/storage";
import { ValidationError } from "@/domain/admin";
import {
  apiError,
  assertSameOrigin,
  assertUuid,
  readJson,
  readForm,
} from "@/lib/api-response";
import { MEDIA_BUCKET } from "@/lib/backend-config";
import {
  deleteContent,
  saveGalleryPhoto,
  saveMember,
} from "@/use-cases/manage-content";

type Context = { params: Promise<{ collection: string }> };
const storage = {
  upload: uploadImage,
  remove: (path: string) => removeFile(MEDIA_BUCKET, path),
};

async function collection(context: Context) {
  const { collection } = await context.params;
  if (collection !== "members" && collection !== "gallery" && collection !== "hero")
    throw new ValidationError("Jenis konten tidak dikenal.");
  return collection;
}

export async function GET(_request: Request, context: Context) {
  try {
    await requireAdmin();
    const kind = await collection(context);
    const repo = contentRepository(false, kind === "hero" ? "hero" : "gallery");
    return Response.json({
      items: await (kind === "members" ? repo.members() : repo.gallery()),
    });
  } catch (error) {
    return apiError(error);
  }
}

async function save(request: Request, context: Context, edit: boolean) {
  try {
    assertSameOrigin(request);
    await requireAdmin();
    const kind = await collection(context);
    const form = await readForm(request);
    const raw = form.get("data");
    if (typeof raw !== "string")
      throw new ValidationError("Data konten kosong.");
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data))
      throw new ValidationError("Data konten tidak valid.");
    const input = data as Record<string, unknown>;
    const id = edit ? String(form.get("id") ?? "") : undefined;
    if (id !== undefined) assertUuid(id);
    const uploaded = form.get("file");
    const file =
      uploaded instanceof File && uploaded.size ? uploaded : undefined;
    const repo = contentRepository(false, kind === "hero" ? "hero" : "gallery");
    const item =
      kind === "members"
        ? await saveMember(
            repo,
            storage,
            input,
            id,
            file,
            form.get("removePhoto") === "true",
          )
        : await saveGalleryPhoto(repo, storage, input, id, file, kind === "hero" ? "hero" : "gallery");
    return Response.json({ item }, { status: edit ? 200 : 201 });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, context: Context) {
  return save(request, context, false);
}
export async function PATCH(request: Request, context: Context) {
  return save(request, context, true);
}

export async function DELETE(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    await requireAdmin();
    const kind = await collection(context);
    const data = await readJson(request, 1024);
    const id = String(data.id ?? "");
    assertUuid(id);
    await deleteContent(contentRepository(false, kind === "hero" ? "hero" : "gallery"), storage, kind, id);
    return Response.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
