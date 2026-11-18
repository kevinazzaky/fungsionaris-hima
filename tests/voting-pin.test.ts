import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModuleKind, ScriptTarget, transpileModule } from "typescript";
import { PGlite } from "@electric-sql/pglite";
import { ValidationError } from "../src/domain/admin";
import {
  VotingPinLockedError,
  type VotingPinGateState,
  validateNewVotingPin,
} from "../src/domain/voting-pin";
import { hasSameOrigin } from "../src/domain/request-origin";
import {
  changeVotingAdminPin,
  hashVotingAdminPin,
  issueVotingAdminLockToken,
  resolveVotingLockSecret,
  setupVotingAdminPin,
  unlockVotingAdminPin,
  verifyVotingAdminLockToken,
  verifyVotingAdminPinHash,
  type StoredVotingPinRecord,
  type VotingPinRepository,
} from "../src/use-cases/voting-pin";

const TEST_SECRET = "server-secret-longer-than-thirty-two-chars-for-tests";
const TEST_PIN = "202699";

function createMemoryPinRepo(initial: StoredVotingPinRecord | null = null): VotingPinRepository {
  let state: StoredVotingPinRecord | null = initial;
  return {
    read: async () => state,
    setupInitialPin: async (pinHash) => {
      if (state?.adminPinHash) return { status: "already_configured" };
      const nextVersion = Math.max(1, (state?.pinVersion ?? 0) + 1);
      const now = new Date();
      state = { adminPinHash: pinHash, pinVersion: nextVersion, pinUpdatedAt: now };
      return { status: "created", pinHash, pinVersion: nextVersion, pinUpdatedAt: now };
    },
    changePinWithVerification: async ({ verifyCurrent, isSameAsCurrent, createNextHash }) => {
      if (!state?.adminPinHash) return { status: "unconfigured" };
      if (!(await verifyCurrent(state.adminPinHash))) return { status: "invalid_current" };
      if (await isSameAsCurrent(state.adminPinHash)) return { status: "same_as_current" };
      const nextHash = await createNextHash();
      const nextVersion = state.pinVersion + 1;
      const now = new Date();
      state = { adminPinHash: nextHash, pinVersion: nextVersion, pinUpdatedAt: now };
      return { status: "updated", pinHash: nextHash, pinVersion: nextVersion, pinUpdatedAt: now };
    },
  };
}

function createLimiter() {
  const counts = new Map<string, number>();
  let cleared = 0;
  return {
    rate: async (key: string, _scope: string, limit: number) => {
      const next = (counts.get(key) ?? 0) + 1;
      counts.set(key, next);
      return next <= limit;
    },
    clearRate: async (key: string) => {
      cleared++;
      counts.delete(key);
    },
    get cleared() {
      return cleared;
    },
  };
}

