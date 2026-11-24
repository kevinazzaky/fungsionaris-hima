import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { ModuleKind, ScriptTarget, transpileModule } from "typescript";
import { ValidationError } from "../src/domain/admin";
import {
  DEFAULT_PROGRAM_FORM_CONFIG,
  createPresetCohortTiers,
  type ProgramFormConfig,
} from "../src/domain/program-form-config";
import type { Program, ProgramRepository } from "../src/domain/programs";
import {
  ConflictError,
  NotFoundError,
  validateProgramRegistrationAdminUpdate,
  validateProgramRegistrationInput,
  type ProgramRegistration,
  type ProgramRegistrationListItem,
  type ProgramRegistrationRepository,
} from "../src/domain/program-registrations";
import { registerProgram } from "../src/use-cases/register-program";
import {
  deleteProgramRegistration,
  getProgramRegistrationCounts,
  listProgramRegistrations,
  updateProgramRegistration,
} from "../src/use-cases/manage-program-registrations";

const validInput = {
  nama: "I Made Santika",
  nim: "00123456",
  angkatan: "2024",
  noHp: "+62 812-3456-7890",
  idLine: "santika_ti",
  email: "santika@undiknas.ac.id",
  catatan: "Siap mengikuti acara.\r\nTerima kasih.",
};

const baseProgram: Program = {
  id: "11111111-1111-4111-8111-111111111111",
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

function makeRegistration(
  overrides: Partial<ProgramRegistration> = {},
): ProgramRegistration {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    programId: baseProgram.id,
    nama: validInput.nama,
    nim: validInput.nim,
    angkatan: validInput.angkatan,
    noHp: validInput.noHp,
    idLine: validInput.idLine,
    email: validInput.email,
    catatan: "Siap mengikuti acara.\nTerima kasih.",
    customResponses: {},
    submittedAt: new Date("2026-11-17T08:00:00Z"),
    createdAt: new Date("2026-11-17T08:00:00Z"),
    ...overrides,
  };
}

test("validasi pendaftaran peserta program kerja menerima NIM Undiknas, format kontak, dan menormalisasi catatan", () => {
  const parsed = validateProgramRegistrationInput(validInput);
  assert.equal(parsed.nim, "00123456");
  assert.equal(parsed.angkatan, "2024");
  assert.equal(parsed.noHp, "+62 812-3456-7890");
  assert.equal(parsed.catatan, "Siap mengikuti acara.\nTerima kasih.");

  const minimal = validateProgramRegistrationInput({
    nama: "Ni Luh Putu",
    nim: "12345",
    angkatan: "2027",
    noHp: "08123456",
    idLine: "ab",
    email: "",
    catatan: undefined,
  });
  assert.equal(minimal.email, "");
  assert.equal(minimal.catatan, "");
});

test("validasi pendaftaran peserta program kerja menolak karakter kontrol dan input tidak valid", () => {
  for (const invalid of [
    { nama: "" },
    { nama: "A" },
    { nama: "A   " },
    { nama: "A".repeat(101) },
    { nama: "\nBudi Santoso" },
    { nama: "Budi\tSantoso" },
    { nama: "Budi\x00" },
    { nim: "1234" },
    { nim: "1".repeat(31) },
    { nim: "2201010a" },
    { nim: "1234 5678" },
    { nim: "00123456\n" },
    { angkatan: "24" },
    { angkatan: "202" },
    { angkatan: "20250" },
    { angkatan: "abcd" },
    { angkatan: "1899" },
    { angkatan: "3001" },
    { noHp: "" },
    { noHp: "0812345" },
    { noHp: "0".repeat(21) },
    { noHp: "--------" },
    { noHp: "0812abcdef" },
    { noHp: "08123456\t" },
    { idLine: "" },
    { idLine: "a" },
    { idLine: "a".repeat(65) },
    { idLine: "line\nid" },
    { email: "a" },
    { email: "bukan-email" },
    { email: "nama@kampus" },
    { email: "a b@kampus.ac.id" },
    { email: "a..b@kampus.ac.id" },
    { email: `${"a".repeat(110)}@kampus.ac.id` },
    { email: "a@b.com\n" },
    { catatan: "a".repeat(301) },
    { catatan: "halo\x00" },
    { catatan: "halo\rdunia" },
  ]) {
    assert.throws(
      () => validateProgramRegistrationInput({ ...validInput, ...invalid }),
      ValidationError,
    );
  }
});

