import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { ModuleKind, ScriptTarget, transpileModule } from "typescript";

test("autentikasi menunggu request sebelum menolak backend yang belum dikonfigurasi", async () => {
  const calls: string[] = [];
  let receiveRequest!: () => void;
  const request = new Promise<void>((resolve) => {
    receiveRequest = resolve;
  });
  const unavailable = () => {
    assert.fail("Backend yang belum dikonfigurasi tidak boleh mengakses Auth atau database.");
  };
  const modules: Record<string, unknown> = {
    "server-only": {},
    react: { cache: (callback: unknown) => callback },
    "next/server": {
      connection: () => {
        calls.push("request");
        return request;
      },
    },
    "@/lib/backend-config": {
      isBackendConfigured: () => {
        calls.push("config");
        return false;
      },
    },
    "@/data/supabase/server": { createAuthClient: unavailable },
    "@/data/prisma": { getPrisma: unavailable },
  };
  const context = {
    exports: {},
    require: (name: string) => {
      assert.ok(Object.hasOwn(modules, name), `Unexpected dependency: ${name}`);
      return modules[name];
    },
  };
  const source = await readFile("src/data/auth.ts", "utf8");
  runInNewContext(
    transpileModule(source, {
      compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2017 },
    }).outputText,
    context,
  );
  const auth = context.exports as {
    getAdmin(): Promise<unknown>;
    requireAdmin(): Promise<unknown>;
    AccessError: new () => Error;
  };

  const pending = auth.getAdmin();
  assert.deepEqual(calls, ["request"]);
  receiveRequest();
  assert.equal(await pending, null);
  assert.deepEqual(calls, ["request", "config"]);
  await assert.rejects(auth.requireAdmin(), auth.AccessError);
});
