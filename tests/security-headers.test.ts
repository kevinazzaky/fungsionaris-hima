import assert from "node:assert/strict";
import test from "node:test";
import { contentSecurityPolicy, serializeJsonForHtml } from "../src/lib/security-headers";

test("CSP produksi mewajibkan nonce script dan menolak handler inline serta framing", () => {
  const policy = contentSecurityPolicy("test-nonce", false, "https://example.supabase.co/path");
  const directives = policy.split(";").map(s => s.trim());
  const scripts = directives.find(s => s.startsWith("script-src "))!;
  assert.ok(scripts.includes("'nonce-test-nonce'"));
  assert.ok(scripts.includes("'strict-dynamic'"));
  assert.doesNotMatch(scripts, /unsafe-inline|unsafe-eval/);
  for (const expected of ["script-src-attr 'none'", "object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'"])
    assert.ok(directives.includes(expected));
  assert.match(policy, /https:\/\/example\.supabase\.co/);
  assert.doesNotMatch(policy, /supabase\.co\/path/);
});

test("kelonggaran eval dan websocket hanya aktif di development", () => {
  assert.match(contentSecurityPolicy("dev", true), /'unsafe-eval'/);
  assert.match(contentSecurityPolicy("dev", true), /ws:/);
  assert.doesNotMatch(contentSecurityPolicy("prod", false), /unsafe-eval|ws:/);
});

test("HTTP loopback tidak dipaksa ke HTTPS tetapi domain publik tetap di-upgrade", () => {
  for (const host of ["127.0.0.1", "localhost", "[::1]"]) {
    const local = contentSecurityPolicy("local", false, undefined, `http://${host}:3003/voting`);
    assert.doesNotMatch(local, /upgrade-insecure-requests|unsafe-eval/);
    assert.match(local, /'nonce-local'/);
    assert.match(local, /script-src-attr 'none'/);
  }
  for (const url of ["https://example.com/voting", "http://example.com/voting", "http://localhost.example.com/voting"])
    assert.match(contentSecurityPolicy("public", false, undefined, url), /upgrade-insecure-requests/);
});

test("JSON terstruktur tidak dapat menutup tag script dan nilainya tetap sama", () => {
  const payload = { name: '</script><script>alert("x")</script>', description: "Teks < biasa" };
  const result = serializeJsonForHtml(payload);
  assert.doesNotMatch(result, /</);
  assert.deepEqual(JSON.parse(result), payload);
});