test("validasi edit admin mengizinkan kontak kosong opsional sambil memvalidasi format bila diisi", () => {
  const edited = validateProgramRegistrationAdminUpdate({
    ...validInput,
    noHp: "",
    idLine: "",
    email: "",
    catatan: "",
    programId: "other-program",
    submittedAt: "2020-01-01T00:00:00Z",
    createdAt: "2020-01-01T00:00:00Z",
  });
  assert.equal(edited.noHp, "");
  assert.equal(edited.idLine, "");
  assert.ok(!("programId" in edited));
  assert.ok(!("submittedAt" in edited));
  assert.ok(!("createdAt" in edited));
  assert.throws(
    () =>
      validateProgramRegistrationAdminUpdate({
        ...validInput,
        noHp: "123",
      }),
    ValidationError,
  );
});

test("registerProgram memeriksa publikasi, mode internal, status buka, kuota, dan konflik NIM", async () => {
  const stored: ProgramRegistration[] = [];
  let currentProgram: Program | null = { ...baseProgram };
  const programRepo: Pick<ProgramRepository, "getPublished"> = {
    getPublished: async () => currentProgram,
  };
  const regRepo: Pick<
    ProgramRegistrationRepository,
    "countByProgram" | "create"
  > = {
    countByProgram: async (programId) =>
      stored.filter((row) => row.programId === programId).length,
    create: async (programId, input) => {
      if (stored.some((row) => row.programId === programId && row.nim === input.nim)) {
        throw Object.assign(new Error("unique"), { code: "P2002" });
      }
      const row = makeRegistration({ ...input, programId });
      stored.push(row);
      return row;
    },
  };

  const created = await registerProgram(
    programRepo,
    regRepo,
    baseProgram.id,
    validInput,
  );
  assert.equal(created.registration.nim, validInput.nim);
  assert.equal(created.programTitle, baseProgram.title);
  assert.equal(
    created.registrationGroupLink,
    baseProgram.registrationGroupLink,
  );

  await assert.rejects(
    registerProgram(programRepo, regRepo, baseProgram.id, validInput),
    (error: unknown) =>
      error instanceof ConflictError &&
      error.reason === "duplicate" &&
      /sudah terdaftar/i.test(error.message),
  );

  await registerProgram(programRepo, regRepo, baseProgram.id, {
    ...validInput,
    nim: "22010202",
  });
  assert.equal(stored.length, 2);

  await assert.rejects(
    registerProgram(programRepo, regRepo, baseProgram.id, {
      ...validInput,
      nim: "22010303",
    }),
    (error: unknown) =>
      error instanceof ConflictError &&
      error.reason === "quota" &&
      /penuh/i.test(error.message),
  );
  assert.equal(stored.length, 2);

  currentProgram = { ...baseProgram, registrationMaxQuota: null };
  const unlimited = await registerProgram(programRepo, regRepo, baseProgram.id, {
    ...validInput,
    nim: "22010303",
  });
  assert.equal(unlimited.registration.nim, "22010303");

  currentProgram = { ...baseProgram, registrationMode: "external" };
  await assert.rejects(
    registerProgram(programRepo, regRepo, baseProgram.id, {
      ...validInput,
      nim: "22010404",
    }),
    ValidationError,
  );

  for (const status of ["upcoming", "closed"] as const) {
    currentProgram = { ...baseProgram, status };
    await assert.rejects(
      registerProgram(programRepo, regRepo, baseProgram.id, {
        ...validInput,
        nim: "22010404",
      }),
      ValidationError,
    );
  }

  currentProgram = { ...baseProgram, isPublished: false };
  await assert.rejects(
    registerProgram(programRepo, regRepo, baseProgram.id, {
      ...validInput,
      nim: "22010404",
    }),
    NotFoundError,
  );

  currentProgram = null;
  await assert.rejects(
    registerProgram(programRepo, regRepo, baseProgram.id, {
      ...validInput,
      nim: "22010404",
    }),
    NotFoundError,
  );
});

