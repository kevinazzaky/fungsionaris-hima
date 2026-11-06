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
  } finally {
    await db.close();
  }
});
