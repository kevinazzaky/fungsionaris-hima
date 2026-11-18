import { ValidationError } from "@/domain/admin";
import {
  ConflictError,
  NotFoundError,
  type ProgramRegistration,
  type ProgramRegistrationListFilter,
  type ProgramRegistrationListItem,
} from "@/domain/program-registrations";
import type { Program } from "@/domain/programs";
import { hasSameOrigin } from "@/domain/request-origin";
import { createProgramRegistrationsWorkbook } from "./program-registrations-export";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const PUBLIC_REGISTRATION_MAX_BYTES = 16 * 1024;
export const ADMIN_REGISTRATION_MAX_BYTES = 32 * 1024;

export class PayloadTooLargeError extends Error {
  constructor(message = "Ukuran data permintaan terlalu besar.") {
    super(message);
    this.name = "PayloadTooLargeError";
  }
}

export class UnsupportedMediaTypeError extends Error {
  constructor(
    message = "Permintaan harus menggunakan Content-Type application/json.",
  ) {
    super(message);
    this.name = "UnsupportedMediaTypeError";
  }
}

export function jsonNoStore(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function isSameOriginRequest(request: Request): boolean {
  return hasSameOrigin(
    request.url,
    request.headers.get("host"),
    request.headers.get("origin"),
  );
}

export function parseUuidParam(value: string, label = "ID"): string {
  if (!UUID_PATTERN.test(value)) {
    throw new ValidationError(`${label} tidak valid.`);
  }
  return value;
}

export async function readJsonBody(
  request: Request,
  maxBytes: number,
  requireJsonContentType: boolean,
): Promise<Record<string, unknown>> {
  if (requireJsonContentType) {
    const mediaType = request.headers
      .get("content-type")
      ?.split(";")[0]
      ?.trim()
      .toLowerCase();
    if (mediaType !== "application/json") {
      throw new UnsupportedMediaTypeError();
    }
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    const declared = Number(contentLength);
    if (Number.isFinite(declared) && declared > maxBytes) {
      throw new PayloadTooLargeError();
    }
  }

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
      throw new PayloadTooLargeError();
    }
    chunks.push(value);
  }
  if (!length) throw new ValidationError("Data permintaan kosong.");

  const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ValidationError("Format data tidak valid.");
  }
  return parsed as Record<string, unknown>;
}

function isAccessDenied(
  error: unknown,
  isAccessError?: (error: unknown) => boolean,
): error is Error {
  return (
    error instanceof Error &&
    (Boolean(isAccessError?.(error)) ||
      error.name === "AccessError" ||
      error.constructor.name === "AccessError")
  );
}

export function handleProgramRegistrationError(
  error: unknown,
  logContext: string,
  isAccessError?: (error: unknown) => boolean,
): Response {
  if (isAccessDenied(error, isAccessError)) {
    return jsonNoStore({ error: error.message }, 401);
  }
  if (error instanceof UnsupportedMediaTypeError) {
    return jsonNoStore({ error: error.message }, 415);
  }
  if (error instanceof PayloadTooLargeError) {
    return jsonNoStore({ error: error.message }, 413);
  }
  if (error instanceof ValidationError || error instanceof SyntaxError) {
    return jsonNoStore(
      {
        error:
          error instanceof SyntaxError
            ? "Format JSON tidak valid."
            : error.message,
      },
      400,
    );
  }
  if (error instanceof NotFoundError) {
    return jsonNoStore({ error: error.message }, 404);
  }
  if (error instanceof ConflictError) {
    return jsonNoStore({ error: error.message, reason: error.reason }, 409);
  }

  console.error(
    logContext,
    error instanceof Error ? error.name : "UnknownError",
  );
  return jsonNoStore(
    {
      error: "Layanan belum dapat memproses permintaan. Silakan coba lagi.",
    },
    500,
  );
}

export function normalizeAdminProgramPayload(
  data: Record<string, unknown>,
  form?: Pick<FormData, "get">,
): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...data };
  if (payload.registrationMode === undefined && form) {
    const mode = form.get("registrationMode");
    if (typeof mode === "string" && mode.trim()) {
      payload.registrationMode = mode;
    }
  }
  if (payload.registrationGroupLink === undefined && form) {
    const groupLink = form.get("registrationGroupLink");
    if (typeof groupLink === "string") {
      payload.registrationGroupLink = groupLink;
    }
  }
  if (payload.registrationMaxQuota === undefined && form) {
    const quota = form.get("registrationMaxQuota");
    if (typeof quota === "string") {
      payload.registrationMaxQuota = quota.trim() === "" ? null : quota;
    }
  } else if (
    typeof payload.registrationMaxQuota === "string" &&
    payload.registrationMaxQuota.trim() === ""
  ) {
    payload.registrationMaxQuota = null;
  }
  return payload;
}

export type PublicProgramRegistrationDeps = {
  isDatabaseConfigured: () => boolean;
  registerProgram: (
    programId: string,
    body: Record<string, unknown>,
  ) => Promise<{
    registration: ProgramRegistration;
    programTitle: string;
    registrationGroupLink: string;
  }>;
};

