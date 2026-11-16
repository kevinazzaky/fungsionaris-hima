import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

test("surat suara atomik, rahasia, periode terkunci dan akses database ditolak", async () => {
  const db = new PGlite();
  try {
    await db.exec("CREATE ROLE anon; CREATE ROLE authenticated;");
    await db.exec(
      await readFile(
        "prisma/migrations/20261110000000_voting/migration.sql",
        "utf8",
      ),
    );
    const election = randomUUID();
    await db.exec(await readFile("prisma/migrations/20261115000000_voter_names/migration.sql", "utf8"));
    const candidate = randomUUID();
    await db.query("INSERT INTO elections(id,period) VALUES ($1,'2026/2027')", [
      election,
    ]);
    await db.query(
      "INSERT INTO candidates(id,election_id,number,placeholder) VALUES ($1,$2,1,false)",
      [candidate, election],
    );
    await db.exec(
      await readFile(
        "prisma/migrations/20261110010000_dynamic_voting_candidates/migration.sql",
        "utf8",
      ),
    );
    assert.equal(
      (await db.query("SELECT id FROM candidates WHERE id=$1", [candidate]))
        .rows.length,
      1,
    );
    const emptyCandidate = randomUUID();
    await db.query(
      "INSERT INTO candidates(id,election_id,number) VALUES ($1,$2,7)",
      [emptyCandidate, election],
    );
    await assert.rejects(
      db.query(
        "INSERT INTO candidates(id,election_id,number) VALUES ($1,$2,0)",
        [randomUUID(), election],
      ),
      /check constraint/,
    );
    await db.query(
      "INSERT INTO eligible_voters(election_id,voter_key) VALUES ($1,'eligible'),($1,'rollback'),($1,'inactive')",
      [election],
    );
    await db.query(
      "UPDATE eligible_voters SET eligible=false WHERE voter_key='inactive'",
    );
    await db.query("UPDATE eligible_voters SET name='Pemilih Uji' WHERE voter_key='eligible'");
    const cast = (key: string, id = candidate) =>
      db.query<{ accepted: boolean }>(
        "SELECT cast_hima_ballot($1,$2,$3) AS accepted",
        [election, key, id],
      );
    assert.equal((await cast("eligible")).rows[0].accepted, false);
    await db.query(
      "UPDATE elections SET status='scheduled', starts_at=clock_timestamp()-interval '1 hour', ends_at=clock_timestamp()+interval '1 hour' WHERE id=$1",
      [election],
    );
    assert.equal(
      (await cast("eligible", emptyCandidate)).rows[0].accepted,
      false,
    );
    await assert.rejects(db.query("UPDATE eligible_voters SET name='Nama Lain',consumed=true WHERE voter_key='eligible'"), /locked/);
    const otherElection = randomUUID(),
      otherCandidate = randomUUID();
    await db.query("INSERT INTO elections(id,period) VALUES ($1,'2027/2028')", [
      otherElection,
    ]);
    await db.query(
      "INSERT INTO candidates(id,election_id,number,placeholder) VALUES ($1,$2,1,false)",
      [otherCandidate, otherElection],
    );
    await assert.rejects(
      db.query(
        "UPDATE eligible_voters SET election_id=$1 WHERE voter_key='rollback'",
        [otherElection],
      ),
      /locked/,
    );
    assert.equal(
      (await cast("eligible", otherCandidate)).rows[0].accepted,
      false,
    );
    for (const key of ["missing", "inactive"])
      assert.equal((await cast(key)).rows[0].accepted, false);
    assert.equal(
      (await cast("eligible", randomUUID())).rows[0].accepted,
      false,
    );
    const concurrent = await Promise.all([
      cast("eligible"),
      cast("eligible"),
      cast("eligible"),
    ]);
    assert.equal(concurrent.filter((r) => r.rows[0].accepted).length, 1);
    assert.equal((await cast("eligible")).rows[0].accepted, false);
    assert.equal((await db.query("SELECT * FROM ballots")).rows.length, 1);
    assert.equal((await db.query<{name:string}>("SELECT name FROM eligible_voters WHERE voter_key='eligible'")).rows[0].name, "Pemilih Uji");
    await db.exec(
      "CREATE FUNCTION fail_ballot() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'database failure'; END $$; CREATE TRIGGER test_failure BEFORE INSERT ON ballots FOR EACH ROW EXECUTE FUNCTION fail_ballot();",
    );
    await assert.rejects(cast("rollback"), /database failure/);
    assert.equal(
      (
        await db.query<{ consumed: boolean }>(
          "SELECT consumed FROM eligible_voters WHERE voter_key='rollback'",
        )
      ).rows[0].consumed,
      false,
    );
    await db.exec("DROP TRIGGER test_failure ON ballots;");
    await assert.rejects(
      db.query("UPDATE candidates SET name='changed' WHERE id=$1", [candidate]),
      /locked/,
    );
    await assert.rejects(
      db.query(
        "INSERT INTO eligible_voters(election_id,voter_key) VALUES ($1,'late')",
        [election],
      ),
      /locked/,
    );
    await assert.rejects(
      db.query("UPDATE elections SET status='draft' WHERE id=$1", [election]),
      /locked/,
    );
    await assert.rejects(
      db.query("UPDATE ballots SET candidate_id=$1", [candidate]),
      /immutable/,
    );
    await assert.rejects(db.query("DELETE FROM ballots"), /immutable/);
    await db.query("UPDATE elections SET status='closed' WHERE id=$1", [
      election,
    ]);
    assert.equal((await cast("rollback")).rows[0].accepted, false);
    await db.query(
      "INSERT INTO eligible_voters(election_id,voter_key) VALUES ($1,'future')",
      [otherElection],
    );
    await db.query(
      "UPDATE elections SET status='scheduled',starts_at=clock_timestamp()+interval '1 hour',ends_at=clock_timestamp()+interval '2 hours' WHERE id=$1",
      [otherElection],
    );
    assert.equal(
      (
        await db.query<{ accepted: boolean }>(
          "SELECT cast_hima_ballot($1,'future',$2) AS accepted",
          [otherElection, otherCandidate],
        )
      ).rows[0].accepted,
      false,
    );
    const expired = randomUUID(),
      expiredCandidate = randomUUID();
    await db.query("INSERT INTO elections(id,period) VALUES ($1,'2028/2029')", [
      expired,
    ]);
    await db.query(
      "INSERT INTO candidates(id,election_id,number,placeholder) VALUES ($1,$2,1,false)",
      [expiredCandidate, expired],
    );
    await db.query(
      "INSERT INTO eligible_voters(election_id,voter_key) VALUES ($1,'expired')",
      [expired],
    );
    await db.query(
      "UPDATE elections SET status='scheduled',starts_at=clock_timestamp()-interval '2 hours',ends_at=clock_timestamp()-interval '1 hour' WHERE id=$1",
      [expired],
    );
    assert.equal(
      (
        await db.query<{ accepted: boolean }>(
          "SELECT cast_hima_ballot($1,'expired',$2) AS accepted",
          [expired, expiredCandidate],
        )
      ).rows[0].accepted,
      false,
    );
    const columns = (
      await db.query<{ column_name: string }>(
        "SELECT column_name FROM information_schema.columns WHERE table_name='ballots' ORDER BY column_name",
      )
    ).rows.map((r) => r.column_name);
    assert.deepEqual(columns, ["candidate_id", "election_id", "id"]);
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`SET ROLE ${role}`);
      await assert.rejects(
        db.query("SELECT * FROM eligible_voters"),
        /permission denied/,
      );
      await assert.rejects(cast("rollback"), /permission denied/);
      await assert.rejects(
        db.query("SELECT * FROM ballots"),
        /permission denied/,
      );
      await db.exec("RESET ROLE");
    }
    const limits = await Promise.all(
      Array.from({ length: 4 }, () =>
        db.query<{ allowed: boolean }>(
          "SELECT voting_take_rate('key','check',3) AS allowed",
        ),
      ),
    );
    assert.equal(limits.filter((r) => r.rows[0].allowed).length, 3);
  } finally {
    await db.close();
  }
});
