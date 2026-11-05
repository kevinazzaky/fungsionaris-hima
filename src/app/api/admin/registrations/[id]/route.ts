import { requireAdmin } from "@/data/auth";
import { registrationRepository } from "@/data/repositories/registrations";
import { registrationFileUrl, removeFile } from "@/data/supabase/storage";
import {
  apiError,
  assertUuid,
  assertSameOrigin,
  readJson,
} from "@/lib/api-response";
import { REGISTRATION_BUCKET } from "@/lib/backend-config";
import {
  updateRegistration,
  deleteRegistration,
} from "@/use-cases/manage-registrations";
import type { Registration } from "@/domain/admin";
import { buildRegistrationDocument } from "@/use-cases/registration-document";
import { DIVISI_OPTIONS } from "@/lib/pendaftaran-config";

function detailResponse(item: Registration) {
  const { berkasPath, ...data } = item;
  return {
    ...data,
    hasFile: Boolean(berkasPath),
    document: buildRegistrationDocument(item, DIVISI_OPTIONS),
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    assertUuid(id);
    const item = await registrationRepository.detail(id);
    if (!item)
      return Response.json(
        { error: "Pendaftar tidak ditemukan." },
        { status: 404 },
      );
    if (new URL(request.url).searchParams.get("download") === "true") {
      if (!item.berkasPath)
        return Response.json(
          { error: "Berkas belum tersedia di storage." },
          { status: 404 },
        );
      return Response.redirect(await registrationFileUrl(item.berkasPath));
    }
    return Response.json({ item: detailResponse(item) });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    await requireAdmin();
    const { id } = await context.params;
    assertUuid(id);
    const item = await updateRegistration(
      registrationRepository,
      id,
      await readJson(request, 100000),
    );
    return Response.json({ item: detailResponse(item) });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    await requireAdmin();
    const { id } = await context.params;
    assertUuid(id);
    const result = await deleteRegistration(
      registrationRepository,
      {
        remove: (path) => removeFile(REGISTRATION_BUCKET, path),
      },
      id,
    );
    return Response.json({ success: true, ...result });
  } catch (error) {
    return apiError(error);
  }
}
