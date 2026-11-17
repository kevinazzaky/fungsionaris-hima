import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { ModuleKind, ScriptTarget, transpileModule } from "typescript";
import { ValidationError } from "../src/domain/admin";
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
  assert.equal(pageData.program?.id, baseProgram.id);
  assert.equal(pageData.program?.registrationGroupLink, "");
  assert.deepEqual(Object.keys(pageData).sort(), [
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
        submittedAt: new Date('2026-11-17T08:00:00Z'),
        createdAt: new Date('2026-11-17T08:00:00Z'),
      };

      const tx = {
        $queryRaw: async () => [programRow],
        programRegistration: {
          count: async () => currentCount,
          create: async ({ data }) => {
            if (throwP2002) {
              throw new Prisma.PrismaClientKnownRequestError('Unique', { code: 'P2002', clientVersion: '7.10.1' });
            }
            currentCount++;
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
          findMany: async ({ where }) => {
            assert.equal(where.programId, programId);
            assert.ok(Array.isArray(where.OR));
            return [{ ...savedRow, program: { title: 'IT Versary & Sertijab 2026', period: '2025/2026' } }];
          },
          groupBy: async () => [{ programId, _count: { _all: 4 } }],
          update: async () => {
            throw new Prisma.PrismaClientKnownRequestError('Unique', { code: 'P2002', clientVersion: '7.10.1' });
          },
          delete: async () => {
            throw new Prisma.PrismaClientKnownRequestError('Missing', { code: 'P2025', clientVersion: '7.10.1' });
          },
        },
      };

      (async () => {
        const pub = await programRepository.getPublished(programId);
        assert.equal(pub.id, programId);
        assert.equal(await programRepository.getPublished('invalid-uuid'), null);

        deleteError = new Prisma.PrismaClientKnownRequestError('FK', { code: 'P2003', clientVersion: '7.10.1' });
        await assert.rejects(programRepository.delete(programId), ValidationError);

        const created = await programRegistrationRepository.create(programId, {
          nama: 'Made', nim: '22010101', angkatan: '2024', noHp: '08123456789', idLine: 'made_ti', email: '', catatan: '',
        });
        assert.equal(created.id, regId);

        await assert.rejects(
          programRegistrationRepository.create(programId, {
            nama: 'Ketut', nim: '22010102', angkatan: '2024', noHp: '08123456789', idLine: 'ketut', email: '', catatan: '',
          }),
          (e) => e instanceof ConflictError && e.reason === 'quota',
        );

        programRow.registrationMaxQuota = null;
        throwP2002 = true;
        await assert.rejects(
          programRegistrationRepository.create(programId, {
            nama: 'Made', nim: '22010101', angkatan: '2024', noHp: '08123456789', idLine: 'made_ti', email: '', catatan: '',
          }),
          (e) => e instanceof ConflictError && e.reason === 'duplicate',
        );

        const list = await programRegistrationRepository.list({ programId, q: 'made' });
        assert.equal(list[0].programTitle, 'IT Versary & Sertijab 2026');
        assert.deepEqual(await programRegistrationRepository.countsByProgram(), { [programId]: 4 });

        await assert.rejects(
          programRegistrationRepository.update(regId, {
            nama: 'Made', nim: '22010101', angkatan: '2024', noHp: '', idLine: '', email: '', catatan: '',
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
