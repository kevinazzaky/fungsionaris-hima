import test from "node:test";
import assert from "node:assert/strict";
import { saveProgramPeriod } from "../src/use-cases/manage-program-periods";
import type { ProgramPeriodRepository } from "../src/domain/programs";

test("buat periode menormalisasi label dan toggle hanya menyentuh metadata periode", async () => {
  const events: unknown[] = [];
  const repo: ProgramPeriodRepository = {
    list: async () => [],
    create: async (input) => {
      events.push(["create", input]);
      return input;
    },
    setPublished: async (input) => {
      events.push(["visibility", input]);
      return input;
    },
  };
  await saveProgramPeriod(
    repo,
    { period: "2026-2027", isPublished: false },
    true,
  );
  await saveProgramPeriod(
    repo,
    {
      period: "2026/2027",
      isPublished: true,
      programs: [{ isPublished: true }],
    },
    false,
  );
  assert.deepEqual(events, [
    ["create", { period: "2026/2027", isPublished: false }],
    ["visibility", { period: "2026/2027", isPublished: true }],
  ]);
});
test("periode atau flag tampil yang tidak valid ditolak sebelum mutasi", async () => {
  let writes = 0;
  const write = async () => {
    writes++;
    return { period: "2026", isPublished: true };
  };
  const repo: ProgramPeriodRepository = {
    list: async () => [],
    create: write,
    setPublished: write,
  };
  for (const data of [
    { period: "invalid", isPublished: true },
    { period: "2026", isPublished: "false" },
    { period: "2026", isPublished: null },
  ])
    await assert.rejects(saveProgramPeriod(repo, data, true));
  assert.equal(writes, 0);
});
