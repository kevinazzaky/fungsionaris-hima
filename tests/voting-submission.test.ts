import assert from "node:assert/strict";
import test from "node:test";
import { checkVotingSubmission, submitVotingChoice } from "../src/lib/voting-submission";
import { loadVotingSubmissionStatus } from "../src/use-cases/voting";
import { issueVotingToken } from "../src/use-cases/voting-token";

test("respons kirim hilang: hanya memeriksa status, tidak mengirim suara ulang", async () => {
  const paths: string[] = [];
  let verifying = false;
  const result = await submitVotingChoice(async (path) => {
    paths.push(path);
    if (path.endsWith("ballots")) throw new TypeError("connection lost");
    return { status: "recorded" };
  }, { token: "session", candidateId: "candidate" }, () => { verifying = true; });
  assert.equal(result, "recorded");
  assert.equal(verifying, true);
  assert.deepEqual(paths, ["/api/voting/ballots", "/api/voting/status"]);
});

test("server tidak terjangkau atau respons tidak dikenal tidak dianggap sukses/gagal pasti", async () => {
  assert.equal(await checkVotingSubmission(async () => { throw new Error("offline"); }, "session"), "unknown");
  assert.equal(await checkVotingSubmission(async () => ({ success: true }), "session"), "unknown");
  assert.equal(await checkVotingSubmission(async () => ({ status: "not_recorded" }), "session"), "not_recorded");
});

test("respons sukses tidak memerlukan pemeriksaan tambahan", async () => {
  let requests = 0;
  assert.equal(await submitVotingChoice(async () => { requests++; return { success: true }; },
    { token: "session", candidateId: "candidate" }, () => assert.fail("tidak perlu pemeriksaan")), "recorded");
  assert.equal(requests, 1);
});

test("status suara terikat sesi bertanda tangan dan hanya mengembalikan status hak terpakai", async () => {
  const secret = "test-only-secret-longer-than-32-characters";
  const key = "a".repeat(64);
  const token = issueVotingToken("election", key, secret, 1000);
  for (const consumed of [false, true]) {
    const result = await loadVotingSubmissionStatus({ voterEligibility: async (id, voter) => {
      assert.equal(id, "election"); assert.equal(voter, key);
      return { eligible: true, consumed };
    } }, token, secret, 2000);
    assert.deepEqual(result, { status: consumed ? "recorded" : "not_recorded" });
  }
  const noRead = { voterEligibility: async () => { assert.fail("token tidak valid tidak boleh membaca database"); } };
  await assert.rejects(loadVotingSubmissionStatus(noRead, `${token}x`, secret, 2000));
  await assert.rejects(loadVotingSubmissionStatus(noRead, token, secret, 1_000_000));
  await assert.rejects(loadVotingSubmissionStatus({ voterEligibility: async () => null }, token, secret, 2000));
});
