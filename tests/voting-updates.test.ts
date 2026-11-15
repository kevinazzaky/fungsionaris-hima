import assert from "node:assert/strict";
import test from "node:test";
import { fetchVotingUpdate } from "../src/lib/voting-updates";
import { electionState, type VotingPublicData } from "../src/domain/voting";

test("jadwal baru diambil tanpa cache sehingga halaman draft dapat menjadi terbuka", async () => {
  const data: VotingPublicData = { available: true, election: { id: "test", period: "2026/2027", status: "scheduled", startsAt: "2026-11-15T07:00:00Z", endsAt: "2026-11-15T08:00:00Z", candidates: [] } };
  const result = await fetchVotingUpdate(async (url, options) => {
    assert.equal(url, "/api/voting");
    assert.equal(options?.cache, "no-store");
    return Response.json(data);
  });
  assert.deepEqual(result, data);
  assert.equal(electionState(result!.election!, new Date("2026-11-15T07:00:00Z")), "open");
  assert.equal(electionState(result!.election!, new Date("2026-11-15T08:00:00Z")), "ended");
});

test("kegagalan pembaruan tidak mengganti data halaman yang sedang dipakai", async () => {
  for (const fetcher of [
    async () => Response.json({ error: "Database unavailable" }, { status: 503 }),
    async () => { throw new Error("Offline"); },
    async () => new Response("invalid JSON"),
  ]) assert.equal(await fetchVotingUpdate(fetcher), null);
});
