import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { ModuleKind, ScriptTarget, transpileModule } from "typescript";
import * as voting from "../src/domain/voting";
import { ValidationError } from "../src/domain/admin";
import { VotingPinLockedError } from "../src/domain/voting-pin";
import { hasSameOrigin } from "../src/domain/request-origin";
import { resetVotingPeriod } from "../src/use-cases/voting";

test("aksi periode aktif/buka/tutup/reset memerlukan admin, origin yang sesuai, dan PIN terbuka; GET & export ditolak saat PIN terkunci", async () => {
  class AccessError extends Error {}
  let authenticated = false;
  let pinUnlocked = false;
  const calls: unknown[][] = [];
  const repository = {
    dashboard: async (...args: unknown[]) => {
      calls.push(["dashboard", ...args]);
      return {
        activeElectionId: null,
        elections: [],
        election: null,
        stats: { total: 0, consumed: 0, ballots: 0, participation: 0 },
        voters: [],
        logs: [],
        results: [],
      };
    },
    period: async () => "2026/2027",
    schedule: async (...args: unknown[]) => { calls.push(["schedule", ...args]); },
    close: async (...args: unknown[]) => { calls.push(["close", ...args]); },
    activate: async (...args: unknown[]) => { calls.push(["activate", ...args]); },
    reset: async (...args: unknown[]) => { calls.push(["reset", ...args]); return { ballotsRemoved: 2, rightsRestored: 2, action: "reset-result" }; },
  };
  const modules: Record<string, unknown> = {
    "@/data/auth": { requireAdmin: async () => { if (!authenticated) throw new AccessError(); return { id: "admin" }; } },
    "@/lib/voting-admin-lock": {
      requireVotingPin: async (adminId: string) => {
        assert.equal(adminId, "admin");
        if (!pinUnlocked) throw new VotingPinLockedError();
        return { configured: true, unlocked: true, expiresAt: Date.now() + 60_000 };
      },
    },
    "@/lib/api-response": {
      apiError: (error: unknown) =>
        Response.json(
          { error: error instanceof Error ? error.message : "error" },
          {
            status:
              error instanceof AccessError
                ? 401
                : error instanceof VotingPinLockedError
                  ? 403
                  : error instanceof ValidationError
                    ? 400
                    : 503,
          },
        ),
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
    "@/lib/voting-export": { createVotingRecap: () => new Uint8Array([1, 2, 3]) },
  };
  const context = { exports: {}, Response, Request, URL, FormData, File, require: (name: string) => { assert.ok(Object.hasOwn(modules, name), name); return modules[name]; } };
  runInNewContext(transpileModule(await readFile("src/app/api/admin/voting/route.ts", "utf8"), { compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 } }).outputText, context);
  const { GET, POST } = context.exports as {
    GET(request: Request): Promise<Response>;
    POST(request: Request): Promise<Response>;
  };
  const id = "00000000-0000-4000-8000-000000000001";
  const send = (action: string, origin = "http://localhost", confirmation = "RESET 2026/2027") => {
    const form = new FormData();
    form.set("action", action); form.set("id", id); form.set("endsAt", "2027-01-01T16:00"); form.set("confirmation", confirmation);
    return POST(new Request("http://localhost/api/admin/voting", { method: "POST", headers: { Origin: origin }, body: form }));
  };

  assert.equal((await GET(new Request("http://localhost/api/admin/voting"))).status, 401);
  assert.equal((await GET(new Request("http://localhost/api/admin/voting?export=true"))).status, 401);
  for (const action of ["activate", "open", "close", "reset"]) assert.equal((await send(action)).status, 401);
  assert.equal(calls.length, 0);

  authenticated = true;
  assert.equal((await GET(new Request("http://localhost/api/admin/voting"))).status, 403);
  assert.equal((await GET(new Request(`http://localhost/api/admin/voting?id=${id}&export=true`))).status, 403);
  for (const action of ["activate", "open", "close", "reset"]) assert.equal((await send(action)).status, 403);
  assert.equal(calls.length, 0);

  pinUnlocked = true;
  for (const action of ["activate", "open", "close", "reset"]) assert.equal((await send(action, "https://other.example")).status, 401);
  assert.equal(calls.length, 0);
  assert.equal((await send("reset", "http://localhost", "wrong")).status, 400);
  assert.equal(calls.length, 0);
  assert.equal((await GET(new Request("http://localhost/api/admin/voting"))).status, 200);
  assert.equal(calls[0][0], "dashboard");
  assert.equal((await send("open")).status, 200);
  assert.equal(calls[1][0], "schedule"); assert.equal(calls[1][1], id); assert.equal(calls[1][2], null);
  assert.equal((calls[1][3] as Date).toISOString(), "2027-01-01T08:00:00.000Z");
  assert.equal(calls[1][4], "admin");
  assert.equal((await send("close")).status, 200);
  assert.deepEqual(calls[2], ["close", id, "admin"]);
  const response = await send("reset");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ballotsRemoved: 2, rightsRestored: 2, action: "reset-result" });
  assert.deepEqual(calls[3], ["reset", id, "RESET 2026/2027", "admin"]);
  assert.equal((await send("activate")).status, 200);
  assert.deepEqual(calls[4], ["activate", id, "admin"]);
});