export async function handlePublicProgramRegistrationPost(
  request: Request,
  deps: PublicProgramRegistrationDeps,
): Promise<Response> {
  try {
    if (!isSameOriginRequest(request)) {
      return jsonNoStore({ error: "Permintaan tidak diizinkan." }, 403);
    }
    if (!deps.isDatabaseConfigured()) {
      return jsonNoStore(
        {
          error:
            "Layanan pendaftaran belum dikonfigurasi. Silakan hubungi panitia HIMA TI.",
        },
        503,
      );
    }
    const body = await readJsonBody(
      request,
      PUBLIC_REGISTRATION_MAX_BYTES,
      true,
    );
    const programId =
      typeof body.programId === "string" ? body.programId : "";
    const result = await deps.registerProgram(programId, body);
    return jsonNoStore(
      {
        registration: {
          id: result.registration.id,
          programId: result.registration.programId,
          nama: result.registration.nama,
          nim: result.registration.nim,
          angkatan: result.registration.angkatan,
          submittedAt: result.registration.submittedAt,
        },
        programTitle: result.programTitle,
        registrationGroupLink: result.registrationGroupLink,
      },
      201,
    );
  } catch (error) {
    return handleProgramRegistrationError(
      error,
      "Public program registration failed:",
    );
  }
}

export type AdminProgramRegistrationsListDeps = {
  requireAdmin: () => Promise<unknown>;
  isAccessError?: (error: unknown) => boolean;
  listProgramRegistrations: (
    filter?: ProgramRegistrationListFilter,
  ) => Promise<ProgramRegistrationListItem[]>;
  getProgramRegistrationCounts: () => Promise<Record<string, number>>;
  listPrograms: () => Promise<Program[]>;
};

export async function handleAdminProgramRegistrationsGet(
  request: Request,
  deps: AdminProgramRegistrationsListDeps,
): Promise<Response> {
  try {
    await deps.requireAdmin();
    const params = new URL(request.url).searchParams;
    const rawProgramId = (params.get("programId") || "").trim();
    const programId = rawProgramId ? parseUuidParam(rawProgramId) : undefined;
    const q = (params.get("q") || "").trim().slice(0, 100) || undefined;

    const [items, counts, programs] = await Promise.all([
      deps.listProgramRegistrations({ programId, q }),
      deps.getProgramRegistrationCounts(),
      deps.listPrograms(),
    ]);
    return jsonNoStore({ items, counts, programs }, 200);
  } catch (error) {
    return handleProgramRegistrationError(
      error,
      "Admin program registrations list failed:",
      deps.isAccessError,
    );
  }
}

export type AdminProgramRegistrationMutationDeps = {
  requireAdmin: () => Promise<unknown>;
  isAccessError?: (error: unknown) => boolean;
  updateProgramRegistration: (
    id: string,
    data: Record<string, unknown>,
  ) => Promise<ProgramRegistration>;
  deleteProgramRegistration: (id: string) => Promise<ProgramRegistration>;
};

export async function handleAdminProgramRegistrationPatch(
  request: Request,
  idOrPromise: string | Promise<string>,
  deps: Pick<
    AdminProgramRegistrationMutationDeps,
    "requireAdmin" | "isAccessError" | "updateProgramRegistration"
  >,
): Promise<Response> {
  try {
    if (!isSameOriginRequest(request)) {
      return jsonNoStore({ error: "Permintaan tidak diizinkan." }, 403);
    }
    await deps.requireAdmin();
    const id = parseUuidParam(await idOrPromise);
    const body = await readJsonBody(
      request,
      ADMIN_REGISTRATION_MAX_BYTES,
      false,
    );
    const item = await deps.updateProgramRegistration(id, body);
    return jsonNoStore({ item }, 200);
  } catch (error) {
    return handleProgramRegistrationError(
      error,
      "Admin program registration update failed:",
      deps.isAccessError,
    );
  }
}

export async function handleAdminProgramRegistrationDelete(
  request: Request,
  idOrPromise: string | Promise<string>,
  deps: Pick<
    AdminProgramRegistrationMutationDeps,
    "requireAdmin" | "isAccessError" | "deleteProgramRegistration"
  >,
): Promise<Response> {
  try {
    if (!isSameOriginRequest(request)) {
      return jsonNoStore({ error: "Permintaan tidak diizinkan." }, 403);
    }
    await deps.requireAdmin();
    const id = parseUuidParam(await idOrPromise);
    await deps.deleteProgramRegistration(id);
    return jsonNoStore({ success: true }, 200);
  } catch (error) {
    return handleProgramRegistrationError(
      error,
      "Admin program registration delete failed:",
      deps.isAccessError,
    );
  }
}

export type AdminProgramRegistrationsExportDeps = {
  requireAdmin: () => Promise<unknown>;
  isAccessError?: (error: unknown) => boolean;
  listProgramRegistrations: (
    filter?: ProgramRegistrationListFilter,
  ) => Promise<ProgramRegistrationListItem[]>;
};

export async function handleAdminProgramRegistrationsExportGet(
  request: Request,
  deps: AdminProgramRegistrationsExportDeps,
): Promise<Response> {
  try {
    await deps.requireAdmin();
    const rawProgramId = (
      new URL(request.url).searchParams.get("programId") || ""
    ).trim();
    const programId = rawProgramId ? parseUuidParam(rawProgramId) : undefined;
    const items = await deps.listProgramRegistrations({ programId });
    const workbook = createProgramRegistrationsWorkbook(items);
    const dateStamp = new Date().toISOString().slice(0, 10);
    return new Response(new Uint8Array(workbook), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="peserta-program-kerja-${dateStamp}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleProgramRegistrationError(
      error,
      "Admin program registrations export failed:",
      deps.isAccessError,
    );
  }
}