test("use case admin pendaftar program mendukung filter, hitung jumlah, update aman, dan hapus", async () => {
  const original = makeRegistration();
  let updatedArgs: unknown = null;
  const repo: ProgramRegistrationRepository = {
    create: async () => original,
    get: async () => original,
    list: async (filter) => {
      assert.deepEqual(filter, { programId: baseProgram.id, q: "santika" });
      const item: ProgramRegistrationListItem = {
        ...original,
        programTitle: baseProgram.title,
        programPeriod: baseProgram.period,
      };
      return [item];
    },
    update: async (id, input) => {
      updatedArgs = { id, input };
      if (input.nim === "99999999") {
        throw Object.assign(new Error("unique"), { code: "P2002" });
      }
      return { ...original, ...input };
    },
    delete: async (id) => {
      assert.equal(id, original.id);
      return original;
    },
    countByProgram: async () => 1,
    countsByProgram: async () => ({ [baseProgram.id]: 3 }),
    countsByCohort: async () => ({ "2024": 1 }),
  };

  const list = await listProgramRegistrations(repo, {
    programId: ` ${baseProgram.id} `,
    q: "  santika  ",
  });
  assert.equal(list.length, 1);
  assert.equal(list[0].programTitle, baseProgram.title);

  assert.deepEqual(await getProgramRegistrationCounts(repo), {
    [baseProgram.id]: 3,
  });

  const updated = await updateProgramRegistration(repo, original.id, {
    ...validInput,
    nama: "Nama Baru",
    programId: "tampered",
    submittedAt: null,
    createdAt: null,
  });
  assert.equal(updated.nama, "Nama Baru");
  assert.equal(updated.programId, original.programId);
  assert.equal(updated.submittedAt, original.submittedAt);
  assert.equal(updated.createdAt, original.createdAt);
  assert.ok(updatedArgs);

  await assert.rejects(
    updateProgramRegistration(repo, original.id, {
      ...validInput,
      nim: "99999999",
    }),
    (error: unknown) =>
      error instanceof ConflictError && error.reason === "duplicate",
  );

  const deleted = await deleteProgramRegistration(repo, original.id);
  assert.equal(deleted.id, original.id);
});

test("loader publik loadPrograms dan loadProgramRegistrationPage tidak membocorkan link grup maupun daftar peserta", async () => {
  const calls: string[] = [];
  let configured = false;
  const source = await readFile("src/data/programs.ts", "utf8");
  const modules: Record<string, unknown> = {
    "server-only": {},
    "next/server": {
      connection: async () => {
        calls.push("connection");
      },
    },
    "@/lib/backend-config": {
      isDatabaseConfigured: () => configured,
    },
    "@/lib/program-seed": {
      initialPrograms: [baseProgram],
    },
    "./repositories/programs": {
      programRepository: {
        list: async (publishedOnly: boolean) => {
          calls.push(`list:${publishedOnly}`);
          return [baseProgram];
        },
        getPublished: async (id: string) => {
          calls.push(`getPublished:${id}`);
          return id === baseProgram.id ? baseProgram : null;
        },
      },
    },
    "./repositories/program-registrations": {
      programRegistrationRepository: {
        countByProgram: async (id: string) => {
          calls.push(`count:${id}`);
          return 12;
        },
        countsByCohort: async (id: string) => {
          calls.push(`cohortCounts:${id}`);
          return { "2023": 2, "2024": 5 };
        },
      },
    },
  };
  const context = {
    exports: {},
    require: (name: string) => {
      assert.ok(Object.hasOwn(modules, name), `Unexpected dependency: ${name}`);
      return modules[name];
    },
  };
  runInNewContext(
    transpileModule(source, {
      compilerOptions: {
        module: ModuleKind.CommonJS,
        target: ScriptTarget.ES2017,
      },
    }).outputText,
    context,
  );
  const loader = context.exports as {
    loadPrograms(): Promise<Program[]>;
    loadProgramRegistrationPage(id: string): Promise<{
      program: Program | null;
      registeredCount: number;
      cohortCounts: Record<string, number>;
      configured: boolean;
    }>;
  };

  const fallbackPrograms = await loader.loadPrograms();
  assert.equal(fallbackPrograms[0].registrationGroupLink, "");
  assert.deepEqual(
    JSON.parse(
      JSON.stringify(await loader.loadProgramRegistrationPage(baseProgram.id)),
    ),
    {
      program: { ...baseProgram, registrationGroupLink: "" },
      registeredCount: 0,
      cohortCounts: {},
      configured: false,
    },
  );
  assert.deepEqual(calls, []);

  configured = true;
  const pageData = JSON.parse(
    JSON.stringify(await loader.loadProgramRegistrationPage(baseProgram.id)),
  );
  assert.equal(pageData.configured, true);
  assert.equal(pageData.registeredCount, 12);
  assert.deepEqual(pageData.cohortCounts, { "2023": 2, "2024": 5 });
  assert.equal(pageData.program?.id, baseProgram.id);
  assert.equal(pageData.program?.registrationGroupLink, "");
  assert.deepEqual(
    pageData.program?.registrationFormConfig,
    DEFAULT_PROGRAM_FORM_CONFIG,
  );
  assert.deepEqual(Object.keys(pageData).sort(), [
    "cohortCounts",
    "configured",
    "program",
    "registeredCount",
  ]);
  assert.deepEqual(
    JSON.parse(
      JSON.stringify(await loader.loadProgramRegistrationPage("missing-id")),
    ),
    {
      program: null,
      registeredCount: 0,
      cohortCounts: {},
      configured: true,
    },
  );
});

