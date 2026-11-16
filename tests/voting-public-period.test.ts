import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("periode publik hanya membaca pilihan aktif tanpa fallback otomatis ke periode lain", () => {
  const result = spawnSync(process.execPath, ["--conditions=react-server", "--import=tsx", "-e", `
    const assert = require('node:assert/strict');
    const { votingRepository } = require('./src/data/repositories/voting.ts');
    process.env.DATABASE_URL = 'postgresql://test:test@db.example.invalid:5432/test';
    globalThis.prismaConnectionString = process.env.DATABASE_URL;
    const scheduled = { id: 'scheduled', period: '2026/2027', status: 'scheduled',
      startsAt: new Date('2026-11-16T07:10:00Z'), endsAt: new Date('2026-11-16T07:40:00Z'), candidates: [] };
    let hasActive = true, reads = 0;
    globalThis.prisma = { election: { findFirst: async (args) => {
      reads++;
      assert.deepEqual(args.where, { activeSettings: { is: { id: 'main' } } });
      assert.deepEqual(args.include, { candidates: true });
      return hasActive ? scheduled : null;
    } } };
    (async () => {
      const first = await votingRepository.latest();
      assert.equal(first.period, '2026/2027');
      assert.equal(first.startsAt, '2026-11-16T07:10:00.000Z');
      assert.equal(reads, 1);
      hasActive = false; reads = 0;
      assert.equal(await votingRepository.latest(), null);
      assert.equal(reads, 1);
    })().catch(error => { console.error(error); process.exitCode = 1; });
  `], { cwd: process.cwd(), encoding: "utf8", timeout: 20000 });
  assert.equal(result.status, 0, result.error?.message || result.stderr || result.stdout);
});
