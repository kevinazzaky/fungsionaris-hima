import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import * as XLSX from "xlsx";
import { ValidationError } from "../src/domain/admin";
import {
  DEFAULT_PROGRAM_FORM_CONFIG,
  type ProgramFormConfig,
} from "../src/domain/program-form-config";
import {
  validateProgram,
  type Program,
  type ProgramRepository,
} from "../src/domain/programs";
import {
  ConflictError,
  NotFoundError,
  type ProgramRegistration,
  type ProgramRegistrationListItem,
  type ProgramRegistrationRepository,
} from "../src/domain/program-registrations";
import {
  ADMIN_REGISTRATION_MAX_BYTES,
  handleAdminProgramRegistrationDelete,
  handleAdminProgramRegistrationPatch,
  handleAdminProgramRegistrationsExportGet,
  handleAdminProgramRegistrationsGet,
  handlePublicProgramRegistrationPost,
  normalizeAdminProgramPayload,
  PUBLIC_REGISTRATION_MAX_BYTES,
} from "../src/lib/program-registrations-api";
import {
  createProgramRegistrationsWorkbook,
  PROGRAM_REGISTRATION_EXPORT_HEADERS,
  sanitizeSpreadsheetText,
} from "../src/lib/program-registrations-export";
import { initialPrograms } from "../src/lib/program-seed";
import {
  deleteProgramRegistration,
  getProgramRegistrationCounts,
  listProgramRegistrations,
  updateProgramRegistration,
} from "../src/use-cases/manage-program-registrations";
import { registerProgram } from "../src/use-cases/register-program";

class FakeAccessError extends Error {
  constructor() {
    super("Silakan masuk menggunakan akun admin.");
    this.name = "AccessError";
  }
}

const PROGRAM_ID = "11111111-1111-4111-8111-111111111111";
const REG_ID = "22222222-2222-4222-8222-222222222222";

const baseProgram: Program = {
  id: PROGRAM_ID,
  title: "IT Versary & Sertijab 2026",
  body: "Perayaan tahunan Program Studi Teknologi Informasi.",
  fullDescription: "",
  period: "2025/2026",
  executionDate: "Akan diumumkan panitia",
  time: "Menyesuaikan Jadwal",
  location: "Akan diumumkan panitia",
  status: "open",
  icon: "cake",
  gformLink: "",
  registrationMode: "internal",
  registrationGroupLink: "https://line.me/ti/g/group-invite",
  registrationMaxQuota: 2,
  registrationFormConfig: DEFAULT_PROGRAM_FORM_CONFIG,
  speakers: [],
  benefits: [],
  price: "",
  contactPerson: "",
  imagePath: null,
  imageUrl: null,
  sortOrder: 4,
  isPublished: true,
};

const validPayload = {
  programId: PROGRAM_ID,
  nama: "I Made Santika",
  nim: "00123456",
  angkatan: "2024",
  noHp: "+62 812-3456-7890",
  idLine: "santika_ti",
  email: "santika@undiknas.ac.id",
  catatan: "Siap hadir tepat waktu.",
};

function makeRegistration(
  overrides: Partial<ProgramRegistration> = {},
): ProgramRegistration {
  return {
    id: REG_ID,
    programId: PROGRAM_ID,
    nama: validPayload.nama,
    nim: validPayload.nim,
    angkatan: validPayload.angkatan,
    noHp: validPayload.noHp,
    idLine: validPayload.idLine,
    email: validPayload.email,
    catatan: validPayload.catatan,
    customResponses: {},
    submittedAt: new Date("2026-11-17T08:00:00Z"),
    createdAt: new Date("2026-11-17T08:00:00Z"),
    ...overrides,
  };
}

function makeJsonRequest(
  url: string,
  method: string,
  body: string | null,
  headers: Record<string, string> = {},
) {
  return new Request(url, {
    method,
    headers: {
      origin: "https://example.com",
      host: "example.com",
      "content-type": "application/json",
      ...headers,
    },
    ...(body !== null ? { body } : {}),
  });
}

test("POST publik menolak cross-origin, DB belum terkonfigurasi, Content-Type salah, body kebesaran, dan JSON rusak", async () => {
  let called = false;
  const deps = {
    isDatabaseConfigured: () => true,
    registerProgram: async () => {
      called = true;
      return {
        registration: makeRegistration(),
        programTitle: baseProgram.title,
        registrationGroupLink: baseProgram.registrationGroupLink,
      };
    },
  };

  const crossOrigin = await handlePublicProgramRegistrationPost(
    makeJsonRequest(
      "https://example.com/api/program-registrations",
      "POST",
      JSON.stringify(validPayload),
      { origin: "https://evil.example" },
    ),
    deps,
  );
  assert.equal(crossOrigin.status, 403);
  assert.equal(crossOrigin.headers.get("cache-control"), "no-store");
  assert.equal(called, false);

  const unconfigured = await handlePublicProgramRegistrationPost(
    makeJsonRequest(
      "https://example.com/api/program-registrations",
      "POST",
      JSON.stringify(validPayload),
    ),
    { ...deps, isDatabaseConfigured: () => false },
  );
  assert.equal(unconfigured.status, 503);
  assert.equal(unconfigured.headers.get("cache-control"), "no-store");
  assert.match((await unconfigured.json()).error, /dikonfigurasi/i);

  const wrongType = await handlePublicProgramRegistrationPost(
    makeJsonRequest(
      "https://example.com/api/program-registrations",
      "POST",
      JSON.stringify(validPayload),
      { "content-type": "text/plain" },
    ),
    deps,
  );
  assert.equal(wrongType.status, 415);

  assert.equal(PUBLIC_REGISTRATION_MAX_BYTES, 32 * 1024);
  assert.equal(ADMIN_REGISTRATION_MAX_BYTES, 64 * 1024);

  const oversized = await handlePublicProgramRegistrationPost(
    makeJsonRequest(
      "https://example.com/api/program-registrations",
      "POST",
      JSON.stringify({ ...validPayload, catatan: "a".repeat(33_000) }),
    ),
    deps,
  );
  assert.equal(oversized.status, 413);

  for (const badBody of ["", "{invalid-json", "[]", "null", '"text"']) {
    const res = await handlePublicProgramRegistrationPost(
      makeJsonRequest(
        "https://example.com/api/program-registrations",
        "POST",
        badBody,
      ),
      deps,
    );
    assert.equal(res.status, 400);
    assert.equal(res.headers.get("cache-control"), "no-store");
  }
  assert.equal(called, false);
});

test("POST publik memetakan ValidationError, NotFoundError, ConflictError, error tak terduga, dan sukses 201 dengan customResponses", async () => {
  let currentProgram: Program | null = { ...baseProgram };
  let count = 0;
  let throwDuplicate = false;
  let throwUnexpected = false;

  const deps = {
    isDatabaseConfigured: () => true,
    registerProgram: async (programId: string, body: Record<string, unknown>) => {
      if (throwUnexpected) {
        throw new Error("postgresql://secret:pass@db.internal:5432/prod failed");
      }
      return registerProgram(
        { getPublished: async (id) => (id === currentProgram?.id ? currentProgram : null) },
        {
          countByProgram: async () => count,
          create: async (pid, input) => {
            if (throwDuplicate) {
              throw Object.assign(new Error("unique"), { code: "P2002" });
            }
            return makeRegistration({ ...input, programId: pid });
          },
        },
        programId,
        body,
      );
    },
  };

  const success = await handlePublicProgramRegistrationPost(
    makeJsonRequest(
      "https://example.com/api/program-registrations",
      "POST",
      JSON.stringify(validPayload),
      { "content-type": "application/json; charset=utf-8" },
    ),
    deps,
  );
  assert.equal(success.status, 201);
  assert.equal(success.headers.get("cache-control"), "no-store");
  const successJson = await success.json();
  assert.equal(successJson.programTitle, baseProgram.title);
  assert.equal(
    successJson.registrationGroupLink,
    baseProgram.registrationGroupLink,
  );
  assert.deepEqual(Object.keys(successJson.registration).sort(), [
    "angkatan",
    "catatan",
    "customResponses",
    "email",
    "id",
    "idLine",
    "nama",
    "nim",
    "noHp",
    "programId",
    "submittedAt",
  ]);
  assert.deepEqual(successJson.registration.customResponses, {});
  assert.equal("createdAt" in successJson.registration, false);

  const missingProgramId = await handlePublicProgramRegistrationPost(
    makeJsonRequest(
      "https://example.com/api/program-registrations",
      "POST",
      JSON.stringify({ ...validPayload, programId: undefined }),
    ),
    deps,
  );
  assert.equal(missingProgramId.status, 400);

  const invalidNim = await handlePublicProgramRegistrationPost(
    makeJsonRequest(
      "https://example.com/api/program-registrations",
      "POST",
      JSON.stringify({ ...validPayload, nim: "abc" }),
    ),
    deps,
  );
  assert.equal(invalidNim.status, 400);

  currentProgram = null;
  const notFound = await handlePublicProgramRegistrationPost(
    makeJsonRequest(
      "https://example.com/api/program-registrations",
      "POST",
      JSON.stringify(validPayload),
    ),
    deps,
  );
  assert.equal(notFound.status, 404);

  currentProgram = { ...baseProgram };
  throwDuplicate = true;
  const duplicate = await handlePublicProgramRegistrationPost(
    makeJsonRequest(
      "https://example.com/api/program-registrations",
      "POST",
      JSON.stringify(validPayload),
    ),
    deps,
  );
  assert.equal(duplicate.status, 409);
  assert.equal((await duplicate.json()).reason, "duplicate");

  throwDuplicate = false;
  count = 2;
  const quotaFull = await handlePublicProgramRegistrationPost(
    makeJsonRequest(
      "https://example.com/api/program-registrations",
      "POST",
      JSON.stringify(validPayload),
    ),
    deps,
  );
  assert.equal(quotaFull.status, 409);
  assert.equal((await quotaFull.json()).reason, "quota");

  throwUnexpected = true;
  const serverError = await handlePublicProgramRegistrationPost(
    makeJsonRequest(
      "https://example.com/api/program-registrations",
      "POST",
      JSON.stringify(validPayload),
    ),
    deps,
  );
  assert.equal(serverError.status, 500);
  const errorBody = await serverError.json();
  assert.doesNotMatch(JSON.stringify(errorBody), /secret|pass|db\.internal|Error:/);
});

