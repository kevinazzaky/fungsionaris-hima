import { DIVISI_OPTIONS } from "@/lib/pendaftaran-config";
import { isBackendConfigured, REGISTRATION_BUCKET } from "@/lib/backend-config";
import { apiError, assertSameOrigin, readForm } from "@/lib/api-response";
import { registrationRepository } from "@/data/repositories/registrations";
import { removeFile, uploadRegistrationFile } from "@/data/supabase/storage";
import { ValidationError } from "@/domain/admin";
import { register } from "@/use-cases/register";
import { registrationSettingsRepository } from "@/data/repositories/registration-settings";
export { GET } from "@/app/api/admin/registrations/route";

export async function POST(request: Request) {
  try {
    if (!isBackendConfigured())
      return Response.json(
        {
          error:
            "Layanan pendaftaran sedang disiapkan. Silakan hubungi pengurus HIMA TI.",
        },
        { status: 503 },
      );
    assertSameOrigin(request);
    if (!(await registrationSettingsRepository.get()).isOpen)
      return Response.json(
        { error: "Pendaftaran saat ini sedang ditutup." },
        { status: 403 },
      );
    const form = await readForm(request);
    const divisi = form.getAll("divisi");
    const allowed = DIVISI_OPTIONS.map((option) => option.id as string);
    if (
      !divisi.length ||
      divisi.some(
        (value) => typeof value !== "string" || !allowed.includes(value),
      )
    ) {
      throw new ValidationError("Pilih minimal satu divisi yang tersedia.");
    }
    const input = Object.fromEntries(form.entries());
    input.divisi = [...new Set(divisi)].join(", ");
    const uploaded = form.get("berkas");
    const file =
      uploaded instanceof File && uploaded.size > 0 ? uploaded : null;
    const entry = await register(
      registrationRepository,
      {
        upload: uploadRegistrationFile,
        remove: (path) => removeFile(REGISTRATION_BUCKET, path),
      },
      input,
      process.env.REGISTRATION_PERIOD || "2026",
      file,
    );
    return Response.json({ success: true, id: entry.id }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