test("repository Prisma menangani transaksi kuota atomik, P2002, P2003 delete, P2025, dan filter/count", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--conditions=react-server",
      "--import=tsx",
      "-e",
      `
      const assert = require('node:assert/strict');
      const { Prisma } = require('./src/generated/prisma/client');
      const { programRepository } = require('./src/data/repositories/programs.ts');
      const { programRegistrationRepository } = require('./src/data/repositories/program-registrations.ts');
      const { ValidationError } = require('./src/domain/admin');
      const { ConflictError, NotFoundError } = require('./src/domain/program-registrations');

      process.env.DATABASE_URL = 'postgresql://test:test@db.example.invalid:5432/test';
      globalThis.prismaConnectionString = process.env.DATABASE_URL;

      const programId = '11111111-1111-4111-8111-111111111111';
      const regId = '22222222-2222-4222-8222-222222222222';
      let currentCount = 0;
      let throwP2002 = false;
      let deleteError = null;
      const programRow = {
        id: programId,
        status: 'open',
        registrationMode: 'internal',
        registrationMaxQuota: 1,
        registrationFormConfig: {
          builtInFields: {
            angkatan: 'required',
            noHp: 'required',
            idLine: 'required',
            email: 'optional',
            catatan: 'optional',
          },
          customFields: [
            {
              id: 'asal_instansi',
              label: 'Asal Instansi',
              type: 'text',
              required: true,
              placeholder: '',
              options: [],
            },
          ],
        },
        isPublished: true,
        periodPublished: true,
      };
      const savedRow = {
        id: regId,
        programId,
        nama: 'Made',
        nim: '22010101',
        angkatan: '2024',
        noHp: '08123456789',
        idLine: 'made_ti',
        email: '',
        catatan: '',
        customResponses: { asal_instansi: 'Undiknas' },
        submittedAt: new Date('2026-11-17T08:00:00Z'),
        createdAt: new Date('2026-11-17T08:00:00Z'),
      };

      const cohortCounts = {};
      const tx = {
        $queryRaw: async () => [programRow],
        programRegistration: {
          count: async ({ where }) => {
            if (where && where.angkatan) {
              return cohortCounts[where.angkatan] || 0;
            }
            return currentCount;
          },
          create: async ({ data }) => {
            if (throwP2002) {
              throw new Prisma.PrismaClientKnownRequestError('Unique', { code: 'P2002', clientVersion: '7.10.1' });
            }
            currentCount++;
            if (data.angkatan) {
              cohortCounts[data.angkatan] = (cohortCounts[data.angkatan] || 0) + 1;
            }
            return { ...savedRow, ...data };
          },
        },
      };

      globalThis.prisma = {
        $transaction: async (fn) => fn(tx),
        program: {
          findFirst: async ({ where }) => {
            assert.deepEqual(where, { id: programId, isPublished: true, programPeriod: { isPublished: true } });
            return {
              ...programRow,
              title: 'IT Versary & Sertijab 2026',
              body: 'Ringkasan',
              fullDescription: '',
              period: '2025/2026',
              executionDate: '',
              time: '',
              location: '',
              icon: 'cake',
              gformLink: '',
              registrationGroupLink: '',
              registrationFormConfig: programRow.registrationFormConfig,
              speakers: [],
              benefits: [],
              price: '',
              contactPerson: '',
              imagePath: null,
              sortOrder: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          },
          delete: async () => {
            if (deleteError) throw deleteError;
            return { ...programRow, title: 'T', body: 'B', fullDescription: '', period: '2025/2026', executionDate: '', time: '', location: '', icon: 'cake', gformLink: '', registrationGroupLink: '', speakers: [], benefits: [], price: '', contactPerson: '', imagePath: null, sortOrder: 0, isPublished: true };
          },
        },
        programRegistration: {
          findUnique: async () => savedRow,
          findMany: async ({ where }) => {
            assert.equal(where.programId, programId);
            assert.ok(Array.isArray(where.OR));
            return [{ ...savedRow, program: { title: 'IT Versary & Sertijab 2026', period: '2025/2026' } }];
          },
          groupBy: async ({ by }) => {
            if (by && by[0] === 'angkatan') {
              return [
                { angkatan: '2024', _count: { _all: 2 } },
                { angkatan: '2025', _count: { _all: 1 } },
                { angkatan: '', _count: { _all: 1 } },
              ];
            }
            return [{ programId, _count: { _all: 4 } }];
          },
          update: async ({ data }) => {
            if (data.nim === '99999999') {
              throw new Prisma.PrismaClientKnownRequestError('Unique', { code: 'P2002', clientVersion: '7.10.1' });
            }
            return { ...savedRow, ...data };
          },
          delete: async () => {
            throw new Prisma.PrismaClientKnownRequestError('Missing', { code: 'P2025', clientVersion: '7.10.1' });
          },
        },
      };

      (async () => {
        const pub = await programRepository.getPublished(programId);
        assert.equal(pub.id, programId);
        assert.equal(pub.registrationFormConfig.customFields[0].id, 'asal_instansi');
        assert.equal(await programRepository.getPublished('invalid-uuid'), null);

        deleteError = new Prisma.PrismaClientKnownRequestError('FK', { code: 'P2003', clientVersion: '7.10.1' });
        await assert.rejects(programRepository.delete(programId), ValidationError);

        await assert.rejects(
          programRegistrationRepository.create(programId, {
            nama: 'Made', nim: '22010101', angkatan: '2024', noHp: '08123456789', idLine: 'made_ti', email: '', catatan: '', customResponses: {},
          }),
          ValidationError,
        );

        const created = await programRegistrationRepository.create(programId, {
          nama: 'Made', nim: '22010101', angkatan: '2024', noHp: '08123456789', idLine: 'made_ti', email: '', catatan: '', customResponses: { asal_instansi: 'Undiknas', extra: 'ignored' },
        });
        assert.equal(created.id, regId);
        assert.deepEqual(created.customResponses, { asal_instansi: 'Undiknas' });

        const fetched = await programRegistrationRepository.get(regId);
        assert.deepEqual(fetched.customResponses, { asal_instansi: 'Undiknas' });

        await assert.rejects(
          programRegistrationRepository.create(programId, {
            nama: 'Ketut', nim: '22010102', angkatan: '2024', noHp: '08123456789', idLine: 'ketut', email: '', catatan: '', customResponses: { asal_instansi: 'Undiknas' },
          }),
          (e) => e instanceof ConflictError && e.reason === 'quota',
        );

        programRow.registrationMaxQuota = null;
        throwP2002 = true;
        await assert.rejects(
          programRegistrationRepository.create(programId, {
            nama: 'Made', nim: '22010101', angkatan: '2024', noHp: '08123456789', idLine: 'made_ti', email: '', catatan: '', customResponses: { asal_instansi: 'Undiknas' },
          }),
          (e) => e instanceof ConflictError && e.reason === 'duplicate',
        );

        const list = await programRegistrationRepository.list({ programId, q: 'made' });
        assert.equal(list[0].programTitle, 'IT Versary & Sertijab 2026');
        assert.deepEqual(list[0].customResponses, { asal_instansi: 'Undiknas' });
        assert.deepEqual(await programRegistrationRepository.countsByProgram(), { [programId]: 4 });
        assert.deepEqual(await programRegistrationRepository.countsByCohort(programId), { '2024': 2, '2025': 1 });
        assert.deepEqual(await programRegistrationRepository.countsByCohort('invalid-uuid'), {});

        throwP2002 = false;
        programRow.registrationMaxQuota = 10;
        programRow.registrationFormConfig = {
          ...programRow.registrationFormConfig,
          cohortQuotas: {
            enabled: true,
            tiers: [
              { angkatan: '2024', maxQuota: 1 },
              { angkatan: '2025', maxQuota: 1 },
            ],
          },
        };
        await assert.rejects(
          programRegistrationRepository.create(programId, {
            nama: 'Nyoman', nim: '22010901', angkatan: '2022', noHp: '08123456789', idLine: 'nyoman', email: '', catatan: '', customResponses: { asal_instansi: 'Undiknas' },
          }),
          ValidationError,
        );
        await assert.rejects(
          programRegistrationRepository.create(programId, {
            nama: 'Wayan', nim: '22010902', angkatan: '2024', noHp: '08123456789', idLine: 'wayan', email: '', catatan: '', customResponses: { asal_instansi: 'Undiknas' },
          }),
          (e) => e instanceof ConflictError && e.reason === 'quota' && /angkatan 2024/i.test(e.message),
        );
        const created2025 = await programRegistrationRepository.create(programId, {
          nama: 'Komang', nim: '22010903', angkatan: '2025', noHp: '08123456789', idLine: 'komang', email: '', catatan: '', customResponses: { asal_instansi: 'Undiknas' },
        });
        assert.equal(created2025.angkatan, '2025');

        const updated = await programRegistrationRepository.update(regId, {
          nama: 'Made', nim: '22010101', angkatan: '2024', noHp: '', idLine: '', email: '', catatan: '', customResponses: { asal_instansi: 'Undiknas Baru' },
        });
        assert.deepEqual(updated.customResponses, { asal_instansi: 'Undiknas Baru' });

        await assert.rejects(
          programRegistrationRepository.update(regId, {
            nama: 'Made', nim: '99999999', angkatan: '2024', noHp: '', idLine: '', email: '', catatan: '', customResponses: {},
          }),
          ConflictError,
        );
        await assert.rejects(programRegistrationRepository.delete(regId), NotFoundError);
      })().catch(error => { console.error(error); process.exitCode = 1; });
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

const customFormConfig: ProgramFormConfig = {
  builtInFields: {
    angkatan: "hidden",
    noHp: "optional",
    idLine: "hidden",
    email: "required",
    catatan: "required",
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
      id: "semester",
      label: "Semester",
      type: "number",
      required: true,
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
      id: "tanggal_lahir",
      label: "Tanggal Lahir",
      type: "date",
      required: false,
      placeholder: "",
      options: [],
    },
    {
      id: "setuju",
      label: "Persetujuan Tata Tertib",
      type: "checkbox",
      required: true,
      placeholder: "",
      options: [],
    },
    {
      id: "relawan",
      label: "Bersedia Jadi Relawan",
      type: "checkbox",
      required: false,
      placeholder: "",
      options: [],
    },
  ],
};

test("validasi pendaftaran mematuhi mode kolom bawaan dan seluruh tipe kolom kustom", () => {
  const parsed = validateProgramRegistrationInput(
    {
      nama: "Ni Putu Ayu",
      nim: "22010505",
      angkatan: "bukan-tahun",
      noHp: "",
      idLine: "nilai-lama-tersembunyi",
      email: "ayu@undiknas.ac.id",
      catatan: "Siap mengikuti\r\nacara.",
      customResponses: {
        asal: "  Undiknas Denpasar  ",
        motivasi: "Belajar\r\nlebih dalam",
        semester: "4",
        ukuran: "M",
        tanggal_lahir: "2004-02-29",
        setuju: true,
        unknown_key: "harus dibuang",
      },
    },
    customFormConfig,
  );
  assert.equal(parsed.angkatan, "");
  assert.equal(parsed.noHp, "");
  assert.equal(parsed.idLine, "");
  assert.equal(parsed.email, "ayu@undiknas.ac.id");
  assert.equal(parsed.catatan, "Siap mengikuti\nacara.");
  assert.deepEqual(parsed.customResponses, {
    asal: "Undiknas Denpasar",
    motivasi: "Belajar\nlebih dalam",
    semester: "4",
    ukuran: "M",
    tanggal_lahir: "2004-02-29",
    setuju: true,
    relawan: false,
  });
  assert.equal("unknown_key" in parsed.customResponses, false);

  const validCustomBase = {
    nama: "Ni Putu Ayu",
    nim: "22010505",
    email: "ayu@undiknas.ac.id",
    catatan: "Siap",
    customResponses: {
      asal: "Undiknas",
      semester: "4",
      ukuran: "L",
      setuju: true,
    },
  };

  for (const bad of [
    { ...validCustomBase, email: "" },
    { ...validCustomBase, catatan: "" },
    { ...validCustomBase, noHp: "123" },
    { ...validCustomBase, customResponses: [] },
    { ...validCustomBase, customResponses: "str" },
    {
      ...validCustomBase,
      customResponses: { ...validCustomBase.customResponses, asal: "" },
    },
    {
      ...validCustomBase,
      customResponses: {
        ...validCustomBase.customResponses,
        asal: "a".repeat(201),
      },
    },
    {
      ...validCustomBase,
      customResponses: {
        ...validCustomBase.customResponses,
        asal: "baris\ndua",
      },
    },
    {
      ...validCustomBase,
      customResponses: {
        ...validCustomBase.customResponses,
        motivasi: "a".repeat(501),
      },
    },
    {
      ...validCustomBase,
      customResponses: {
        ...validCustomBase.customResponses,
        semester: "1e5",
      },
    },
    {
      ...validCustomBase,
      customResponses: {
        ...validCustomBase.customResponses,
        semester: "1".repeat(31),
      },
    },
    {
      ...validCustomBase,
      customResponses: {
        ...validCustomBase.customResponses,
        ukuran: "XXL",
      },
    },
    {
      ...validCustomBase,
      customResponses: {
        ...validCustomBase.customResponses,
        tanggal_lahir: "2026-02-29",
      },
    },
    {
      ...validCustomBase,
      customResponses: {
        ...validCustomBase.customResponses,
        tanggal_lahir: "2026/02/28",
      },
    },
    {
      ...validCustomBase,
      customResponses: {
        ...validCustomBase.customResponses,
        setuju: false,
      },
    },
    {
      ...validCustomBase,
      customResponses: {
        ...validCustomBase.customResponses,
        setuju: "true",
      },
    },
  ]) {
    assert.throws(
      () => validateProgramRegistrationInput(bad, customFormConfig),
      ValidationError,
    );
  }
});

test("registerProgram dan updateProgramRegistration memvalidasi terhadap konfigurasi program serta mempertahankan key historis", async () => {
  const customProgram: Program = {
    ...baseProgram,
    registrationFormConfig: customFormConfig,
  };
  let savedReg = makeRegistration({
    programId: customProgram.id,
    angkatan: "",
    noHp: "",
    idLine: "",
    email: "ayu@undiknas.ac.id",
    catatan: "Siap",
    customResponses: {
      asal: "Undiknas",
      semester: "4",
      ukuran: "M",
      setuju: true,
      legacy_question: "Jawaban lama",
    },
  });

  const programRepo: Pick<ProgramRepository, "getPublished" | "get"> = {
    getPublished: async () => customProgram,
    get: async () => customProgram,
  };
  const regRepo: ProgramRegistrationRepository = {
    countByProgram: async () => 0,
    countsByProgram: async () => ({ [customProgram.id]: 1 }),
    countsByCohort: async () => ({}),
    list: async () => [],
    get: async (id) => (id === savedReg.id ? savedReg : null),
    create: async (_pid, input) => {
      savedReg = makeRegistration({ ...input, programId: customProgram.id });
      return savedReg;
    },
    update: async (_id, input) => {
      savedReg = { ...savedReg, ...input };
      return savedReg;
    },
    delete: async () => savedReg,
  };

  const registered = await registerProgram(programRepo, regRepo, customProgram.id, {
    nama: "Ni Putu Ayu",
    nim: "22010505",
    email: "ayu@undiknas.ac.id",
    catatan: "Siap",
    customResponses: {
      asal: "Undiknas",
      semester: -2.5,
      ukuran: "S",
      setuju: true,
      extra_field: "dibuang",
    },
  });
  assert.equal(registered.registration.angkatan, "");
  assert.equal(registered.registration.customResponses.asal, "Undiknas");
  assert.equal(registered.registration.customResponses.semester, "-2.5");
  assert.equal("extra_field" in registered.registration.customResponses, false);

  // Preserve historical key when updating against current form config
  savedReg = {
    ...savedReg,
    customResponses: {
      ...savedReg.customResponses,
      legacy_question: "Jawaban lama",
    },
  };
  const updated = await updateProgramRegistration(
    regRepo,
    savedReg.id,
    {
      nama: "Ni Putu Ayu Diperbarui",
      nim: "22010505",
      email: "ayu@undiknas.ac.id",
      catatan: "Siap",
      customResponses: {
        asal: "Undiknas Baru",
        semester: "6",
        ukuran: "L",
        setuju: true,
        hacker_key: "diabaikan",
      },
    },
    programRepo,
  );
  assert.equal(updated.nama, "Ni Putu Ayu Diperbarui");
  assert.equal(updated.customResponses.asal, "Undiknas Baru");
  assert.equal(updated.customResponses.legacy_question, "Jawaban lama");
  assert.equal("hacker_key" in updated.customResponses, false);

  await assert.rejects(
    updateProgramRegistration(
      regRepo,
      "missing-reg",
      {
        nama: "Test",
        nim: "22010505",
      },
      programRepo,
    ),
    NotFoundError,
  );

  // Admin edit enforces hidden built-in fields and custom fields while keeping non-hidden contacts lenient.
  const adminEdited = validateProgramRegistrationAdminUpdate(
    {
      nama: "Ni Putu Ayu",
      nim: "22010505",
      angkatan: "2024",
      noHp: "",
      idLine: "line_lama",
      email: "",
      catatan: "",
      customResponses: {
        asal: "Undiknas",
        semester: "4",
        ukuran: "M",
        setuju: true,
      },
    },
    customFormConfig,
  );
  assert.equal(adminEdited.angkatan, "");
  assert.equal(adminEdited.idLine, "");
  assert.equal(adminEdited.email, "");
  assert.throws(
    () =>
      validateProgramRegistrationAdminUpdate(
        {
          nama: "Ni Putu Ayu",
          nim: "22010505",
          customResponses: {
            asal: "",
            semester: "4",
            ukuran: "M",
            setuju: true,
          },
        },
        customFormConfig,
      ),
    ValidationError,
  );

  // Missing/unpublished program must fail with NotFoundError before custom field validation runs.
  await assert.rejects(
    registerProgram(
      { getPublished: async () => null },
      regRepo,
      customProgram.id,
      { nama: "Ayu", nim: "22010505" },
    ),
    NotFoundError,
  );
});

test("kuota per angkatan membatasi whitelist publik, mengizinkan edit admin historis, dan menegakkan kuota per angkatan serta kuota total", async () => {
  const cohortFormConfig: ProgramFormConfig = {
    builtInFields: { ...DEFAULT_PROGRAM_FORM_CONFIG.builtInFields },
    customFields: [],
    cohortQuotas: {
      enabled: true,
      tiers: createPresetCohortTiers(2023, 2026, 5),
    },
  };

  // Public input rejects angkatan outside whitelist (e.g. 2022) and accepts listed angkatan.
  const accepted = validateProgramRegistrationInput(
    { ...validInput, angkatan: "2024" },
    cohortFormConfig,
  );
  assert.equal(accepted.angkatan, "2024");

  assert.throws(
    () =>
      validateProgramRegistrationInput(
        { ...validInput, angkatan: "2022" },
        cohortFormConfig,
      ),
    (error: unknown) =>
      error instanceof ValidationError &&
      error.message ===
        "Pendaftaran program ini hanya dibuka untuk angkatan 2023, 2024, 2025, 2026.",
  );

  // Admin edit remains allowed for historical cohorts outside the whitelist.
  const historicalAdminEdit = validateProgramRegistrationAdminUpdate(
    { ...validInput, angkatan: "2022" },
    cohortFormConfig,
  );
  assert.equal(historicalAdminEdit.angkatan, "2022");

  // registerProgram enforces 5-per-cohort limit while allowing other cohorts and enforcing overall registrationMaxQuota.
  const stored: ProgramRegistration[] = [];
  const cohortProgram: Program = {
    ...baseProgram,
    registrationMaxQuota: 6,
    registrationFormConfig: cohortFormConfig,
  };
  const programRepo: Pick<ProgramRepository, "getPublished"> = {
    getPublished: async () => cohortProgram,
  };
  const regRepo: Pick<
    ProgramRegistrationRepository,
    "countByProgram" | "countsByCohort" | "create"
  > = {
    countByProgram: async (programId) =>
      stored.filter((row) => row.programId === programId).length,
    countsByCohort: async (programId) => {
      const counts: Record<string, number> = {};
      for (const row of stored) {
        if (row.programId === programId && row.angkatan) {
          counts[row.angkatan] = (counts[row.angkatan] ?? 0) + 1;
        }
      }
      return counts;
    },
    create: async (programId, input) => {
      const row = makeRegistration({ ...input, programId });
      stored.push(row);
      return row;
    },
  };

  for (let i = 1; i <= 5; i += 1) {
    await registerProgram(programRepo, regRepo, cohortProgram.id, {
      ...validInput,
      nim: `2401000${i}`,
      angkatan: "2024",
    });
  }
  assert.equal(stored.length, 5);

  // 6th registrant from 2024 is rejected with ConflictError("quota").
  await assert.rejects(
    registerProgram(programRepo, regRepo, cohortProgram.id, {
      ...validInput,
      nim: "24010006",
      angkatan: "2024",
    }),
    (error: unknown) =>
      error instanceof ConflictError &&
      error.reason === "quota" &&
      error.message ===
        "Kuota pendaftaran untuk angkatan 2024 sudah penuh (maksimal 5 peserta).",
  );
  assert.equal(stored.length, 5);

  // Registrant from 2022 is rejected with ValidationError.
  await assert.rejects(
    registerProgram(programRepo, regRepo, cohortProgram.id, {
      ...validInput,
      nim: "22010001",
      angkatan: "2022",
    }),
    ValidationError,
  );

  // Registrant from 2025 still succeeds (total reaches 6 = registrationMaxQuota).
  const reg2025 = await registerProgram(programRepo, regRepo, cohortProgram.id, {
    ...validInput,
    nim: "25010001",
    angkatan: "2025",
  });
  assert.equal(reg2025.registration.angkatan, "2025");
  assert.equal(stored.length, 6);

  // Next registrant from 2026 is blocked by overall registrationMaxQuota (6).
  await assert.rejects(
    registerProgram(programRepo, regRepo, cohortProgram.id, {
      ...validInput,
      nim: "26010001",
      angkatan: "2026",
    }),
    (error: unknown) =>
      error instanceof ConflictError &&
      error.reason === "quota" &&
      error.message === "Kuota peserta untuk program kerja ini sudah penuh.",
  );
});
