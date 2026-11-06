import { loadRegistrationSettings } from "@/data/registration-settings";
import { apiError } from "@/lib/api-response";

export async function GET() {
  try {
    return Response.json(await loadRegistrationSettings(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
