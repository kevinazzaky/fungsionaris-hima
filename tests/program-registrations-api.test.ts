import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import * as XLSX from "xlsx";
import { ValidationError } from "../src/domain/admin";
import { DEFAULT_PROGRAM_FORM_CONFIG } from "../src/domain/program-form-config";
import { validateProgram, type Program } from "../src/domain/programs";
import {
  ConflictError,
  NotFoundError,
  type ProgramRegistration,
  type ProgramRegistrationListItem,
  type ProgramRegistrationRepository,
} from "../src/domain/program-registrations";
import {
  handleAdminProgramRegistrationDelete,
  handleAdminProgramRegistrationPatch,
  handleAdminProgramRegistrationsExportGet,
  handleAdminProgramRegistrationsGet,
  handlePublicProgramRegistrationPost,
  normalizeAdminProgramPayload,
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

  const oversized = await handlePublicProgramRegistrationPost(
    makeJsonRequest(
      "https://example.com/api/program-registrations",
      "POST",
      JSON.stringify({ ...validPayload, catatan: "a".repeat(20_000) }),
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

test("POST publik memetakan ValidationError, NotFoundError, ConflictError, error tak terduga, dan sukses 201 tanpa PII ekstra", async () => {
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
    "id",
    "nama",
    "nim",
    "programId",
    "submittedAt",
  ]);
  assert.equal("noHp" in successJson.registration, false);
  assert.equal("idLine" in successJson.registration, false);
  assert.equal("email" in successJson.registration, false);
  assert.equal("catatan" in successJson.registration, false);

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
      const originalLoad = Module._load;
      let adminAllowed = false;
      const programId = '11111111-1111-4111-8111-111111111111';
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
      globalThis.prismaConnectionString = process.env.DATABASE_URL;
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
          findMany: async () => [],
          findUnique: async () => ({
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
            speakers: [],
            benefits: [],
            price: '',
            contactPerson: '',
            imagePath: null,
            sortOrder: 0,
            isPublished: true,
          }),
        },
        programPeriod: { findMany: async () => [] },
        programRegistration: { groupBy: async () => [{ programId, _count: { _all: 5 } }] },
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
        const patchedRes = await adminProgramsRoute.PATCH(new Request('https://example.com/api/admin/programs', {
          method: 'PATCH',
          headers: { origin: 'https://example.com' },
          body: patchForm,
        }));
        assert.equal(patchedRes.status, 200);
        assert.equal(savedPrograms[1].registrationMaxQuota, null);

        const badRegPatch = await adminRegIdRoute.PATCH(
          new Request('https://example.com/api/admin/program-registrations/bad', {
            method: 'PATCH',
            headers: { origin: 'https://example.com', 'content-type': 'application/json' },
            body: '{}',
          }),
          { params: Promise.resolve({ id: 'bad' }) },
        );
        assert.equal(badRegPatch.status, 400);
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