test("endpoint admin list, PATCH, dan DELETE memeriksa sesi, origin, UUID, dan memetakan error dengan benar", async () => {
  const sampleItem: ProgramRegistrationListItem = {
    ...makeRegistration(),
    programTitle: baseProgram.title,
    programPeriod: baseProgram.period,
  };
  let adminAuthorized = false;
  let capturedFilter: unknown = null;
  let throwKind: "none" | "validation" | "not_found" | "conflict" | "unexpected" =
    "none";

  const repo: ProgramRegistrationRepository = {
    create: async () => sampleItem,
    get: async () => sampleItem,
    list: async (filter) => {
      capturedFilter = filter;
      return [sampleItem];
    },
    update: async (id, input) => {
      if (throwKind === "not_found") throw new NotFoundError("Data tidak ada.");
      if (throwKind === "conflict")
        throw new ConflictError("NIM sudah dipakai.", "duplicate");
      if (throwKind === "unexpected") throw new Error("unexpected db crash");
      return { ...sampleItem, ...input, id };
    },
    delete: async (id) => {
      if (throwKind === "not_found") throw new NotFoundError("Data tidak ada.");
      if (throwKind === "unexpected") throw new Error("unexpected db crash");
      return { ...sampleItem, id };
    },
    countByProgram: async () => 1,
    countsByProgram: async () => ({ [PROGRAM_ID]: 1 }),
    countsByCohort: async () => ({}),
  };

  const requireAdmin = async () => {
    if (!adminAuthorized) throw new FakeAccessError();
    return { id: "admin-1", email: "admin@example.com" };
  };

  const unauthGet = await handleAdminProgramRegistrationsGet(
    new Request("https://example.com/api/admin/program-registrations"),
    {
      requireAdmin,
      listProgramRegistrations: (f) => listProgramRegistrations(repo, f),
      getProgramRegistrationCounts: () => getProgramRegistrationCounts(repo),
      listPrograms: async () => [baseProgram],
    },
  );
  assert.equal(unauthGet.status, 401);
  assert.equal(unauthGet.headers.get("cache-control"), "no-store");

  adminAuthorized = true;
  const badFilterGet = await handleAdminProgramRegistrationsGet(
    new Request(
      "https://example.com/api/admin/program-registrations?programId=not-a-uuid",
    ),
    {
      requireAdmin,
      listProgramRegistrations: (f) => listProgramRegistrations(repo, f),
      getProgramRegistrationCounts: () => getProgramRegistrationCounts(repo),
      listPrograms: async () => [baseProgram],
    },
  );
  assert.equal(badFilterGet.status, 400);

  const okGet = await handleAdminProgramRegistrationsGet(
    new Request(
      `https://example.com/api/admin/program-registrations?programId=${PROGRAM_ID}&q=%20made%20`,
    ),
    {
      requireAdmin,
      listProgramRegistrations: (f) => listProgramRegistrations(repo, f),
      getProgramRegistrationCounts: () => getProgramRegistrationCounts(repo),
      listPrograms: async () => [baseProgram],
    },
  );
  assert.equal(okGet.status, 200);
  assert.equal(okGet.headers.get("cache-control"), "no-store");
  assert.deepEqual(capturedFilter, { programId: PROGRAM_ID, q: "made" });
  const okJson = await okGet.json();
  assert.equal(okJson.items.length, 1);
  assert.deepEqual(okJson.counts, { [PROGRAM_ID]: 1 });
  assert.equal(okJson.programs.length, 1);

  const patchCrossOrigin = await handleAdminProgramRegistrationPatch(
    makeJsonRequest(
      `https://example.com/api/admin/program-registrations/${REG_ID}`,
      "PATCH",
      JSON.stringify(validPayload),
      { origin: "https://evil.example" },
    ),
    REG_ID,
    {
      requireAdmin,
      updateProgramRegistration: (id, body) =>
        updateProgramRegistration(repo, id, body),
    },
  );
  assert.equal(patchCrossOrigin.status, 403);

  adminAuthorized = false;
  const patchUnauth = await handleAdminProgramRegistrationPatch(
    makeJsonRequest(
      `https://example.com/api/admin/program-registrations/${REG_ID}`,
      "PATCH",
      JSON.stringify(validPayload),
    ),
    REG_ID,
    {
      requireAdmin,
      updateProgramRegistration: (id, body) =>
        updateProgramRegistration(repo, id, body),
    },
  );
  assert.equal(patchUnauth.status, 401);

  adminAuthorized = true;
  const patchBadUuid = await handleAdminProgramRegistrationPatch(
    makeJsonRequest(
      "https://example.com/api/admin/program-registrations/bad-id",
      "PATCH",
      JSON.stringify(validPayload),
    ),
    "bad-id",
    {
      requireAdmin,
      updateProgramRegistration: (id, body) =>
        updateProgramRegistration(repo, id, body),
    },
  );
  assert.equal(patchBadUuid.status, 400);

  const patchValidation = await handleAdminProgramRegistrationPatch(
    makeJsonRequest(
      `https://example.com/api/admin/program-registrations/${REG_ID}`,
      "PATCH",
      JSON.stringify({ ...validPayload, nim: "invalid" }),
    ),
    REG_ID,
    {
      requireAdmin,
      updateProgramRegistration: (id, body) =>
        updateProgramRegistration(repo, id, body),
    },
  );
  assert.equal(patchValidation.status, 400);

  throwKind = "not_found";
  const patchNotFound = await handleAdminProgramRegistrationPatch(
    makeJsonRequest(
      `https://example.com/api/admin/program-registrations/${REG_ID}`,
      "PATCH",
      JSON.stringify(validPayload),
    ),
    REG_ID,
    {
      requireAdmin,
      updateProgramRegistration: (id, body) =>
        updateProgramRegistration(repo, id, body),
    },
  );
  assert.equal(patchNotFound.status, 404);

  throwKind = "conflict";
  const patchConflict = await handleAdminProgramRegistrationPatch(
    makeJsonRequest(
      `https://example.com/api/admin/program-registrations/${REG_ID}`,
      "PATCH",
      JSON.stringify(validPayload),
    ),
    REG_ID,
    {
      requireAdmin,
      updateProgramRegistration: (id, body) =>
        updateProgramRegistration(repo, id, body),
    },
  );
  assert.equal(patchConflict.status, 409);

  throwKind = "unexpected";
  const patchUnexpected = await handleAdminProgramRegistrationPatch(
    makeJsonRequest(
      `https://example.com/api/admin/program-registrations/${REG_ID}`,
      "PATCH",
      JSON.stringify(validPayload),
    ),
    REG_ID,
    {
      requireAdmin,
      updateProgramRegistration: (id, body) =>
        updateProgramRegistration(repo, id, body),
    },
  );
  assert.equal(patchUnexpected.status, 500);
  assert.doesNotMatch(JSON.stringify(await patchUnexpected.json()), /db crash/);

  throwKind = "none";
  const patchOk = await handleAdminProgramRegistrationPatch(
    makeJsonRequest(
      `https://example.com/api/admin/program-registrations/${REG_ID}`,
      "PATCH",
      JSON.stringify({ ...validPayload, nama: "Nama Baru" }),
    ),
    REG_ID,
    {
      requireAdmin,
      updateProgramRegistration: (id, body) =>
        updateProgramRegistration(repo, id, body),
    },
  );
  assert.equal(patchOk.status, 200);
  assert.equal((await patchOk.json()).item.nama, "Nama Baru");

  const deleteBadUuid = await handleAdminProgramRegistrationDelete(
    makeJsonRequest(
      "https://example.com/api/admin/program-registrations/not-uuid",
      "DELETE",
      null,
    ),
    "not-uuid",
    {
      requireAdmin,
      deleteProgramRegistration: (id) => deleteProgramRegistration(repo, id),
    },
  );
  assert.equal(deleteBadUuid.status, 400);

  throwKind = "not_found";
  const deleteMissing = await handleAdminProgramRegistrationDelete(
    makeJsonRequest(
      `https://example.com/api/admin/program-registrations/${REG_ID}`,
      "DELETE",
      null,
    ),
    REG_ID,
    {
      requireAdmin,
      deleteProgramRegistration: (id) => deleteProgramRegistration(repo, id),
    },
  );
  assert.equal(deleteMissing.status, 404);

  throwKind = "none";
  const deleteOk = await handleAdminProgramRegistrationDelete(
    makeJsonRequest(
      `https://example.com/api/admin/program-registrations/${REG_ID}`,
      "DELETE",
      null,
    ),
    REG_ID,
    {
      requireAdmin,
      deleteProgramRegistration: (id) => deleteProgramRegistration(repo, id),
    },
  );
  assert.equal(deleteOk.status, 200);
  assert.equal((await deleteOk.json()).success, true);
});

