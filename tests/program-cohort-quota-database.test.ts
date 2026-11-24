import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { runInNewContext } from "node:vm";
import { ModuleKind, ScriptTarget, transpileModule } from "typescript";
import { PGlite } from "@electric-sql/pglite";
import * as admin from "../src/domain/admin";
import * as formConfig from "../src/domain/program-form-config";
import * as registrations from "../src/domain/program-registrations";

test("repository membatasi 2023-2026 masing-masing 5 peserta, menjaga kuota total, dan tidak membatasi program yang menonaktifkan fitur", async () => {
  const db = new PGlite();
  try {
    await db.exec("CREATE ROLE anon; CREATE ROLE authenticated;");
    for (const migration of ["20261105020000_programs", "20261105030000_program_periods", "20261117000000_program_registrations", "20261118000000_program_custom_form"])
      await db.exec(await readFile(`prisma/migrations/${migration}/migration.sql`, "utf8"));
    await db.exec(`INSERT INTO "ProgramPeriod"(period,"updatedAt") VALUES('2026/2027',now());`);
    const enabled = randomUUID(), disabled = randomUUID(), totalLimited = randomUUID();
    for (const [id, isEnabled, total] of [[enabled, true, null], [disabled, false, null], [totalLimited, true, 3]] as const) {
      const config = { ...formConfig.DEFAULT_PROGRAM_FORM_CONFIG, cohortQuotas: { enabled: isEnabled, tiers: formConfig.createPresetCohortTiers() } };
      await db.query(`INSERT INTO "Program"(id,title,body,period,status,"registrationMode","registrationMaxQuota","registrationFormConfig","updatedAt") VALUES($1,'Program uji','Data sintetis','2026/2027','open','internal',$2,$3::jsonb,now())`, [id, total, JSON.stringify(config)]);
    }

    class KnownRequestError extends Error {}
    const prisma = {
      $transaction: (operation: (client: Record<string, unknown>) => Promise<unknown>) => db.transaction(async (tx) => operation({
        $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
          const sql = strings.reduce((result, part, index) => result + (index ? `$${index}` : "") + part, "");
          return (await tx.query(sql, values)).rows;
        },
        programRegistration: {
          count: async ({ where }: { where: { programId: string; angkatan?: string } }) => {
            const result = await tx.query<{ count: number }>(`SELECT count(*)::int AS count FROM "ProgramRegistration" WHERE "programId"=$1 AND ($2::text IS NULL OR angkatan=$2)`, [where.programId, where.angkatan ?? null]);
            return result.rows[0].count;
          },
          create: async ({ data }: { data: Record<string, unknown> }) => (await tx.query(`INSERT INTO "ProgramRegistration"("programId",nama,nim,angkatan,"noHp","idLine",email,catatan,"customResponses") VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb) RETURNING *`, [data.programId, data.nama, data.nim, data.angkatan, data.noHp, data.idLine, data.email, data.catatan, JSON.stringify(data.customResponses)])).rows[0],
        },
      })),
    };
    const modules: Record<string, unknown> = {
      "server-only": {},
      "@/data/prisma": { getPrisma: () => prisma },
      "@/domain/admin": admin,
      "@/domain/program-form-config": formConfig,
      "@/domain/program-registrations": registrations,
      "@/generated/prisma/client": { Prisma: { PrismaClientKnownRequestError: KnownRequestError } },
    };
    const context = { exports: {}, require: (name: string) => { assert.ok(Object.hasOwn(modules, name), name); return modules[name]; } };
    runInNewContext(transpileModule(await readFile("src/data/repositories/program-registrations.ts", "utf8"), { compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 } }).outputText, context);
    const repository = (context.exports as { programRegistrationRepository: registrations.ProgramRegistrationRepository }).programRegistrationRepository;
    let sequence = 0;
    const submit = (id: string, angkatan: string) => repository.create(id, {
      nama: "Peserta Pengujian", nim: String(10000000 + ++sequence), angkatan,
      noHp: "08123456789", idLine: "peserta_demo", email: "", catatan: "", customResponses: {},
    });
    const count = async (id: string) => (await db.query<{ count: number }>(`SELECT count(*)::int AS count FROM "ProgramRegistration" WHERE "programId"=$1`, [id])).rows[0].count;

    for (const year of ["2023", "2024", "2025", "2026"]) {
      const attempts = await Promise.allSettled(Array.from({ length: 6 }, () => submit(enabled, year)));
      assert.equal(attempts.filter(result => result.status === "fulfilled").length, 5);
      const denied = attempts.filter(result => result.status === "rejected");
      assert.equal(denied.length, 1);
      assert.ok(denied[0].reason instanceof registrations.ConflictError);
      assert.equal(denied[0].reason.reason, "quota");
    }
    assert.equal(await count(enabled), 20);
    await assert.rejects(submit(enabled, "2022"), admin.ValidationError);
    assert.equal(await count(enabled), 20);
    await db.query(`DELETE FROM "ProgramRegistration" WHERE id=(SELECT id FROM "ProgramRegistration" WHERE "programId"=$1 AND angkatan='2023' LIMIT 1)`, [enabled]);
    await submit(enabled, "2023");
    assert.equal(await count(enabled), 20);

    await Promise.all(Array.from({ length: 6 }, () => submit(disabled, "2024")));
    await submit(disabled, "2022");
    assert.equal(await count(disabled), 7);
    for (const year of ["2023", "2024", "2025"]) await submit(totalLimited, year);
    await assert.rejects(submit(totalLimited, "2026"), error => error instanceof registrations.ConflictError && error.reason === "quota");
    assert.equal(await count(totalLimited), 3);
    assert.equal(await count(enabled), 20);
  } finally { await db.close(); }
});