test("validasi format PIN, hashing scrypt, dan verifikasi cookie terikat admin + pinVersion", async () => {
  assert.throws(() => validateNewVotingPin("123", "123"), ValidationError);
  assert.throws(() => validateNewVotingPin("    ", "    "), ValidationError);
  assert.throws(() => validateNewVotingPin("2026", "2027"), ValidationError);
  assert.equal(validateNewVotingPin(TEST_PIN, TEST_PIN), TEST_PIN);

  assert.equal(resolveVotingLockSecret({}), null);
  assert.equal(resolveVotingLockSecret({ SUPABASE_SECRET_KEY: "sb-secret" }), "sb-secret");
  assert.equal(resolveVotingLockSecret({ VOTING_SECRET: "voting-secret", SUPABASE_SECRET_KEY: "sb-secret" }), "voting-secret");

  const hash = await hashVotingAdminPin(TEST_PIN);
  assert.ok(hash.startsWith("scrypt:v1:"));
  assert.equal(hash.includes(TEST_PIN), false);
  assert.equal(await verifyVotingAdminPinHash(TEST_PIN, hash), true);
  assert.equal(await verifyVotingAdminPinHash("2026", hash), false);
  assert.equal(await verifyVotingAdminPinHash(null, hash), false);
  assert.equal(await verifyVotingAdminPinHash("😀".repeat(20), hash), false);

  const now = 1_700_000_000_000;
  const issued = issueVotingAdminLockToken("admin-1", hash, 1, TEST_SECRET, now);
  assert.deepEqual(
    verifyVotingAdminLockToken(issued.token, "admin-1", hash, 1, TEST_SECRET, now + 1000),
    { unlocked: true, expiresAt: issued.expiresAt },
  );
  // Cookie milik admin-1 tidak boleh dipakai oleh admin-2.
  assert.equal(verifyVotingAdminLockToken(issued.token, "admin-2", hash, 1, TEST_SECRET, now + 1000).unlocked, false);
  // Menaikkan pinVersion atau mengganti hash otomatis menghanguskan cookie lama.
  assert.equal(verifyVotingAdminLockToken(issued.token, "admin-1", hash, 2, TEST_SECRET, now + 1000).unlocked, false);
  const nextHash = await hashVotingAdminPin("999999");
  assert.equal(verifyVotingAdminLockToken(issued.token, "admin-1", nextHash, 1, TEST_SECRET, now + 1000).unlocked, false);
  // Tamper (termasuk bit akhir base64url maupun awal signature) dan kedaluwarsa ditolak.
  const [payloadPart, sigPart] = issued.token.split(".");
  const tamperedLast = `${payloadPart}.${sigPart.slice(0, -1)}${sigPart.endsWith("A") ? "B" : "A"}`;
  const tamperedFirst = `${payloadPart}.${sigPart.startsWith("A") ? "B" : "A"}${sigPart.slice(1)}`;
  assert.equal(verifyVotingAdminLockToken(tamperedLast, "admin-1", hash, 1, TEST_SECRET, now + 1000).unlocked, false);
  assert.equal(verifyVotingAdminLockToken(tamperedFirst, "admin-1", hash, 1, TEST_SECRET, now + 1000).unlocked, false);
  assert.equal(verifyVotingAdminLockToken(issued.token, "admin-1", hash, 1, TEST_SECRET, issued.expiresAt).unlocked, false);
});

test("setup awal atomik mencegah timpa PIN, rate limit blokir brute-force, dan ganti PIN memvalidasi PIN lama", async () => {
  const repository = createMemoryPinRepo();
  const limiter = createLimiter();
  const env = { VOTING_SECRET: TEST_SECRET };

  // Unlock sebelum setup ditolak sebagai unconfigured.
  await assert.rejects(
    unlockVotingAdminPin({ adminId: "admin-1", pin: TEST_PIN, network: "shared", repository, limiter, env }),
    VotingPinLockedError,
  );

  // Setup pertama kali berhasil.
  const setup = await setupVotingAdminPin({
    adminId: "admin-1",
    newPin: TEST_PIN,
    confirmPin: TEST_PIN,
    repository,
    env,
  });
  assert.equal(setup.ok, true);
  assert.equal(setup.status, 201);

  // Setup ulang dari akun/browser kedua ditolak dengan 409.
  const secondSetup = await setupVotingAdminPin({
    adminId: "admin-2",
    newPin: "attacker99",
    confirmPin: "attacker99",
    repository,
    env,
  });
  assert.equal(secondSetup.ok, false);
  if (!secondSetup.ok) assert.equal(secondSetup.status, 409);

  // 5 percobaan salah mengaktifkan limiter 429 pada percobaan ke-6.
  for (let i = 0; i < 5; i++) {
    const fail = await unlockVotingAdminPin({
      adminId: "admin-1",
      pin: "000000",
      network: "shared",
      repository,
      limiter,
      env,
    });
    assert.equal(fail.ok, false);
    if (!fail.ok) assert.equal(fail.status, 403);
  }
  const throttled = await unlockVotingAdminPin({
    adminId: "admin-1",
    pin: TEST_PIN,
    network: "shared",
    repository,
    limiter,
    env,
  });
  assert.equal(throttled.ok, false);
  if (!throttled.ok) assert.equal(throttled.status, 429);

  // Bucket admin-2 dapat membuka dengan PIN valid dan me-reset counternya.
  const unlocked = await unlockVotingAdminPin({
    adminId: "admin-2",
    pin: TEST_PIN,
    network: "shared",
    repository,
    limiter,
    env,
  });
  assert.equal(unlocked.ok, true);
  assert.equal(limiter.cleared, 1);

  // Ganti PIN menolak PIN lama yang salah maupun PIN baru yang sama.
  const wrongCurrent = await changeVotingAdminPin({
    adminId: "admin-2",
    currentPin: "wrongpin",
    newPin: "334455",
    confirmPin: "334455",
    network: "shared",
    repository,
    limiter,
    env,
  });
  assert.equal(wrongCurrent.ok, false);
  if (!wrongCurrent.ok) assert.equal(wrongCurrent.status, 403);

  await assert.rejects(
    changeVotingAdminPin({
      adminId: "admin-2",
      currentPin: TEST_PIN,
      newPin: TEST_PIN,
      confirmPin: TEST_PIN,
      network: "shared",
      repository,
      limiter,
      env,
    }),
    ValidationError,
  );

  // Ganti PIN berhasil, mengembalikan cookie pinVersion baru dan membatalkan token versi 1.
  const changed = await changeVotingAdminPin({
    adminId: "admin-2",
    currentPin: TEST_PIN,
    newPin: "334455",
    confirmPin: "334455",
    network: "shared",
    repository,
    limiter,
    env,
  });
  assert.equal(changed.ok, true);
  const stored = await repository.read();
  assert.ok(stored && stored.adminPinHash && stored.pinVersion === 2);
  if (unlocked.ok) {
    assert.equal(
      verifyVotingAdminLockToken(unlocked.token, "admin-2", stored.adminPinHash, stored.pinVersion, TEST_SECRET).unlocked,
      false,
    );
  }
  if (changed.ok) {
    assert.equal(
      verifyVotingAdminLockToken(changed.token, "admin-2", stored.adminPinHash, stored.pinVersion, TEST_SECRET).unlocked,
      true,
    );
  }
});

