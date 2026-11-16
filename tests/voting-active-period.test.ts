import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { assertCanActivateVotingPeriod } from "../src/use-cases/manage-voting-period";

const open = { id: "old", status: "scheduled", startsAt: new Date(1000), endsAt: new Date(2000) };
test("pergantian periode tidak memotong voting berjalan dan aktivasi ulang tetap idempoten", () => {
  assert.throws(() => assertCanActivateVotingPeriod(open, "new", 1500));
  assert.doesNotThrow(() => assertCanActivateVotingPeriod(open, "old", 1500));
  assert.doesNotThrow(() => assertCanActivateVotingPeriod(open, "new", 999));
  assert.doesNotThrow(() => assertCanActivateVotingPeriod(open, "new", 2000));
  assert.doesNotThrow(() => assertCanActivateVotingPeriod({ ...open, status: "draft" }, "new", 1500));
  assert.doesNotThrow(() => assertCanActivateVotingPeriod(null, "new", 1500));
});

test("pengaturan aktif hanya satu, memilih jadwal existing dan tidak mengubah periode lain", async () => {
  const db = new PGlite();
  try {
    await db.exec("CREATE ROLE anon; CREATE ROLE authenticated;");
    await db.exec(await readFile("prisma/migrations/20261110000000_voting/migration.sql", "utf8"));
    await db.exec(`INSERT INTO elections(id,period,status,starts_at,ends_at,created_at) VALUES
      ('00000000-0000-0000-0000-000000000001','2026/2027','scheduled',now()+interval '1 day',now()+interval '2 days',now()-interval '2 days'),
      ('00000000-0000-0000-0000-000000000002','2027/2028','draft',NULL,NULL,now()-interval '1 day'),
      ('00000000-0000-0000-0000-000000000003','2025/2026','draft',NULL,NULL,now());`);
    const before = (await db.query("SELECT * FROM elections ORDER BY id")).rows;
    await db.exec(await readFile("prisma/migrations/20261116000000_active_voting_period/migration.sql", "utf8"));
    assert.deepEqual((await db.query("SELECT * FROM elections ORDER BY id")).rows, before);
    assert.equal((await db.query<{election_id: string}>("SELECT election_id FROM voting_settings WHERE id='main'")).rows[0].election_id, '00000000-0000-0000-0000-000000000001');
    await assert.rejects(db.exec("INSERT INTO voting_settings(id) VALUES ('other')"));
    await assert.rejects(db.exec("UPDATE voting_settings SET election_id='00000000-0000-0000-0000-000000000099'"));
    await db.exec("UPDATE voting_settings SET election_id='00000000-0000-0000-0000-000000000002' WHERE id='main'");
    assert.equal((await db.query("SELECT * FROM voting_settings")).rows.length, 1);
    await db.exec("SET ROLE anon");
    await assert.rejects(db.query("SELECT * FROM voting_settings"));
    await assert.rejects(db.exec("UPDATE voting_settings SET election_id=NULL"));
  } finally { await db.close(); }
});