test("ekspor Excel peserta proker memeriksa auth, UUID, menyusun kolom WITA, dan menetralkan formula injection", async () => {
  assert.equal(sanitizeSpreadsheetText('=HYPERLINK("bad")'), `'=HYPERLINK("bad")`);
  assert.equal(sanitizeSpreadsheetText("+cmd|' /C calc'!A0"), `'+cmd|' /C calc'!A0`);
  assert.equal(sanitizeSpreadsheetText("-1+1"), `'-1+1`);
  assert.equal(sanitizeSpreadsheetText("@SUM(1,1)"), `'@SUM(1,1)`);
  assert.equal(sanitizeSpreadsheetText("\t=1+1"), `'\t=1+1`);
  assert.equal(sanitizeSpreadsheetText("00123456"), "00123456");

  const items: ProgramRegistrationListItem[] = [
    {
      ...makeRegistration({
        nama: '=HYPERLINK("https://evil.example","Klik")',
        nim: "00123456",
        noHp: "+62 812-3456-7890",
        idLine: "@line_user",
        email: "",
        catatan: "-Catatan penting",
      }),
      programTitle: "IT Versary & Sertijab 2026",
      programPeriod: "2025/2026",
    },
  ];

  const wb = XLSX.read(createProgramRegistrationsWorkbook(items), {
    type: "buffer",
  });
  const sheet = wb.Sheets["Peserta Program"];
  assert.ok(sheet);
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
  assert.deepEqual(rows[0], [...PROGRAM_REGISTRATION_EXPORT_HEADERS]);
  assert.equal(rows[1][0], 1);
  assert.equal(rows[1][1], "IT Versary & Sertijab 2026");
  assert.equal(rows[1][2], "2025/2026");
  assert.equal(rows[1][3], `'=HYPERLINK("https://evil.example","Klik")`);
  assert.equal(rows[1][4], "00123456");
  assert.equal(rows[1][5], "2024");
  assert.equal(rows[1][6], `'+62 812-3456-7890`);
  assert.equal(rows[1][7], `'@line_user`);
  assert.equal(rows[1][8], "");
  assert.equal(rows[1][9], "'-Catatan penting");
  assert.match(String(rows[1][10]), /17.*11.*2026.*16\.00.*WITA/);
  assert.equal(sheet.D2.t, "s");
  assert.equal(sheet.D2.f, undefined);
  assert.equal(sheet.E2.t, "s");

  let authorized = false;
  const requireAdmin = async () => {
    if (!authorized) throw new FakeAccessError();
  };

  const unauthExport = await handleAdminProgramRegistrationsExportGet(
    new Request("https://example.com/api/admin/program-registrations/export"),
    { requireAdmin, listProgramRegistrations: async () => items },
  );
  assert.equal(unauthExport.status, 401);

  authorized = true;
  const badUuidExport = await handleAdminProgramRegistrationsExportGet(
    new Request(
      "https://example.com/api/admin/program-registrations/export?programId=bad",
    ),
    { requireAdmin, listProgramRegistrations: async () => items },
  );
  assert.equal(badUuidExport.status, 400);

  let seenProgramId: string | undefined;
  const emptyExport = await handleAdminProgramRegistrationsExportGet(
    new Request(
      `https://example.com/api/admin/program-registrations/export?programId=${PROGRAM_ID}`,
    ),
    {
      requireAdmin,
      listProgramRegistrations: async (filter) => {
        seenProgramId = filter?.programId;
        return [];
      },
    },
  );
  assert.equal(seenProgramId, PROGRAM_ID);
  assert.equal(emptyExport.status, 200);
  assert.equal(
    emptyExport.headers.get("content-type"),
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  assert.match(
    emptyExport.headers.get("content-disposition") || "",
    /^attachment; filename="peserta-program-kerja-\d{4}-\d{2}-\d{2}\.xlsx"$/,
  );
  assert.equal(emptyExport.headers.get("cache-control"), "no-store");
  const emptyWb = XLSX.read(Buffer.from(await emptyExport.arrayBuffer()), {
    type: "buffer",
  });
  const emptyRows = XLSX.utils.sheet_to_json<unknown[]>(
    emptyWb.Sheets["Peserta Program"],
    { header: 1 },
  );
  assert.deepEqual(emptyRows, [[...PROGRAM_REGISTRATION_EXPORT_HEADERS]]);
});

test("normalisasi payload admin program menangani string kosong FormData dan mode pendaftaran kompatibel dengan validateProgram", () => {
  const base = { ...initialPrograms[0] };
  const legacy: Record<string, unknown> = { ...base };
  delete legacy.registrationMode;
  delete legacy.registrationGroupLink;
  delete legacy.registrationMaxQuota;

  const emptyForm = new FormData();
  emptyForm.set("registrationMode", "");
  emptyForm.set("registrationGroupLink", "");
  emptyForm.set("registrationMaxQuota", "");

  const normalizedEmpty = normalizeAdminProgramPayload(legacy, emptyForm);
  const validatedEmpty = validateProgram(normalizedEmpty);
  assert.equal(validatedEmpty.registrationMode, "external");
  assert.equal(validatedEmpty.registrationGroupLink, "");
  assert.equal(validatedEmpty.registrationMaxQuota, null);

  const internalJson = validateProgram(
    normalizeAdminProgramPayload({
      ...base,
      status: "open",
      gformLink: "",
      registrationMode: "internal",
      registrationGroupLink: "https://chat.whatsapp.com/contoh",
      registrationMaxQuota: "",
    }),
  );
  assert.equal(internalJson.registrationMode, "internal");
  assert.equal(
    internalJson.registrationGroupLink,
    "https://chat.whatsapp.com/contoh",
  );
  assert.equal(internalJson.registrationMaxQuota, null);

  const internalWithQuota = validateProgram(
    normalizeAdminProgramPayload({
      ...base,
      status: "open",
      gformLink: "",
      registrationMode: "internal",
      registrationGroupLink: "",
      registrationMaxQuota: "75",
    }),
  );
  assert.equal(internalWithQuota.registrationMaxQuota, 75);

  assert.throws(
    () =>
      validateProgram(
        normalizeAdminProgramPayload({
          ...base,
          registrationMode: "",
        }),
      ),
    ValidationError,
  );

  const customConfig: ProgramFormConfig = {
    builtInFields: {
      angkatan: "hidden",
      noHp: "optional",
      idLine: "hidden",
      email: "required",
      catatan: "optional",
    },
    customFields: [
      {
        id: "asal_kampus",
        label: "Asal Kampus",
        type: "text",
        required: true,
        placeholder: "Undiknas",
        options: [],
      },
    ],
  };

  const fromDataConfig = validateProgram(
    normalizeAdminProgramPayload({
      ...base,
      status: "open",
      gformLink: "",
      registrationMode: "internal",
      registrationFormConfig: customConfig,
    }),
  );
  assert.deepEqual(fromDataConfig.registrationFormConfig, customConfig);

  const legacyProgramPayload: Record<string, unknown> = {
    ...base,
    status: "open",
    gformLink: "",
    registrationMode: "internal",
  };
  delete legacyProgramPayload.registrationFormConfig;

  const formWithConfig = new FormData();
  formWithConfig.set("registrationFormConfig", JSON.stringify(customConfig));
  const fromFormConfig = validateProgram(
    normalizeAdminProgramPayload(legacyProgramPayload, formWithConfig),
  );
  assert.deepEqual(fromFormConfig.registrationFormConfig, customConfig);

  const emptyConfigForm = new FormData();
  emptyConfigForm.set("registrationFormConfig", "");
  const defaultedFromForm = validateProgram(
    normalizeAdminProgramPayload(legacyProgramPayload, emptyConfigForm),
  );
  assert.deepEqual(
    defaultedFromForm.registrationFormConfig,
    DEFAULT_PROGRAM_FORM_CONFIG,
  );

  const defaultedFromEmptyString = validateProgram(
    normalizeAdminProgramPayload({
      ...base,
      registrationFormConfig: "   ",
    }),
  );
  assert.deepEqual(
    defaultedFromEmptyString.registrationFormConfig,
    DEFAULT_PROGRAM_FORM_CONFIG,
  );

  assert.throws(
    () =>
      validateProgram(
        normalizeAdminProgramPayload({
          ...base,
          registrationFormConfig: "{invalid-json",
        }),
      ),
    ValidationError,
  );
});

test("POST publik dan PATCH admin memvalidasi formulir custom, batas payload 32KB/64KB, dan mempertahankan key historis", async () => {
  const customFormConfig: ProgramFormConfig = {
    builtInFields: {
      angkatan: "hidden",
      noHp: "optional",
      idLine: "hidden",
      email: "required",
      catatan: "optional",
    },
    customFields: [
      {
        id: "asal",
        label: "Asal Instansi",
        type: "text",
        required: true,
        placeholder: "Undiknas",
        options: [],
      },
      {
        id: "motivasi",
        label: "Motivasi",
        type: "textarea",
        required: false,
        placeholder: "",
        options: [],
      },
      {
        id: "ukuran",
        label: "Ukuran Kaos",
        type: "select",
        required: true,
        placeholder: "",
        options: ["S", "M", "L"],
      },
      {
        id: "setuju",
        label: "Setuju Aturan",
        type: "checkbox",
        required: true,
        placeholder: "",
        options: [],
      },
    ],
  };
  const customProgram: Program = {
    ...baseProgram,
    registrationMaxQuota: 10,
    registrationFormConfig: customFormConfig,
  };
  let stored = makeRegistration({
    programId: customProgram.id,
    angkatan: "",
    noHp: "",
    idLine: "",
    email: "ayu@undiknas.ac.id",
    catatan: "",
    customResponses: {
      asal: "Undiknas",
      motivasi: "",
      ukuran: "M",
      setuju: true,
      legacy_note: "Data historis",
    },
  });

  const programRepo: Pick<ProgramRepository, "getPublished" | "get"> = {
    getPublished: async (id) => (id === customProgram.id ? customProgram : null),
    get: async (id) => (id === customProgram.id ? customProgram : null),
  };
  const regRepo: ProgramRegistrationRepository = {
    countByProgram: async () => 0,
    countsByProgram: async () => ({ [customProgram.id]: 1 }),
    countsByCohort: async () => ({}),
    list: async () => [],
    get: async (id) => (id === stored.id ? stored : null),
    create: async (pid, input) => {
      stored = makeRegistration({ ...input, programId: pid });
      return stored;
    },
    update: async (_id, input) => {
      stored = { ...stored, ...input };
      return stored;
    },
    delete: async () => stored,
  };

  const pubDeps = {
    isDatabaseConfigured: () => true,
    registerProgram: (programId: string, body: Record<string, unknown>) =>
      registerProgram(programRepo, regRepo, programId, body),
  };

  const created = await handlePublicProgramRegistrationPost(
    makeJsonRequest(
      "https://example.com/api/program-registrations",
      "POST",
      JSON.stringify({
        programId: customProgram.id,
        nama: "Ni Putu Ayu",
        nim: "22010505",
        angkatan: "2024",
        noHp: "",
        idLine: "line_lama",
        email: "ayu@undiknas.ac.id",
        catatan: "",
        customResponses: {
          asal: "Undiknas Denpasar",
          motivasi: "Ingin belajar bersama",
          ukuran: "M",
          setuju: true,
        },
        padding: "x".repeat(20_000),
      }),
    ),
    pubDeps,
  );
  assert.equal(created.status, 201);
  const createdJson = await created.json();
  assert.equal(createdJson.registration.angkatan, "");
  assert.equal(createdJson.registration.idLine, "");
  assert.equal(createdJson.registration.noHp, "");
  assert.equal(createdJson.registration.email, "ayu@undiknas.ac.id");
  assert.deepEqual(createdJson.registration.customResponses, {
    asal: "Undiknas Denpasar",
    motivasi: "Ingin belajar bersama",
    ukuran: "M",
    setuju: true,
  });

  const badOption = await handlePublicProgramRegistrationPost(
    makeJsonRequest(
      "https://example.com/api/program-registrations",
      "POST",
      JSON.stringify({
        programId: customProgram.id,
        nama: "Ni Putu Ayu",
        nim: "22010505",
        email: "ayu@undiknas.ac.id",
        customResponses: {
          asal: "Undiknas",
          ukuran: "XXL",
          setuju: true,
        },
      }),
    ),
    pubDeps,
  );
  assert.equal(badOption.status, 400);

  const missingCheckbox = await handlePublicProgramRegistrationPost(
    makeJsonRequest(
      "https://example.com/api/program-registrations",
      "POST",
      JSON.stringify({
        programId: customProgram.id,
        nama: "Ni Putu Ayu",
        nim: "22010505",
        email: "ayu@undiknas.ac.id",
        customResponses: {
          asal: "Undiknas",
          ukuran: "M",
          setuju: false,
        },
      }),
    ),
    pubDeps,
  );
  assert.equal(missingCheckbox.status, 400);

  stored = {
    ...stored,
    customResponses: {
      ...stored.customResponses,
      legacy_note: "Data historis",
    },
  };

  const requireAdmin = async () => ({ id: "admin-1" });
  const adminTooLarge = await handleAdminProgramRegistrationPatch(
    makeJsonRequest(
      `https://example.com/api/admin/program-registrations/${REG_ID}`,
      "PATCH",
      JSON.stringify({ nama: "Ayu", padding: "x".repeat(66_000) }),
    ),
    REG_ID,
    {
      requireAdmin,
      programRepository: programRepo,
      updateProgramRegistration: (id, body, progRepo) =>
        updateProgramRegistration(regRepo, id, body, progRepo),
    },
  );
  assert.equal(adminTooLarge.status, 413);

  const adminInvalidCustom = await handleAdminProgramRegistrationPatch(
    makeJsonRequest(
      `https://example.com/api/admin/program-registrations/${REG_ID}`,
      "PATCH",
      JSON.stringify({
        nama: "Ni Putu Ayu",
        nim: "22010505",
        email: "ayu@undiknas.ac.id",
        customResponses: {
          asal: "Undiknas",
          ukuran: "TIDAK_ADA",
          setuju: true,
        },
      }),
    ),
    REG_ID,
    {
      requireAdmin,
      programRepository: programRepo,
      updateProgramRegistration: (id, body, progRepo) =>
        updateProgramRegistration(regRepo, id, body, progRepo),
    },
  );
  assert.equal(adminInvalidCustom.status, 400);

  const adminPatched = await handleAdminProgramRegistrationPatch(
    makeJsonRequest(
      `https://example.com/api/admin/program-registrations/${REG_ID}`,
      "PATCH",
      JSON.stringify({
        nama: "Ni Putu Ayu Edit",
        nim: "22010505",
        angkatan: "2024",
        idLine: "harus_kosong",
        email: "ayu@undiknas.ac.id",
        catatan: "Siap",
        customResponses: {
          asal: "Undiknas Baru",
          motivasi: "Update motivasi",
          ukuran: "L",
          setuju: true,
          unknown_injected: "dibuang",
        },
        padding: "x".repeat(40_000),
      }),
    ),
    REG_ID,
    {
      requireAdmin,
      programRepository: programRepo,
      updateProgramRegistration: (id, body, progRepo) =>
        updateProgramRegistration(regRepo, id, body, progRepo),
    },
  );
  assert.equal(adminPatched.status, 200);
  const patchedJson = await adminPatched.json();
  assert.equal(patchedJson.item.nama, "Ni Putu Ayu Edit");
  assert.equal(patchedJson.item.angkatan, "");
  assert.equal(patchedJson.item.idLine, "");
  assert.deepEqual(patchedJson.item.customResponses, {
    asal: "Undiknas Baru",
    motivasi: "Update motivasi",
    ukuran: "L",
    setuju: true,
    legacy_note: "Data historis",
  });
});

test("ekspor Excel dinamis menyaring kolom hidden kosong, menampilkan kolom custom/legacy, menangani multi-program, dan menetralkan formula", async () => {
  const PROG_A = "11111111-1111-4111-8111-111111111111";
  const PROG_B = "33333333-3333-4333-8333-333333333333";

  const progA: Program = {
    ...baseProgram,
    id: PROG_A,
    title: "Workshop AI",
    period: "2025/2026",
    registrationFormConfig: {
      builtInFields: {
        angkatan: "hidden",
        noHp: "hidden",
        idLine: "hidden",
        email: "optional",
        catatan: "hidden",
      },
      customFields: [
        {
          id: "asal",
          label: "Asal Instansi",
          type: "text",
          required: true,
          placeholder: "",
          options: [],
        },
        {
          id: "ukuran_a",
          label: "Ukuran Kaos",
          type: "select",
          required: true,
          placeholder: "",
          options: ["S", "M", "L"],
        },
        {
          id: "setuju",
          label: "=SUM(1,1)",
          type: "checkbox",
          required: false,
          placeholder: "",
          options: [],
        },
        {
          id: "skor",
          label: "Skor",
          type: "number",
          required: false,
          placeholder: "",
          options: [],
        },
      ],
    },
  };

  const progB: Program = {
    ...baseProgram,
    id: PROG_B,
    title: "Seminar Cyber",
    period: "2025/2026",
    registrationFormConfig: {
      builtInFields: {
        angkatan: "required",
        noHp: "required",
        idLine: "optional",
        email: "optional",
        catatan: "optional",
      },
      customFields: [
        {
          id: "asal",
          label: "Asal Instansi",
          type: "text",
          required: true,
          placeholder: "",
          options: [],
        },
        {
          id: "ukuran_b",
          label: "Ukuran Kaos",
          type: "select",
          required: true,
          placeholder: "",
          options: ["M", "XL"],
        },
        {
          id: "skor",
          label: "Tingkat Minat",
          type: "text",
          required: false,
          placeholder: "",
          options: [],
        },
      ],
    },
  };

  const rowsForA: ProgramRegistrationListItem[] = [
    {
      ...makeRegistration({
        id: REG_ID,
        programId: PROG_A,
        angkatan: "2024",
        noHp: "",
        idLine: "",
        email: "",
        catatan: "",
        customResponses: {
          asal: "=HYPERLINK(\"https://evil.example\")",
          ukuran_a: "M",
          setuju: true,
          skor: "-5",
          "=LEGACY_KEY": "@SUM(A1)",
        },
      }),
      programTitle: progA.title,
      programPeriod: progA.period,
    },
    {
      ...makeRegistration({
        id: "44444444-4444-4444-8444-444444444444",
        programId: PROG_A,
        nim: "22010999",
        angkatan: "",
        noHp: "",
        idLine: "",
        email: "",
        catatan: "",
        customResponses: {
          asal: "+Undiknas",
          ukuran_a: "L",
          setuju: false,
          skor: "10",
        },
      }),
      programTitle: progA.title,
      programPeriod: progA.period,
    },
  ];

  const rowForB: ProgramRegistrationListItem = {
    ...makeRegistration({
      id: "55555555-5555-4555-8555-555555555555",
      programId: PROG_B,
      nim: "23010123",
      angkatan: "2023",
      noHp: "08123456789",
      idLine: "b_line",
      email: "b@undiknas.ac.id",
      catatan: "Hadir",
      customResponses: {
        asal: "\t=Poltek",
        ukuran_b: "XL",
        skor: "Tinggi",
      },
    }),
    programTitle: progB.title,
    programPeriod: progB.period,
  };

  const singleRes = await handleAdminProgramRegistrationsExportGet(
    new Request(
      `https://example.com/api/admin/program-registrations/export?programId=${PROG_A}`,
    ),
    {
      requireAdmin: async () => ({ id: "admin-1" }),
      listProgramRegistrations: async () => rowsForA,
      programRepository: {
        get: async (id) => (id === PROG_A ? progA : null),
        list: async () => [progA, progB],
      },
    },
  );
  assert.equal(singleRes.status, 200);
  const singleWb = XLSX.read(Buffer.from(await singleRes.arrayBuffer()), {
    type: "buffer",
  });
  const singleSheet = singleWb.Sheets["Peserta Program"];
  const singleRows = XLSX.utils.sheet_to_json<unknown[]>(singleSheet, {
    header: 1,
  });

  // angkatan is hidden in config but has "2024" in row 1; email is optional -> both stay.
  // noHp, idLine, catatan are hidden AND empty across all rows -> omitted.
  assert.deepEqual(singleRows[0], [
    "No",
    "Program Kerja",
    "Periode",
    "Nama Lengkap",
    "NIM",
    "Angkatan",
    "Email",
    "Waktu Daftar",
    "Asal Instansi",
    "Ukuran Kaos",
    "'=SUM(1,1)",
    "Skor",
    "'=LEGACY_KEY",
  ]);
  assert.equal(singleRows[1][8], `'=HYPERLINK("https://evil.example")`);
  assert.equal(singleRows[1][9], "M");
  assert.equal(singleRows[1][10], "Ya");
  assert.equal(singleRows[1][11], "'-5");
  assert.equal(singleRows[1][12], "'@SUM(A1)");
  assert.equal(singleRows[2][8], "'+Undiknas");
  assert.equal(singleRows[2][10], "Tidak");
  assert.equal(singleRows[2][11], "10");
  assert.equal(singleRows[2][12], "");
  assert.equal(singleSheet.K1.t, "s");
  assert.equal(singleSheet.K1.f, undefined);
  assert.equal(singleSheet.I2.t, "s");
  assert.equal(singleSheet.I2.f, undefined);
  assert.equal(singleSheet.M2.t, "s");
  assert.equal(singleSheet.M2.f, undefined);

  // Multi-program export (!programId) keeps all 11 standard columns, deduplicates matching (id, label),
  // disambiguates colliding labels with different IDs, and separates same ID with different labels.
  const allRes = await handleAdminProgramRegistrationsExportGet(
    new Request("https://example.com/api/admin/program-registrations/export"),
    {
      requireAdmin: async () => ({ id: "admin-1" }),
      listProgramRegistrations: async () => [rowsForA[0], rowForB],
      programRepository: {
        get: async () => null,
        list: async () => [progA, progB],
      },
    },
  );
  assert.equal(allRes.status, 200);
  const allWb = XLSX.read(Buffer.from(await allRes.arrayBuffer()), {
    type: "buffer",
  });
  const allRows = XLSX.utils.sheet_to_json<unknown[]>(
    allWb.Sheets["Peserta Program"],
    { header: 1 },
  );
  assert.deepEqual(allRows[0], [
    ...PROGRAM_REGISTRATION_EXPORT_HEADERS,
    "Asal Instansi",
    "Ukuran Kaos (Workshop AI)",
    "'=SUM(1,1)",
    "Skor",
    "Ukuran Kaos (Seminar Cyber)",
    "Tingkat Minat",
    "'=LEGACY_KEY",
  ]);
  assert.equal(allRows[1][11], `'=HYPERLINK("https://evil.example")`);
  assert.equal(allRows[1][12], "M");
  assert.equal(allRows[1][13], "Ya");
  assert.equal(allRows[1][14], "'-5");
  assert.equal(allRows[1][15], "");
  assert.equal(allRows[1][16], "");
  assert.equal(allRows[1][17], "'@SUM(A1)");

  assert.equal(allRows[2][11], `'=Poltek`);
  assert.equal(allRows[2][12], "");
  assert.equal(allRows[2][13], "");
  assert.equal(allRows[2][14], "");
  assert.equal(allRows[2][15], "XL");
  assert.equal(allRows[2][16], "Tinggi");
  assert.equal(allRows[2][17], "");

  // Direct ProgramFormConfig input works too
  const directConfigWb = XLSX.read(
    createProgramRegistrationsWorkbook(
      [
        {
          ...rowsForA[0],
          angkatan: "",
        },
      ],
      progA.registrationFormConfig,
    ),
    { type: "buffer" },
  );
  const directRows = XLSX.utils.sheet_to_json<unknown[]>(
    directConfigWb.Sheets["Peserta Program"],
    { header: 1 },
  );
  assert.deepEqual(directRows[0], [
    "No",
    "Program Kerja",
    "Periode",
    "Nama Lengkap",
    "NIM",
    "Email",
    "Waktu Daftar",
    "Asal Instansi",
    "Ukuran Kaos",
    "'=SUM(1,1)",
    "Skor",
    "'=LEGACY_KEY",
  ]);
});

test("modul route.ts Next.js mengekspor handler yang tepat dan tidak membuka GET publik peserta", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--conditions=react-server",
      "--import=tsx",
      "-e",
      `
      const assert = require('node:assert/strict');
      const Module = require('node:module');
      const XLSX = require('xlsx');
      const originalLoad = Module._load;
      let adminAllowed = false;
      const programId = '11111111-1111-4111-8111-111111111111';
      const regId = '22222222-2222-4222-8222-222222222222';
      class MockAccessError extends Error { constructor() { super('Auth required'); } }
      Module._load = function (request, parent, isMain) {
        if (request === '@/data/auth') {
          return {
            AccessError: MockAccessError,
            requireAdmin: async () => {
              if (!adminAllowed) throw new MockAccessError();
              return { id: 'admin-1', email: 'admin@example.com' };
            },
          };
        }
        return originalLoad.call(this, request, parent, isMain);
      };

      const pubRoute = require('./src/app/api/program-registrations/route.ts');
      const adminProgramsRoute = require('./src/app/api/admin/programs/route.ts');
      const adminRegsRoute = require('./src/app/api/admin/program-registrations/route.ts');
      const adminRegIdRoute = require('./src/app/api/admin/program-registrations/[id]/route.ts');
      const adminExportRoute = require('./src/app/api/admin/program-registrations/export/route.ts');

      assert.equal(typeof pubRoute.POST, 'function');
      assert.equal(pubRoute.GET, undefined);
      assert.equal(typeof adminProgramsRoute.GET, 'function');
      assert.equal(typeof adminProgramsRoute.POST, 'function');
      assert.equal(typeof adminProgramsRoute.PATCH, 'function');
      assert.equal(typeof adminRegsRoute.GET, 'function');
      assert.equal(typeof adminRegIdRoute.PATCH, 'function');
      assert.equal(typeof adminRegIdRoute.DELETE, 'function');
      assert.equal(typeof adminExportRoute.GET, 'function');

      process.env.DATABASE_URL = 'postgresql://test:test@db.example.invalid:5432/test';
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
      globalThis.prismaConnectionString = process.env.DATABASE_URL;
      const customFormConfig = {
        builtInFields: {
          angkatan: 'hidden',
          noHp: 'required',
          idLine: 'hidden',
          email: 'optional',
          catatan: 'optional',
        },
        customFields: [
          { id: 'asal', label: 'Asal Instansi', type: 'text', required: true, placeholder: '', options: [] },
          { id: 'ukuran', label: 'Ukuran Kaos', type: 'select', required: true, placeholder: '', options: ['M', 'L'] },
        ],
      };
      const programRow = {
        id: programId,
        title: 'IT Versary & Sertijab 2026',
        body: 'Ringkasan',
        fullDescription: '',
        period: '2025/2026',
        executionDate: '',
        time: '',
        location: '',
        status: 'open',
        icon: 'cake',
        gformLink: '',
        registrationMode: 'internal',
        registrationGroupLink: '',
        registrationMaxQuota: null,
        registrationFormConfig: customFormConfig,
        speakers: [],
        benefits: [],
        price: '',
        contactPerson: '',
        imagePath: null,
        sortOrder: 0,
        isPublished: true,
      };
      let storedReg = {
        id: regId,
        programId,
        nama: 'Made',
        nim: '22010101',
        angkatan: '',
        noHp: '08123456789',
        idLine: '',
        email: '',
        catatan: '',
        customResponses: { asal: 'Undiknas', ukuran: 'M', legacy_key: 'Lama' },
        submittedAt: new Date('2026-11-18T08:00:00Z'),
        createdAt: new Date('2026-11-18T08:00:00Z'),
      };
      const secondProgramRow = {
        ...programRow,
        id: '33333333-3333-4333-8333-333333333333',
        title: 'Seminar Cyber',
        registrationFormConfig: {
          builtInFields: {
            angkatan: 'required',
            noHp: 'required',
            idLine: 'required',
            email: 'optional',
            catatan: 'optional',
          },
          customFields: [],
        },
      };
      const savedPrograms = [];
      globalThis.prisma = {
        $transaction: async (fn) => fn({
          programPeriod: { upsert: async () => ({ period: '2025/2026', isPublished: true }) },
          program: {
            create: async ({ data }) => {
              savedPrograms.push(data);
              return { ...data, id: programId, imagePath: null, createdAt: new Date(), updatedAt: new Date() };
            },
            update: async ({ data }) => {
              savedPrograms.push(data);
              return { ...data, id: programId, imagePath: null, createdAt: new Date(), updatedAt: new Date() };
            },
          },
        }),
        program: {
          findMany: async () => [programRow, secondProgramRow],
          findUnique: async () => programRow,
        },
        programPeriod: { findMany: async () => [] },
        programRegistration: {
          groupBy: async () => [{ programId, _count: { _all: 5 } }],
          findUnique: async () => storedReg,
          findMany: async () => [{ ...storedReg, program: { title: programRow.title, period: programRow.period } }],
          update: async ({ data }) => {
            storedReg = { ...storedReg, ...data };
            return storedReg;
          },
        },
      };

      (async () => {
        const cross = await pubRoute.POST(new Request('https://example.com/api/program-registrations', {
          method: 'POST',
          headers: { origin: 'https://evil.example', 'content-type': 'application/json' },
          body: '{}',
        }));
        assert.equal(cross.status, 403);

        const unauthPrograms = await adminProgramsRoute.GET();
        assert.equal(unauthPrograms.status, 401);

        Object.defineProperty(MockAccessError, 'name', { value: 'a' });
        const unauthRegsGet = await adminRegsRoute.GET(
          new Request('https://example.com/api/admin/program-registrations'),
        );
        assert.equal(unauthRegsGet.status, 401);
        const unauthRegsPatch = await adminRegIdRoute.PATCH(
          new Request('https://example.com/api/admin/program-registrations/' + programId, {
            method: 'PATCH',
            headers: { origin: 'https://example.com', 'content-type': 'application/json' },
            body: '{}',
          }),
          { params: Promise.resolve({ id: programId }) },
        );
        assert.equal(unauthRegsPatch.status, 401);
        const unauthRegsDelete = await adminRegIdRoute.DELETE(
          new Request('https://example.com/api/admin/program-registrations/' + programId, {
            method: 'DELETE',
            headers: { origin: 'https://example.com' },
          }),
          { params: Promise.resolve({ id: programId }) },
        );
        assert.equal(unauthRegsDelete.status, 401);
        const unauthRegsExport = await adminExportRoute.GET(
          new Request('https://example.com/api/admin/program-registrations/export'),
        );
        assert.equal(unauthRegsExport.status, 401);

        adminAllowed = true;
        const okPrograms = await adminProgramsRoute.GET();
        assert.equal(okPrograms.status, 200);
        const body = await okPrograms.json();
        assert.deepEqual(body.counts, { [programId]: 5 });
        assert.deepEqual(body.items[0].registrationFormConfig, customFormConfig);

        const createForm = new FormData();
        createForm.set('data', JSON.stringify({
          title: 'IT Versary & Sertijab 2026',
          body: 'Acara tahunan Prodi TI Undiknas.',
          fullDescription: '',
          period: '2025/2026',
          executionDate: '',
          time: '',
          location: '',
          status: 'open',
          icon: 'cake',
          gformLink: '',
          registrationMode: 'internal',
          registrationGroupLink: 'https://line.me/ti/g/test',
          registrationMaxQuota: '100',
          registrationFormConfig: customFormConfig,
          speakers: [],
          benefits: [],
          price: '',
          contactPerson: '',
          sortOrder: 1,
          isPublished: true,
        }));
        const createdRes = await adminProgramsRoute.POST(new Request('https://example.com/api/admin/programs', {
          method: 'POST',
          headers: { origin: 'https://example.com' },
          body: createForm,
        }));
        assert.equal(createdRes.status, 201);
        assert.equal(savedPrograms[0].registrationMode, 'internal');
        assert.equal(savedPrograms[0].registrationMaxQuota, 100);
        assert.deepEqual(savedPrograms[0].registrationFormConfig, customFormConfig);

        const patchForm = new FormData();
        patchForm.set('id', programId);
        patchForm.set('data', JSON.stringify({
          title: 'IT Versary & Sertijab 2026',
          body: 'Acara tahunan Prodi TI Undiknas.',
          fullDescription: '',
          period: '2025/2026',
          executionDate: '',
          time: '',
          location: '',
          status: 'open',
          icon: 'cake',
          gformLink: '',
          registrationMode: 'internal',
          registrationGroupLink: '',
          registrationMaxQuota: '',
          speakers: [],
          benefits: [],
          price: '',
          contactPerson: '',
          sortOrder: 1,
          isPublished: true,
        }));
        patchForm.set('registrationFormConfig', JSON.stringify(customFormConfig));
        const patchedRes = await adminProgramsRoute.PATCH(new Request('https://example.com/api/admin/programs', {
          method: 'PATCH',
          headers: { origin: 'https://example.com' },
          body: patchForm,
        }));
        assert.equal(patchedRes.status, 200);
        assert.equal(savedPrograms[1].registrationMaxQuota, null);
        assert.deepEqual(savedPrograms[1].registrationFormConfig, customFormConfig);

        const badRegPatch = await adminRegIdRoute.PATCH(
          new Request('https://example.com/api/admin/program-registrations/bad', {
            method: 'PATCH',
            headers: { origin: 'https://example.com', 'content-type': 'application/json' },
            body: '{}',
          }),
          { params: Promise.resolve({ id: 'bad' }) },
        );
        assert.equal(badRegPatch.status, 400);

        const badCustomRegPatch = await adminRegIdRoute.PATCH(
          new Request('https://example.com/api/admin/program-registrations/' + regId, {
            method: 'PATCH',
            headers: { origin: 'https://example.com', 'content-type': 'application/json' },
            body: JSON.stringify({
              nama: 'Made',
              nim: '22010101',
              noHp: '08123456789',
              customResponses: { asal: 'Undiknas', ukuran: 'INVALID' },
            }),
          }),
          { params: Promise.resolve({ id: regId }) },
        );
        assert.equal(badCustomRegPatch.status, 400);

        const okCustomRegPatch = await adminRegIdRoute.PATCH(
          new Request('https://example.com/api/admin/program-registrations/' + regId, {
            method: 'PATCH',
            headers: { origin: 'https://example.com', 'content-type': 'application/json' },
            body: JSON.stringify({
              nama: 'Made Baru',
              nim: '22010101',
              angkatan: '2024',
              noHp: '08123456789',
              customResponses: { asal: 'Undiknas Baru', ukuran: 'L' },
            }),
          }),
          { params: Promise.resolve({ id: regId }) },
        );
        assert.equal(okCustomRegPatch.status, 200);
        const okPatchJson = await okCustomRegPatch.json();
        assert.equal(okPatchJson.item.angkatan, '');
        assert.deepEqual(okPatchJson.item.customResponses, {
          asal: 'Undiknas Baru',
          ukuran: 'L',
          legacy_key: 'Lama',
        });

        const singleExportRes = await adminExportRoute.GET(
          new Request('https://example.com/api/admin/program-registrations/export?programId=' + programId),
        );
        assert.equal(singleExportRes.status, 200);
        const singleWb = XLSX.read(Buffer.from(await singleExportRes.arrayBuffer()), { type: 'buffer' });
        const singleRows = XLSX.utils.sheet_to_json(singleWb.Sheets['Peserta Program'], { header: 1 });
        assert.deepEqual(singleRows[0], [
          'No',
          'Program Kerja',
          'Periode',
          'Nama Lengkap',
          'NIM',
          'No. HP / WA',
          'Email',
          'Catatan',
          'Waktu Daftar',
          'Asal Instansi',
          'Ukuran Kaos',
          'legacy_key',
        ]);
        assert.equal(singleRows[1][9], 'Undiknas Baru');
        assert.equal(singleRows[1][10], 'L');
        assert.equal(singleRows[1][11], 'Lama');

        const allExportRes = await adminExportRoute.GET(
          new Request('https://example.com/api/admin/program-registrations/export'),
        );
        assert.equal(allExportRes.status, 200);
        const allWb = XLSX.read(Buffer.from(await allExportRes.arrayBuffer()), { type: 'buffer' });
        const allRows = XLSX.utils.sheet_to_json(allWb.Sheets['Peserta Program'], { header: 1 });
        assert.equal(allRows[0].includes('Angkatan'), true);
        assert.equal(allRows[0].includes('Asal Instansi'), true);
        assert.equal(allRows[0].includes('Ukuran Kaos'), true);
      })().catch((err) => { console.error(err); process.exitCode = 1; });
      `,
    ],
    { cwd: process.cwd(), encoding: "utf8", timeout: 20000 },
  );
  assert.equal(
    result.status,
    0,
    result.error?.message || result.stderr || result.stdout,
  );
});

