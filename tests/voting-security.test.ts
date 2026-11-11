import assert from "node:assert/strict";
import test from "node:test";
import {
  prepareVotingSession,
  loadAdminVotingResults,
} from "../src/use-cases/voting";

test("cek NIM hanya menerbitkan sesi ketika hak pilih masih tersedia", async () => {
  const secret = "test-secret-only-longer-than-32-characters";
  const result = await prepareVotingSession(
      { voterEligibility: async () => ({ eligible: true, consumed: false }) },
      "00000001",
      "test-election",
      secret,
      1000,
    );
  assert.ok(result.token);
  for (const [voter, message] of [
    [null, "NIM belum terdaftar untuk pemilihan ini. Periksa NIM atau hubungi panitia."],
    [{ eligible: true, consumed: true }, "NIM ini sudah digunakan untuk memilih. Kamu tidak dapat memilih lagi pada periode ini."],
    [{ eligible: false, consumed: false }, "NIM ini belum memiliki hak pilih pada periode ini. Hubungi panitia."],
  ] as const) {
    await assert.rejects(
      prepareVotingSession({ voterEligibility: async () => voter }, "00000001", "test-election", secret, 1000),
      { message },
    );
  }
});

test("hasil admin tersedia selama terjadwal dan tetap tersedia setelah ditutup", async () => {
  let reads = 0;
  const read = async () => {
    reads++;
    return [{ candidateId: "candidate-a", votes: 2 }];
  };
  for (const status of ["draft", "unknown"])
    assert.equal(await loadAdminVotingResults(status, read), null);
  assert.equal(reads, 0);
  for (const status of ["scheduled", "closed"])
    assert.deepEqual(await loadAdminVotingResults(status, read), [
      { candidateId: "candidate-a", votes: 2 },
    ]);
  assert.equal(reads, 2);
});
