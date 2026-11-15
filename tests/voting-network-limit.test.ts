import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("batas jaringan menerima 50 permintaan selama 5 menit, batas NIM tetap 10 menit", async () => {
  const db = new PGlite();
  try {
    await db.exec("CREATE ROLE anon; CREATE ROLE authenticated;");
    await db.exec(await readFile("prisma/migrations/20261110000000_voting/migration.sql", "utf8"));
    await db.exec(await readFile("prisma/migrations/20261115010000_voting_rate_windows/migration.sql", "utf8"));
    for (let i = 0; i < 51; i++) {
      const result = await db.query<{ allowed: boolean }>("SELECT voting_take_rate('network-test','check',50,300) AS allowed");
      assert.equal(result.rows[0].allowed, i < 50);
    }
    await db.query("SELECT voting_take_rate('nim-test','nim',5,600)");
    const rows = (await db.query<{ key: string; remaining: number }>("SELECT key,extract(epoch FROM expires_at-clock_timestamp())::float AS remaining FROM voting_rate_limits ORDER BY key")).rows;
    assert.ok(rows.find(r => r.key === "network-test")!.remaining > 295);
    assert.ok(rows.find(r => r.key === "network-test")!.remaining <= 300);
    assert.ok(rows.find(r => r.key === "nim-test")!.remaining > 595);
    assert.ok(rows.find(r => r.key === "nim-test")!.remaining <= 600);
    await db.query("UPDATE voting_rate_limits SET expires_at=clock_timestamp()-interval '1 second' WHERE key='network-test'");
    assert.equal((await db.query<{allowed:boolean}>("SELECT voting_take_rate('network-test','check',50,300) AS allowed")).rows[0].allowed, true);
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`SET ROLE ${role}`);
      await assert.rejects(db.query("SELECT voting_take_rate('public','check',50,300)"), /permission denied/);
      await db.exec("RESET ROLE");
    }
  } finally { await db.close(); }
});
