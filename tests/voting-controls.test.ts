import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "node:crypto";
import { parseVotingDateTime } from "../src/domain/voting";
import { loadVotingSubmissionStatus, prepareVotingSession, resetVotingPeriod } from "../src/use-cases/voting";
import { issueVotingToken, readVotingToken } from "../src/use-cases/voting-token";

const secret = "test-only-secret-with-more-than-32-characters";
const key = "a".repeat(64);

test("batas selesai voting manual menerima WITA dan menolak tanggal/jam tidak valid", () => {
  assert.equal(parseVotingDateTime("2026-11-16T16:00").toISOString(), "2026-11-16T08:00:00.000Z");
  for (const invalid of ["2026-02-30T10:00", "2026-11-16T24:00", "2026-11-16", null])
    assert.throws(() => parseVotingDateTime(invalid));
});

test("reset memerlukan konfirmasi tepat dan meneruskan periode/aktor yang sudah diperiksa", async () => {
  const result = { ballotsRemoved: 2, rightsRestored: 2, action: "reset" };
  const repository = {
    period: async () => "2026/2027",
    reset: async (id: string, confirmation: string, actor: string) => {
      assert.equal(id, "period-id"); assert.equal(confirmation, "RESET 2026/2027"); assert.equal(actor, "admin-id");
      return result;
    },
  };
  assert.equal(await resetVotingPeriod(repository, "period-id", " RESET 2026/2027 ", "admin-id"), result);
  for (const confirmation of [null, "", "RESET 2025/2026", "reset 2026/2027", "x".repeat(51)])
    await assert.rejects(resetVotingPeriod({ ...repository, reset: async () => assert.fail("Konfirmasi salah tidak boleh mereset data.") }, "period-id", confirmation, "admin-id"));
});

test("sesi baru membawa versi periode dan sesi sebelum reset tidak dipakai untuk pemeriksaan status", async () => {
  const repository = { voterEligibility: async () => ({ eligible: true, consumed: false, name: "Pemilih Uji", tokenVersion: 3 }) };
  const current = await prepareVotingSession(repository, "99000001", "election", secret, "Pemilih Uji", 1000);
  assert.equal(readVotingToken(current.token, secret, 1001).version, 3);
  const old = issueVotingToken("election", key, secret, 1000, 2);
  await assert.rejects(loadVotingSubmissionStatus(repository, old, secret, 1001), /direset/);
  assert.deepEqual(await loadVotingSubmissionStatus(repository, current.token, secret, 1001), { status: "not_recorded" });
});

test("token lama tanpa versi hanya berlaku untuk periode yang belum pernah direset; versi tidak valid ditolak", async () => {
  const sign = (data: object) => {
    const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
    return `${payload}.${createHmac("sha256", secret).update(`token:${payload}`).digest("base64url")}`;
  };
  const legacy = sign({ electionId: "election", voterKey: key, expires: 99999 });
  assert.equal(readVotingToken(legacy, secret, 1000).version, 0);
  await assert.rejects(loadVotingSubmissionStatus({ voterEligibility: async () => ({ consumed: false, tokenVersion: 1 }) }, legacy, secret, 1000), /direset/);
  for (const version of [null, -1, 1.5, "1"])
    assert.throws(() => readVotingToken(sign({ electionId: "election", voterKey: key, expires: 99999, version }), secret, 1000));
});
