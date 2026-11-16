import assert from "node:assert/strict";

const base = process.argv[2] || "http://localhost:3000";
if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(base).hostname))
  throw new Error("Pemeriksaan ini hanya untuk server lokal.");
const nonces = new Set();
for (const path of ["/admin/login", "/contact", "/admin/login"]) {
  const response = await fetch(`${base}${path}`, {
    headers: { "x-nonce": "attacker", "Content-Security-Policy": "script-src * 'unsafe-inline'" },
    signal: AbortSignal.timeout(20000),
  });
  assert.equal(response.status, 200);
  const policy = response.headers.get("content-security-policy") || "";
  const nonce = /'nonce-([^']+)'/.exec(policy)?.[1];
  assert.ok(nonce && nonce !== "attacker");
  assert.ok(!nonces.has(nonce), "Nonce harus berbeda setiap request");
  nonces.add(nonce);
  assert.match(policy, /script-src-attr 'none'/);
  assert.match(policy, /frame-ancestors 'none'/);
  assert.doesNotMatch(policy.split(";").find(s => s.trim().startsWith("script-src ")) || "", /unsafe-inline/);
  if (process.argv.includes("--production"))
    assert.doesNotMatch(policy, /unsafe-eval/, "Produksi tidak boleh mengizinkan eval");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.match(response.headers.get("cache-control") || "", /no-store/);
  const html = await response.text();
  const scripts = [...html.matchAll(/<script\b([^>]*)>/g)];
  assert.ok(scripts.length > 0);
  assert.ok(scripts.every(([, attrs]) => attrs.includes(`nonce="${nonce}"`)), "Script SSR harus membawa nonce CSP yang sama");
  console.log(`PASS ${path}: CSP, nonce unik, ${scripts.length} script cocok, header pertahanan aktif`);
}