test("AccessError asli tetap menghasilkan 401 walau constructor.name terminifikasi", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--conditions=react-server",
      "--import=tsx",
      "-e",
      `
      const assert = require('node:assert/strict');
      const { AccessError } = require('./src/data/auth.ts');
      const api = require('./src/lib/program-registrations-api.ts');

      const probe = new AccessError();
      assert.equal(probe.name, 'AccessError');

      Object.defineProperty(AccessError, 'name', { value: 'a' });
      const minified = new AccessError();
      assert.equal(minified.constructor.name, 'a');
      assert.equal(minified.name, 'AccessError');

      const throwRealAccessError = async () => {
        throw new AccessError();
      };

      (async () => {
        const listRes = await api.handleAdminProgramRegistrationsGet(
          new Request('https://example.com/api/admin/program-registrations'),
          {
            requireAdmin: throwRealAccessError,
            listProgramRegistrations: async () => [],
            getProgramRegistrationCounts: async () => ({}),
            listPrograms: async () => [],
          },
        );
        assert.equal(listRes.status, 401);
        assert.equal(listRes.headers.get('cache-control'), 'no-store');
        assert.equal((await listRes.json()).error, minified.message);

        const patchRes = await api.handleAdminProgramRegistrationPatch(
          new Request('https://example.com/api/admin/program-registrations/11111111-1111-4111-8111-111111111111', {
            method: 'PATCH',
            headers: { origin: 'https://example.com', 'content-type': 'application/json' },
            body: '{}',
          }),
          '11111111-1111-4111-8111-111111111111',
          {
            requireAdmin: throwRealAccessError,
            updateProgramRegistration: async () => { throw new Error('unreachable'); },
          },
        );
        assert.equal(patchRes.status, 401);

        const deleteRes = await api.handleAdminProgramRegistrationDelete(
          new Request('https://example.com/api/admin/program-registrations/11111111-1111-4111-8111-111111111111', {
            method: 'DELETE',
            headers: { origin: 'https://example.com' },
          }),
          '11111111-1111-4111-8111-111111111111',
          {
            requireAdmin: throwRealAccessError,
            deleteProgramRegistration: async () => { throw new Error('unreachable'); },
          },
        );
        assert.equal(deleteRes.status, 401);

        const exportRes = await api.handleAdminProgramRegistrationsExportGet(
          new Request('https://example.com/api/admin/program-registrations/export'),
          {
            requireAdmin: throwRealAccessError,
            listProgramRegistrations: async () => [],
          },
        );
        assert.equal(exportRes.status, 401);
      })().catch((err) => { console.error(err); process.exitCode = 1; });
      `,
    ],
    { cwd: process.cwd(), encoding: "utf8", timeout: 20000 },
  );
  assert.equal(
    result.status,
    0,
    result.error?.message || result.stderr || result.stdout,
  );
});

