import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("cache Prisma mengikuti perubahan DATABASE_URL dan mengganti singleton lama", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--conditions=react-server",
      "--import=tsx",
      "-e",
      `
      const assert = require('node:assert/strict');
      const { getPrisma } = require('./src/data/prisma.ts');
      (async () => {
        let disconnected = 0;
        const legacy = { $disconnect: async () => { disconnected++; } };
        globalThis.prisma = legacy;
        process.env.DATABASE_URL = 'postgresql://test:test@db.example.invalid:5432/first';
        const first = getPrisma();
        assert.notEqual(first, legacy);
        assert.equal(disconnected, 1);
        assert.equal(getPrisma(), first);
        process.env.DATABASE_URL = 'postgresql://test:test@db.example.invalid:5432/second';
        const second = getPrisma();
        assert.notEqual(second, first);
        assert.equal(getPrisma(), second);
        process.env.DATABASE_URL = 'postgresql://test:test@aws-REGION.pooler.supabase.com:6543/postgres';
        assert.throws(getPrisma, /DATABASE_URL/);
        await second.$disconnect();
      })().catch(error => { console.error(error); process.exitCode = 1; });
    `,
    ],
    { cwd: process.cwd(), encoding: "utf8", timeout: 20000 },
  );
  assert.equal(
    result.status,
    0,
    result.error?.message || result.stderr || result.stdout,
  );
});
