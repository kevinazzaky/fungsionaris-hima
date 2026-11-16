import assert from "node:assert/strict";
import test from "node:test";
import { selectVotingPeriod } from "../src/use-cases/manage-voting-period";

test("memilih periode existing membuka data lama tanpa membuat draft baru", async () => {
  const id = await selectVotingPeriod(
    {
      findPeriod: async () => ({ id: "existing" }),
      create: async () => {
        assert.fail("Periode existing tidak boleh dibuat ulang");
      },
    },
    "2026/2027",
    "admin",
  );
  assert.equal(id, "existing");
});

test("memilih tahun baru membuat satu periode dan memvalidasi input", async () => {
  const periods = new Map<string, { id: string }>();
  let creates = 0;
  const repository = {
    findPeriod: async (period: string) => periods.get(period) || null,
    create: async (period: string) => {
      creates++;
      periods.set(period, { id: "new-period" });
      return "new-period";
    },
  };
  assert.equal(
    await selectVotingPeriod(repository, "2027/2028", "admin"),
    "new-period",
  );
  assert.equal(
    await selectVotingPeriod(repository, "2027/2028", "admin"),
    "new-period",
  );
  assert.equal(creates, 1);
  await assert.rejects(
    selectVotingPeriod(repository, "bukan-periode", "admin"),
  );
});

test("dua pemilihan tahun bersamaan memakai periode yang sama ketika database menolak duplikat", async () => {
  let lookups = 0;
  const id = await selectVotingPeriod(
    {
      findPeriod: async () =>
        ++lookups === 1 ? null : { id: "concurrent-period" },
      create: async () => {
        throw Object.assign(new Error("unique"), { code: "P2002" });
      },
    },
    "2026/2027",
    "admin",
  );
  assert.equal(id, "concurrent-period");
});

test("kegagalan database tidak dilaporkan sebagai berhasil membuka periode", async () => {
  await assert.rejects(
    selectVotingPeriod(
      {
        findPeriod: async () => null,
        create: async () => {
          throw new Error("database offline");
        },
      },
      "2026/2027",
      "admin",
    ),
    /database offline/,
  );
});
