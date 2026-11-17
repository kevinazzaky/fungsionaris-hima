import assert from "node:assert/strict";
import test from "node:test";
import { votingOverview, votingSessionActive, type VotingElection } from "../src/domain/voting";
import { prepareVotingAccess } from "../src/use-cases/voting";

const election: VotingElection = {
  id: "election", period: "2026/2027", status: "scheduled",
  startsAt: new Date(1000).toISOString(), endsAt: new Date(10000).toISOString(),
  candidates: [{ id: "private-id", number: 1, name: "Nama Rahasia", vision: "Visi rahasia", missions: ["Misi"], programs: [], photo: "/private-photo.webp", placeholder: false }],
};
const secret = "test-only-secret-longer-than-32-characters";
test("data publik hanya memuat jadwal dan status tanpa identitas atau foto kandidat", () => {
  for (const status of ["draft", "scheduled", "closed"]) {
    const result = votingOverview({ ...election, status });
    assert.deepEqual(result?.candidates, []);
    assert.doesNotMatch(JSON.stringify(result), /Nama Rahasia|Visi rahasia|private-photo|private-id/);
    assert.equal(result?.period, "2026/2027");
  }
  assert.equal(votingOverview(null), null);
  assert.equal(election.candidates.length, 1);
});
test("akses kandidat berhenti tepat saat voting atau sesi habis, ditutup, atau periode diganti", () => {
  const data = { election, available: true };
  const session = { electionId: election.id, expiresAt: 5000 };
  assert.equal(votingSessionActive(data, session, 2000), true);
  assert.equal(votingSessionActive(data, session, 5000), false);
  assert.equal(votingSessionActive(data, { ...session, expiresAt: 20000 }, 10000), false);
  assert.equal(votingSessionActive({ ...data, election: { ...election, status: "closed" } }, session, 2000), false);
  assert.equal(votingSessionActive(data, { ...session, electionId: "other" }, 2000), false);
  assert.equal(votingSessionActive({ ...data, available: false }, session, 2000), false);
  assert.equal(votingSessionActive(data, null, 2000), false);
});
test("server hanya memberikan kandidat sesudah pasangan nama NIM sah dan voting terbuka", async () => {
  const repo = { voterEligibility: async () => ({ eligible: true, consumed: false, name: "Pemilih Uji" }) };
  const result = await prepareVotingAccess(repo, election, "99000001", secret, "Pemilih Uji", 2000);
  assert.equal(result.election.candidates[0].name, "Nama Rahasia");
  assert.ok(result.expiresAt > 2000);
  await assert.rejects(prepareVotingAccess(repo, election, "99000001", secret, "Nama Salah", 2000));
  await assert.rejects(prepareVotingAccess(repo, election, "99000001", secret, "Pemilih Uji", 10000));
  await assert.rejects(prepareVotingAccess(repo, { ...election, status: "closed" }, "99000001", secret, "Pemilih Uji", 2000));
});
