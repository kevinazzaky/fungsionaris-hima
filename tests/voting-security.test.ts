import assert from "node:assert/strict";
import test from "node:test";
import {
  prepareVotingSession,
  loadAdminVotingResults,
  VotingCheckLimitError,
} from "../src/use-cases/voting";

test("cek NIM hanya menerbitkan sesi ketika hak pilih masih tersedia", async () => {
  const secret = "test-secret-only-longer-than-32-characters";
  const result = await prepareVotingSession(
      { voterEligibility: async () => ({ eligible: true, consumed: false, name: "I Made Dandi" }) },
      "00000001",
      "test-election",
      secret,
      " i made   dandi ",
      1000,
    );
  assert.ok(result.token);
  for (const [voter, message] of [
    [null, "Nama dan NIM tidak cocok. Periksa kembali."],
    [{ eligible: true, consumed: true }, "Nama dan NIM ini sudah digunakan untuk memilih pada periode ini."],
    [{ eligible: false, consumed: false }, "NIM ini belum memiliki hak pilih pada periode ini. Hubungi panitia."],
  ] as const) {
    await assert.rejects(
      prepareVotingSession({ voterEligibility: async () => voter ? { ...voter, name: "I Made Dandi" } : null }, "00000001", "test-election", secret, "I Made Dandi", 1000),
      { message },
    );
  }
});

test("pasangan yang sudah digunakan tetap mendapat pesan jelas setelah batas pemeriksaan tercapai", async () => {
  await assert.rejects(prepareVotingSession(
    { voterEligibility: async () => ({ eligible: true, consumed: true, name: "Bayu Trias" }) },
    "42430029", "test-election", "test-secret-only-longer-than-32-characters", "bayu trias", 1000, false,
  ), { message: "Nama dan NIM ini sudah digunakan untuk memilih pada periode ini." });
});

test("batas per NIM tetap menolak sesi baru dan tidak membocorkan status pasangan yang salah", async () => {
  for (const [voter, name] of [
    [{ eligible: true, consumed: false, name: "Bayu Trias" }, "Bayu Trias"],
    [{ eligible: true, consumed: true, name: "Bayu Trias" }, "Nama Salah"],
    [null, "Nama Salah"],
  ] as const) {
    await assert.rejects(prepareVotingSession(
      { voterEligibility: async () => voter }, "42430029", "test-election",
      "test-secret-only-longer-than-32-characters", name, 1000, false,
    ), VotingCheckLimitError);
  }
});

test("nama salah tetap mendapat pesan tidak cocok walaupun NIM sudah dipakai", async () => {
  await assert.rejects(prepareVotingSession(
    { voterEligibility: async () => ({ eligible: true, consumed: true, name: "Bayu Trias" }) },
    "42430029", "test-election", "test-secret-only-longer-than-32-characters", "Nama Salah",
  ), { message: "Nama dan NIM tidak cocok. Periksa kembali." });
});

test("sesi ditolak ketika nama salah, belum didaftarkan, atau berisi payload", async () => {
  for (const [registered, entered] of [["Bayu Trias", "Bayu Salah"], [null, "Bayu Trias"], ["Bayu Trias", "<script>alert(1)</script>"], ["Bayu Trias", "Bayu123"]]) {
    await assert.rejects(prepareVotingSession(
      { voterEligibility: async () => ({ eligible: true, consumed: false, name: registered }) },
      "42430029", "test-election", "test-secret-only-longer-than-32-characters", entered,
    ));
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

test("payload nama atau NIM ditolak sebelum pencarian pemilih dan tidak menerbitkan token", async () => {
  let reads = 0;
  const repository = { voterEligibility: async () => {
    reads++;
    return { eligible: true, consumed: false, name: "Bayu Trias" };
  } };
  for (const [nim, name] of [
    ["42430029", 'SELECT * FROM users WHERE username = " OR 1=1'],
    ["42430029", '<img src=x onerror=alert(1)>'],
    ["42430029", { $ne: null }],
    ["42430029", "Bayu\n"],
    ["1 OR 1=1", "Bayu Trias"],
    [{ $gt: "" }, "Bayu Trias"],
  ]) await assert.rejects(prepareVotingSession(repository, nim, "test-election",
    "test-secret-only-longer-than-32-characters", name));
  assert.equal(reads, 0);
});
