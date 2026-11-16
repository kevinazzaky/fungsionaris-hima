import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { ModuleKind, ScriptTarget, transpileModule } from "typescript";
import * as voting from "../src/domain/voting";
import { ValidationError } from "../src/domain/admin";
import { hasSameOrigin } from "../src/domain/request-origin";
import { resetVotingPeriod } from "../src/use-cases/voting";

test("aksi periode aktif/buka/tutup/reset memerlukan admin dan origin yang sesuai; reset memeriksa konfirmasi di server", async () => {
  class AccessError extends Error {}
  let authenticated = false;
  const calls: unknown[][] = [];
  const repository = {
    period: async () => "2026/2027",
    schedule: async (...args: unknown[]) => { calls.push(["schedule", ...args]); },
    close: async (...args: unknown[]) => { calls.push(["close", ...args]); },
    activate: async (...args: unknown[]) => { calls.push(["activate", ...args]); },
    reset: async (...args: unknown[]) => { calls.push(["reset", ...args]); return { ballotsRemoved: 2, rightsRestored: 2, action: "reset-result" }; },
  };
  const modules: Record<string, unknown> = {
    "@/data/auth": { requireAdmin: async () => { if (!authenticated) throw new AccessError(); return { id: "admin" }; } },
    "@/lib/api-response": {
      apiError: (error: unknown) => Response.json({ error: error instanceof Error ? error.message : "error" }, { status: error instanceof AccessError ? 401 : error instanceof ValidationError ? 400 : 503 }),
      assertSameOrigin: (request: Request) => { if (!hasSameOrigin(request.url, request.headers.get("host"), request.headers.get("origin"))) throw new AccessError(); },
      assertUuid: (id: string) => assert.match(id, /^[a-f0-9-]{36}$/),
      readForm: (request: Request) => request.formData(),
    },
    "@/lib/voting-api": { votingJson: (body: unknown, status = 200) => Response.json(body, { status }) },
    "@/data/repositories/voting": { votingRepository: repository },
    "@/domain/voting": voting,
    "@/domain/admin": { ValidationError },
    "@/use-cases/manage-voting-period": {},
    "@/use-cases/voting": { resetVotingPeriod },
    "@/use-cases/voting-token": {},
    "@/data/supabase/storage": {},
    "@/lib/backend-config": { MEDIA_BUCKET: "website-media" },
    "@/data/voting": { votingReady: () => true },
    "@/lib/voting-export": {},
  };
  const context = { exports: {}, Response, Request, URL, FormData, File, require: (name: string) => { assert.ok(Object.hasOwn(modules, name), name); return modules[name]; } };
  runInNewContext(transpileModule(await readFile("src/app/api/admin/voting/route.ts", "utf8"), { compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 } }).outputText, context);
  const { POST } = context.exports as { POST(request: Request): Promise<Response> };
  const id = "00000000-0000-4000-8000-000000000001";
  const send = (action: string, origin = "http://localhost", confirmation = "RESET 2026/2027") => {
    const form = new FormData();
    form.set("action", action); form.set("id", id); form.set("endsAt", "2027-01-01T16:00"); form.set("confirmation", confirmation);
    return POST(new Request("http://localhost/api/admin/voting", { method: "POST", headers: { Origin: origin }, body: form }));
  };
  for (const action of ["activate", "open", "close", "reset"]) assert.equal((await send(action)).status, 401);
  assert.equal(calls.length, 0);
  authenticated = true;
  for (const action of ["activate", "open", "close", "reset"]) assert.equal((await send(action, "https://other.example")).status, 401);
  assert.equal(calls.length, 0);
  assert.equal((await send("reset", "http://localhost", "wrong")).status, 400);
  assert.equal(calls.length, 0);
  assert.equal((await send("open")).status, 200);
  assert.equal(calls[0][0], "schedule"); assert.equal(calls[0][1], id); assert.equal(calls[0][2], null);
  assert.equal((calls[0][3] as Date).toISOString(), "2027-01-01T08:00:00.000Z");
  assert.equal(calls[0][4], "admin");
  assert.equal((await send("close")).status, 200);
  assert.deepEqual(calls[1], ["close", id, "admin"]);
  const response = await send("reset");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ballotsRemoved: 2, rightsRestored: 2, action: "reset-result" });
  assert.deepEqual(calls[2], ["reset", id, "RESET 2026/2027", "admin"]);
  assert.equal((await send("activate")).status, 200);
  assert.deepEqual(calls[3], ["activate", id, "admin"]);
});