test("endpoint /api/admin/voting/pin memvalidasi admin, origin, setup, unlock, ganti PIN, dan kunci ulang", async () => {
  class AccessError extends Error {}
  let authenticated = false;
  let unlockedSession = false;
  let setToken = "";
  let cleared = false;
  const repository = createMemoryPinRepo();
  const limiter = createLimiter();

  const modules: Record<string, unknown> = {
    "@/data/auth": {
      requireAdmin: async () => {
        if (!authenticated) throw new AccessError();
        return { id: "admin-1" };
      },
    },
    "@/data/prisma": {
      getPrisma: () => ({
        votingRateLimit: { deleteMany: async () => {} },
      }),
    },
    "@/data/repositories/voting": { votingRepository: { rate: limiter.rate } },
    "@/data/repositories/voting-pin": { votingPinRepository: repository },
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
      assertSameOrigin: (request: Request) => {
        if (!hasSameOrigin(request.url, request.headers.get("host"), request.headers.get("origin"))) {
          throw new AccessError();
        }
      },
      readJson: async (request: Request) => request.json(),
    },
    "@/lib/voting-admin-lock": {
      requireVotingPin: async () => {
        if (!unlockedSession) throw new VotingPinLockedError();
      },
      setVotingAdminLockCookie: async (token: string) => {
        setToken = token;
        unlockedSession = true;
      },
      clearVotingAdminLockCookie: async () => {
        cleared = true;
        unlockedSession = false;
      },
    },
    "@/lib/voting-api": {
      votingJson: (body: unknown, status = 200) =>
        Response.json(body, { status, headers: { "Cache-Control": "no-store" } }),
    },
    "@/use-cases/voting-pin": {
      setupVotingAdminPin: (args: Parameters<typeof setupVotingAdminPin>[0]) =>
        setupVotingAdminPin({ ...args, env: { VOTING_SECRET: TEST_SECRET } }),
      unlockVotingAdminPin: (args: Parameters<typeof unlockVotingAdminPin>[0]) =>
        unlockVotingAdminPin({ ...args, env: { VOTING_SECRET: TEST_SECRET } }),
      changeVotingAdminPin: (args: Parameters<typeof changeVotingAdminPin>[0]) =>
        changeVotingAdminPin({ ...args, env: { VOTING_SECRET: TEST_SECRET } }),
    },
  };

  const context = {
    exports: {},
    Response,
    Request,
    process,
    require: (name: string) => {
      assert.ok(Object.hasOwn(modules, name), name);
      return modules[name];
    },
  };
  runInNewContext(
    transpileModule(await readFile("src/app/api/admin/voting/pin/route.ts", "utf8"), {
      compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 },
    }).outputText,
    context,
  );
  const { POST, PATCH, DELETE } = context.exports as {
    POST(request: Request): Promise<Response>;
    PATCH(request: Request): Promise<Response>;
    DELETE(request: Request): Promise<Response>;
  };

  const sendPost = (payload: unknown, origin = "http://localhost") =>
    POST(
      new Request("http://localhost/api/admin/voting/pin", {
        method: "POST",
        headers: { Origin: origin, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    );

  // Unauthenticated selalu 401.
  assert.equal((await sendPost({ action: "setup", newPin: TEST_PIN, confirmPin: TEST_PIN })).status, 401);
  assert.equal(
    (
      await PATCH(
        new Request("http://localhost/api/admin/voting/pin", {
          method: "PATCH",
          headers: { Origin: "http://localhost", "Content-Type": "application/json" },
          body: JSON.stringify({ currentPin: TEST_PIN, newPin: "556677", confirmPin: "556677" }),
        }),
      )
    ).status,
    401,
  );

  authenticated = true;
  assert.equal((await sendPost({ action: "setup", newPin: TEST_PIN, confirmPin: TEST_PIN }, "https://attacker.example")).status, 401);

  const created = await sendPost({ action: "setup", newPin: TEST_PIN, confirmPin: TEST_PIN });
  assert.equal(created.status, 201);
  assert.ok(setToken.includes("."));

  // Kunci ulang, lalu coba PATCH saat terkunci -> 403.
  const locked = await DELETE(
    new Request("http://localhost/api/admin/voting/pin", {
      method: "DELETE",
      headers: { Origin: "http://localhost" },
    }),
  );
  assert.equal(locked.status, 200);
  assert.equal(cleared, true);

  assert.equal(
    (
      await PATCH(
        new Request("http://localhost/api/admin/voting/pin", {
          method: "PATCH",
          headers: { Origin: "http://localhost", "Content-Type": "application/json" },
          body: JSON.stringify({ currentPin: TEST_PIN, newPin: "556677", confirmPin: "556677" }),
        }),
      )
    ).status,
    403,
  );

  assert.equal((await sendPost({ action: "unlock", pin: "salah" })).status, 403);
  assert.equal((await sendPost({ action: "unlock", pin: TEST_PIN })).status, 200);

  const patched = await PATCH(
    new Request("http://localhost/api/admin/voting/pin", {
      method: "PATCH",
      headers: { Origin: "http://localhost", "Content-Type": "application/json" },
      body: JSON.stringify({ currentPin: TEST_PIN, newPin: "556677", confirmPin: "556677" }),
    }),
  );
  assert.equal(patched.status, 200);
});

test("migration voting_admin_pin menjaga pilihan periode aktif serta akses RLS tertutup untuk role publik", async () => {
  const db = new PGlite();
  try {
    await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;");
    await db.exec("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated,service_role;");
    const migrations = (await readdir("prisma/migrations", { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    for (const migration of migrations) {
      await db.exec(await readFile(`prisma/migrations/${migration}/migration.sql`, "utf8"));
    }
    const row = (
      await db.query<{ admin_pin_hash: string | null; pin_version: number; pin_updated_at: Date | null }>(
        "SELECT admin_pin_hash, pin_version, pin_updated_at FROM voting_settings WHERE id='main'",
      )
    ).rows[0];
    assert.equal(row.admin_pin_hash, null);
    assert.equal(row.pin_version, 0);
    assert.equal(row.pin_updated_at, null);

    await db.exec("SET ROLE anon");
    await assert.rejects(db.query("SELECT admin_pin_hash FROM voting_settings"));
    await assert.rejects(db.query("UPDATE voting_settings SET admin_pin_hash='x' WHERE id='main'"));
  } finally {
    await db.close();
  }
});

test("halaman server /admin/voting hanya merender VotingPinGate saat terkunci dan bebas data pemilihan", async () => {
  let state: VotingPinGateState | "unlocked" = "unconfigured";
  const modules: Record<string, unknown> = {
    "next/navigation": { redirect: () => { throw new Error("unexpected redirect"); } },
    "@/data/auth": { getAdmin: async () => ({ id: "admin-1", email: "admin@example.test" }) },
    "@/lib/voting-admin-lock": {
      votingAdminLockStatus: async () => ({
        state,
        unlocked: state === "unlocked",
        pinConfigured: state === "locked" || state === "unlocked",
        expiresAt: null,
        pinUpdatedAt: "2026-11-18T09:00:00.000Z",
      }),
    },
    "@/components/admin/voting-manager": {
      VotingManager: (props: { initialPinUpdatedAt?: string | null }) =>
        createElement("div", {
          "data-marker": "voting-manager-secret",
          "data-pin-updated": props.initialPinUpdatedAt ?? "",
        }),
    },
    "@/components/admin/voting-pin-gate": {
      VotingPinGate: (props: { state: VotingPinGateState }) =>
        createElement("div", { "data-pin-state": props.state }),
    },
    "react/jsx-runtime": await import("react/jsx-runtime"),
  };
  const context = {
    exports: {},
    require: (name: string) => {
      assert.ok(Object.hasOwn(modules, name), name);
      return modules[name];
    },
  };
  runInNewContext(
    transpileModule(await readFile("src/app/admin/(panel)/voting/page.tsx", "utf8"), {
      compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022, jsx: 4 },
    }).outputText,
    context,
  );
  const { default: Page } = context.exports as { default(): Promise<React.ReactElement> };

  for (const lockedState of ["unconfigured", "locked", "unavailable"] as const) {
    state = lockedState;
    const html = renderToStaticMarkup(await Page());
    assert.match(html, new RegExp(`data-pin-state="${lockedState}"`));
    assert.doesNotMatch(html, /voting-manager-secret/);
  }

  state = "unlocked";
  const unlockedHtml = renderToStaticMarkup(await Page());
  assert.match(unlockedHtml, /voting-manager-secret/);
  assert.doesNotMatch(unlockedHtml, /data-pin-state/);
});

test("VotingPinGate merender seluruh state (setup, locked, unavailable) dengan label aksesibel dan bebas em/en dash", async () => {
  const icons = await import("@phosphor-icons/react/dist/ssr");
  const requestMod = await import("../src/components/admin/request");
  const { VotingPinField } = await import("../src/components/admin/voting-pin-field");
  const { PendingLabel } = await import("../src/components/ui/pending-label");
  const react = await import("react");
  const modules: Record<string, unknown> = {
    react,
    "react/jsx-runtime": await import("react/jsx-runtime"),
    "next/navigation": { useRouter: () => ({ refresh: () => {} }) },
    "@phosphor-icons/react/dist/ssr": icons,
    "./request": requestMod,
    "./voting-pin-field": { VotingPinField },
    "@/components/ui/pending-label": { PendingLabel },
  };
  const context = {
    exports: {},
    require: (name: string) => {
      assert.ok(Object.hasOwn(modules, name), name);
      return modules[name];
    },
  };
  runInNewContext(
    transpileModule(await readFile("src/components/admin/voting-pin-gate.tsx", "utf8"), {
      compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022, jsx: 4 },
    }).outputText,
    context,
  );
  const { VotingPinGate } = context.exports as {
    VotingPinGate(props: { state: VotingPinGateState }): React.ReactElement;
  };

  const setupHtml = renderToStaticMarkup(createElement(VotingPinGate, { state: "unconfigured" }));
  assert.match(setupHtml, /Buat PIN Pemilihan Ketua/);
  assert.match(setupHtml, /Simpan PIN &amp; Buka/);
  assert.match(setupHtml, /name="newPin"/);
  assert.match(setupHtml, /name="confirmPin"/);
  assert.doesNotMatch(setupHtml, /[\u2013\u2014]/);

  const lockedHtml = renderToStaticMarkup(createElement(VotingPinGate, { state: "locked" }));
  assert.match(lockedHtml, /Masukkan PIN Pemilihan Ketua/);
  assert.match(lockedHtml, /Buka Pemilihan Ketua/);
  assert.match(lockedHtml, /type="password"/);
  assert.doesNotMatch(lockedHtml, /[\u2013\u2014]/);

  const unavailableHtml = renderToStaticMarkup(createElement(VotingPinGate, { state: "unavailable" }));
  assert.match(unavailableHtml, /Akses Pemilihan Ketua belum siap/);
  assert.doesNotMatch(unavailableHtml, /<form/);
  assert.doesNotMatch(unavailableHtml, /[\u2013\u2014]/);
});

test("logout dan ganti kata sandi membersihkan cookie kunci Pemilihan Ketua", async () => {
  const actionsSource = await readFile("src/app/admin/actions.ts", "utf8");
  const matches = actionsSource.match(/clearVotingAdminLockCookie/g) ?? [];
  assert.equal(matches.length, 3);
});
