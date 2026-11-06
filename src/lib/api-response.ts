import "server-only";
import { AccessError } from "@/data/auth";
import { ValidationError } from "@/domain/admin";
import { Prisma } from "@/generated/prisma/client";
import { hasSameOrigin } from "@/domain/request-origin";

export function apiError(error: unknown) {
  if (error instanceof AccessError)
    return Response.json({ error: error.message }, { status: 401 });
  if (error instanceof ValidationError || error instanceof SyntaxError)
    return Response.json({ error: error.message }, { status: 400 });
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002")
      return Response.json(
        { error: "Data sudah terdaftar untuk periode ini." },
        { status: 409 },
      );
    if (error.code === "P2025")
      return Response.json({ error: "Data tidak ditemukan." }, { status: 404 });
  }
  console.error(
    "Admin/backend request failed:",
    error instanceof Error ? error.name : "UnknownError",
  );
  return Response.json(
    { error: "Layanan belum dapat memproses permintaan. Silakan coba lagi." },
    { status: 503 },
  );
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!hasSameOrigin(request.url, request.headers.get("host"), origin))
    throw new AccessError();
}

export function assertUuid(id: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    throw new ValidationError("ID tidak valid.");
}

async function readBody(request: Request, maxBytes: number) {
  const reader = request.body?.getReader();
  if (!reader) throw new ValidationError("Data permintaan kosong.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > maxBytes) {
      await reader.cancel();
      throw new ValidationError(
        "Data terlalu besar. Pecah impor menjadi berkas lebih kecil.",
      );
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function readForm(request: Request) {
  const body = await readBody(request, 4 * 1024 * 1024);
  try {
    return await new Response(new Uint8Array(body), {
      headers: { "Content-Type": request.headers.get("content-type") || "" },
    }).formData();
  } catch {
    throw new ValidationError("Format formulir tidak valid.");
  }
}

export async function readJson(request: Request, maxBytes = 1024 * 1024) {
  const parsed: unknown = JSON.parse(
    (await readBody(request, maxBytes)).toString("utf8"),
  );
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new ValidationError("Format data tidak valid.");
  return parsed as Record<string, unknown>;
}