test("route PATCH /api/admin/programs/[id]/form memeriksa origin, auth admin, UUID, JSON, mode internal, dan menyimpan pengaturan tanpa mengubah foto", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--conditions=react-server",
      "--import=tsx",
      "-e",
      `
      const assert = require('node:assert/strict');
      const Module = require('node:module');
      const { AccessError } = require('./src/data/auth.ts');
      const originalLoad = Module._load;
      let adminAllowed = false;

      Object.defineProperty(AccessError, 'name', { value: 'a' });

      Module._load = function (request, parent, isMain) {
        if (request === '@/data/auth') {
          return {
            AccessError,
            requireAdmin: async () => {
              if (!adminAllowed) throw new AccessError();
              return { id: 'admin-1', email: 'admin@example.com' };
            },
          };
        }
        return originalLoad.call(this, request, parent, isMain);
      };

      const formRoute = require('./src/app/api/admin/programs/[id]/form/route.ts');
      assert.equal(typeof formRoute.PATCH, 'function');
      assert.equal(formRoute.GET, undefined);
      assert.equal(formRoute.POST, undefined);
      assert.equal(formRoute.DELETE, undefined);

      process.env.DATABASE_URL = 'postgresql://test:test@db.example.invalid:5432/test';
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
      globalThis.prismaConnectionString = process.env.DATABASE_URL;

      const internalId = '11111111-1111-4111-8111-111111111111';
      const externalId = '33333333-3333-4333-8333-333333333333';
      const missingId = '44444444-4444-4444-8444-444444444444';

      let internalRow = {
        id: internalId,
        title: 'IT Versary & Sertijab 2026',
        body: 'Ringkasan acara.',
        fullDescription: 'Deskripsi lengkap acara.',
        period: '2025/2026',
        executionDate: '20 Desember 2026',
        time: '10.00 WITA',
        location: 'Aula Kampus',
        status: 'upcoming',
        icon: 'cake',
        gformLink: '',
        registrationMode: 'internal',
        registrationGroupLink: '',
        registrationMaxQuota: null,
        registrationFormConfig: {
          builtInFields: {
            angkatan: 'required',
            noHp: 'required',
            idLine: 'required',
            email: 'optional',
            catatan: 'optional',
          },
          customFields: [],
        },
        speakers: ['Narasumber 1'],
        benefits: ['Sertifikat'],
        price: 'Gratis',
        contactPerson: 'HIMA TI',
        imagePath: 'programs/existing-cover.webp',
        sortOrder: 4,
        isPublished: true,
        createdAt: new Date('2026-11-18T00:00:00Z'),
        updatedAt: new Date('2026-11-18T00:00:00Z'),
      };
      const externalRow = {
        ...internalRow,
        id: externalId,
        registrationMode: 'external',
        gformLink: 'https://example.com/gform',
      };
      const savedUpdates = [];
      let findCalls = 0;

      globalThis.prisma = {
        $transaction: async (fn) => fn({
          programPeriod: { upsert: async () => ({ period: '2025/2026', isPublished: true }) },
          program: {
            update: async ({ where, data }) => {
              savedUpdates.push({ where, data });
              internalRow = { ...internalRow, ...data };
              return internalRow;
            },
          },
        }),
        program: {
          findUnique: async ({ where }) => {
            findCalls += 1;
            if (where.id === internalId) return internalRow;
            if (where.id === externalId) return externalRow;
            return null;
          },
        },
      };

      const validBody = {
        status: 'open',
        registrationGroupLink: 'https://line.me/ti/g/it-versary',
        registrationMaxQuota: 120,
        registrationFormConfig: {
          builtInFields: {
            angkatan: 'hidden',
            noHp: 'required',
            idLine: 'hidden',
            email: 'required',
            catatan: 'optional',
          },
          customFields: [
            {
              id: 'asal_kampus',
              label: 'Asal Kampus',
              type: 'text',
              required: true,
              placeholder: 'Undiknas',
              options: [],
            },
          ],
        },
      };

      const makeReq = (id, body, headers = {}) =>
        new Request('https://example.com/api/admin/programs/' + id + '/form', {
          method: 'PATCH',
          headers: {
            origin: 'https://example.com',
            host: 'example.com',
            'content-type': 'application/json',
            ...headers,
          },
          body: typeof body === 'string' ? body : JSON.stringify(body),
        });

      (async () => {
        adminAllowed = true;
        const crossOrigin = await formRoute.PATCH(
          makeReq(internalId, validBody, { origin: 'https://evil.example' }),
          { params: Promise.resolve({ id: internalId }) },
        );
        assert.equal(crossOrigin.status, 401);
        assert.equal(crossOrigin.headers.get('cache-control'), 'no-store');
        assert.equal(findCalls, 0);

        adminAllowed = false;
        const unauth = await formRoute.PATCH(
          makeReq(internalId, validBody),
          { params: Promise.resolve({ id: internalId }) },
        );
        assert.equal(unauth.status, 401);
        assert.equal(unauth.headers.get('cache-control'), 'no-store');
        assert.equal(findCalls, 0);

        adminAllowed = true;
        const badUuid = await formRoute.PATCH(
          makeReq('bad-id', validBody),
          { params: Promise.resolve({ id: 'bad-id' }) },
        );
        assert.equal(badUuid.status, 400);
        assert.equal(badUuid.headers.get('cache-control'), 'no-store');
        assert.equal(findCalls, 0);

        const badJson = await formRoute.PATCH(
          makeReq(internalId, '{invalid-json'),
          { params: Promise.resolve({ id: internalId }) },
        );
        assert.equal(badJson.status, 400);
        assert.equal(badJson.headers.get('cache-control'), 'no-store');

        const arrayJson = await formRoute.PATCH(
          makeReq(internalId, '[]'),
          { params: Promise.resolve({ id: internalId }) },
        );
        assert.equal(arrayJson.status, 400);

        const oversizedJson = await formRoute.PATCH(
          makeReq(internalId, { ...validBody, padding: 'x'.repeat(65 * 1024) }),
          { params: Promise.resolve({ id: internalId }) },
        );
        assert.equal(oversizedJson.status, 400);

        const missingProgram = await formRoute.PATCH(
          makeReq(missingId, validBody),
          { params: Promise.resolve({ id: missingId }) },
        );
        assert.equal(missingProgram.status, 400);
        assert.equal((await missingProgram.json()).error, 'Program kerja tidak ditemukan.');

        const externalProgram = await formRoute.PATCH(
          makeReq(externalId, validBody),
          { params: Promise.resolve({ id: externalId }) },
        );
        assert.equal(externalProgram.status, 400);
        assert.equal(
          (await externalProgram.json()).error,
          'Pengaturan formulir hanya tersedia untuk program bermode Formulir Website.',
        );

        const invalidForm = await formRoute.PATCH(
          makeReq(internalId, { ...validBody, registrationGroupLink: 'javascript:alert(1)' }),
          { params: Promise.resolve({ id: internalId }) },
        );
        assert.equal(invalidForm.status, 400);
        assert.equal(savedUpdates.length, 0);

        const ok = await formRoute.PATCH(
          makeReq(internalId, validBody),
          { params: Promise.resolve({ id: internalId }) },
        );
        assert.equal(ok.status, 200);
        assert.equal(ok.headers.get('cache-control'), 'no-store');
        const json = await ok.json();
        assert.equal(savedUpdates.length, 1);
        assert.equal('imagePath' in savedUpdates[0].data, false);
        assert.equal('imageUrl' in savedUpdates[0].data, false);
        assert.equal('id' in savedUpdates[0].data, false);

        assert.equal(json.item.status, 'open');
        assert.equal(json.item.registrationGroupLink, 'https://line.me/ti/g/it-versary');
        assert.equal(json.item.registrationMaxQuota, 120);
        assert.deepEqual(json.item.registrationFormConfig, validBody.registrationFormConfig);
        assert.equal(json.item.title, 'IT Versary & Sertijab 2026');
        assert.equal(json.item.imagePath, 'programs/existing-cover.webp');
        assert.deepEqual(json.item.speakers, ['Narasumber 1']);
        assert.deepEqual(json.item.benefits, ['Sertifikat']);
        assert.equal(json.item.sortOrder, 4);
      })().catch((err) => { console.error(err); process.exitCode = 1; });
      `,
    ],
    { cwd: process.cwd(), encoding: "utf8", timeout: 20000 },
  );
  assert.equal(
    result.status,
    0,
    result.error?.message || result.stderr || result.stdout,
  );
});
