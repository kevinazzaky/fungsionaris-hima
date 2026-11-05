import { requireAdmin } from "@/data/auth";
import { registrationRepository } from "@/data/repositories/registrations";
import { apiError } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const params = new URL(request.url).searchParams;
    const page = Math.min(
      100000,
      Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1),
    );
    const search = (params.get("search") || "").trim().slice(0, 150);
    const period = (params.get("period") || "").trim().slice(0, 20);
    const result = await registrationRepository.list(
      search,
      page,
      period || undefined,
    );
    const items = result.items.map(
      ({ id, nama, nim, angkatan, divisi, period, source, submittedAt }) => ({
        id,
        nama,
        nim,
        angkatan,
        divisi,
        period,
        source,
        submittedAt,
      }),
    );
    return Response.json({ items, total: result.total, page, pageSize: 25 });
  } catch (error) {
    return apiError(error);
  }
}
