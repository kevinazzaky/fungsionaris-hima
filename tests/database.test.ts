import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

test("migration PostgreSQL mengaktifkan RLS dan keunikan NIM per periode", async () => {
  const db = new PGlite();
  try {
    await db.exec("CREATE ROLE anon; CREATE ROLE authenticated;");
    await db.exec(
      await readFile(
        "prisma/migrations/20261105000000_admin_backend/migration.sql",
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        "prisma/migrations/20261105010000_hero_slides/migration.sql",
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        "prisma/migrations/20261105020000_programs/migration.sql",
        "utf8",
      ),
    );
    await db.query(
      "INSERT INTO \"Program\" (id,title,body,period,\"isPublished\",\"updatedAt\") VALUES ($1,'Program uji','Ringkasan','2024-2025',false,CURRENT_TIMESTAMP), ($2,'Program uji kedua','Ringkasan','2025/2026',true,CURRENT_TIMESTAMP)",
      [randomUUID(), randomUUID()],
    );
    await db.exec(
      await readFile(
        "prisma/migrations/20261105030000_program_periods/migration.sql",
        "utf8",
      ),
    );
    assert.deepEqual(
      (
        await db.query(
          'SELECT period,"isPublished" FROM "ProgramPeriod" ORDER BY period',
        )
      ).rows,
      [
        { period: "2024/2025", isPublished: true },
        { period: "2025/2026", isPublished: true },
      ],
    );
    assert.deepEqual(
      (
        await db.query(
          'SELECT period,"isPublished" FROM "Program" ORDER BY period',
        )
      ).rows,
      [
        { period: "2024/2025", isPublished: false },
        { period: "2025/2026", isPublished: true },
      ],
    );
    await db.exec(
      'UPDATE "ProgramPeriod" SET "isPublished"=false WHERE period=\'2025/2026\'',
    );
    const publishedQuery =
      'SELECT p.id FROM "Program" p JOIN "ProgramPeriod" pp ON p.period=pp.period WHERE p."isPublished" AND pp."isPublished"';
    assert.equal((await db.query(publishedQuery)).rows.length, 0);
    await db.exec(
      'UPDATE "ProgramPeriod" SET "isPublished"=true WHERE period=\'2025/2026\'',
    );
    assert.equal((await db.query(publishedQuery)).rows.length, 1);
    await assert.rejects(
      db.exec("DELETE FROM \"ProgramPeriod\" WHERE period='2025/2026'"),
      /foreign key/,
    );
    await db.exec(
      await readFile(
        "prisma/migrations/20261105040000_registration_settings/migration.sql",
        "utf8",
      ),
    );
    assert.deepEqual(
      (await db.query('SELECT id,"isOpen" FROM "RegistrationSettings"')).rows,
      [{ id: "main", isOpen: true }],
    );
    await assert.rejects(
      db.exec(
        'INSERT INTO "RegistrationSettings" (id,"updatedAt") VALUES (\'other\', CURRENT_TIMESTAMP)',
      ),
      /check constraint/,
    );
    await db.exec(
      'UPDATE "RegistrationSettings" SET "isOpen"=false WHERE id=\'main\'',
    );
    assert.equal(
      (
        await db.query<{ isOpen: boolean }>(
          'SELECT "isOpen" FROM "RegistrationSettings"',
        )
      ).rows[0].isOpen,
      false,
    );
    const tables = await db.query<{ relname: string; relrowsecurity: boolean }>(
      "SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('AdminUser','Member','GalleryPhoto','Registration','HeroSlide','Program','ProgramPeriod','RegistrationSettings')",
    );
    assert.equal(tables.rows.length, 8);
    assert.ok(tables.rows.every((row) => row.relrowsecurity));

    const insert =
      'INSERT INTO "Registration" (id,nama,nim,angkatan,period,divisi) VALUES ($1,$2,$3,$4,$5,$6)';
    await db.query(insert, [
      randomUUID(),
      "Pengurus uji",
      "000123456",
      "2025",
      "2026",
      "kominfo",
    ]);
    await assert.rejects(
      db.query(insert, [
        randomUUID(),
        "Pengurus uji",
        "000123456",
        "2025",
        "2026",
        "kominfo",
      ]),
      /unique/,
    );
    await db.query(insert, [
      randomUUID(),
      "Pengurus uji",
      "000123456",
      "2025",
      "2027",
      "kominfo",
    ]);
    assert.equal(
      (
        await db.query<{ submittedAt: Date | null }>(
          'SELECT "submittedAt" FROM "Registration"',
        )
      ).rows[0].submittedAt,
      null,
    );

    await db.exec("SET ROLE anon");
    await assert.rejects(
      db.query('SELECT * FROM "Registration"'),
      /permission denied/,
    );
    await db.exec(
      'RESET ROLE; GRANT SELECT ON "Registration" TO authenticated; SET ROLE authenticated;',
    );
    assert.equal(
      (await db.query('SELECT * FROM "Registration"')).rows.length,
      0,
    );
    await db.exec("RESET ROLE");
    await db.exec("SET ROLE anon");
    await assert.rejects(
      db.query('SELECT * FROM "HeroSlide"'),
      /permission denied/,
    );
    await assert.rejects(
      db.query('SELECT * FROM "Program"'),
      /permission denied/,
    );
    await assert.rejects(
      db.query('SELECT * FROM "ProgramPeriod"'),
      /permission denied/,
    );
    await assert.rejects(
      db.query('SELECT * FROM "RegistrationSettings"'),
      /permission denied/,
    );
    await db.exec("RESET ROLE");

    await db.exec(
      await readFile(
        "prisma/migrations/20261117000000_program_registrations/migration.sql",
        "utf8",
      ),
    );
    const programRegTable = await db.query<{
      relname: string;
      relrowsecurity: boolean;
    }>(
      "SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'ProgramRegistration'",
    );
    assert.equal(programRegTable.rows.length, 1);
    assert.equal(programRegTable.rows[0].relrowsecurity, true);

    const existingPrograms = await db.query<{
      id: string;
      registrationMode: string;
      registrationGroupLink: string;
      registrationMaxQuota: number | null;
    }>(
      'SELECT id, "registrationMode", "registrationGroupLink", "registrationMaxQuota" FROM "Program" ORDER BY period',
    );
    assert.equal(existingPrograms.rows.length, 2);
    for (const row of existingPrograms.rows) {
      assert.equal(row.registrationMode, "external");
      assert.equal(row.registrationGroupLink, "");
      assert.equal(row.registrationMaxQuota, null);
    }

    const firstProgramId = existingPrograms.rows[0].id;
    const secondProgramId = existingPrograms.rows[1].id;
    await db.query(
      'UPDATE "Program" SET "registrationMode" = \'internal\', "registrationMaxQuota" = 25 WHERE id = $1',
      [firstProgramId],
    );
    await assert.rejects(
      db.query(
        'UPDATE "Program" SET "registrationMaxQuota" = 0 WHERE id = $1',
        [firstProgramId],
      ),
      /check constraint/,
    );

    await db.query(
      'INSERT INTO "ProgramRegistration" (id, "programId", nama, nim, angkatan) VALUES ($1, $2, $3, $4, $5)',
      [randomUUID(), firstProgramId, "Peserta Uji", "22010101", "2024"],
    );
    await assert.rejects(
      db.query(
        'INSERT INTO "ProgramRegistration" (id, "programId", nama, nim, angkatan) VALUES ($1, $2, $3, $4, $5)',
        [randomUUID(), firstProgramId, "Peserta Duplikat", "22010101", "2024"],
      ),
      /unique/,
    );
    await db.query(
      'INSERT INTO "ProgramRegistration" (id, "programId", nama, nim, angkatan) VALUES ($1, $2, $3, $4, $5)',
      [randomUUID(), secondProgramId, "Peserta Uji", "22010101", "2024"],
    );
    const savedReg = (
      await db.query<{
        noHp: string;
        idLine: string;
        email: string;
        catatan: string;
        submittedAt: Date | null;
        createdAt: Date | null;
      }>(
        'SELECT "noHp", "idLine", email, catatan, "submittedAt", "createdAt" FROM "ProgramRegistration" WHERE "programId" = $1',
        [firstProgramId],
      )
    ).rows[0];
    assert.equal(savedReg.noHp, "");
    assert.equal(savedReg.idLine, "");
    assert.equal(savedReg.email, "");
    assert.equal(savedReg.catatan, "");
    assert.ok(savedReg.submittedAt instanceof Date);
    assert.ok(savedReg.createdAt instanceof Date);

    await assert.rejects(
      db.query('DELETE FROM "Program" WHERE id = $1', [firstProgramId]),
      /foreign key/,
    );

    await db.exec("SET ROLE anon");
    await assert.rejects(
      db.query('SELECT * FROM "ProgramRegistration"'),
      /permission denied/,
    );
    await assert.rejects(
      db.query(
        'INSERT INTO "ProgramRegistration" ("programId", nama, nim, angkatan) VALUES ($1, \'Anon\', \'12345678\', \'2024\')',
        [firstProgramId],
      ),
      /permission denied/,
    );
    await db.exec(
      'RESET ROLE; GRANT SELECT ON "ProgramRegistration" TO authenticated; SET ROLE authenticated;',
    );
    assert.equal(
      (await db.query('SELECT * FROM "ProgramRegistration"')).rows.length,
      0,
    );
    await db.exec("RESET ROLE");
  } finally {
    await db.close();
  }
});
