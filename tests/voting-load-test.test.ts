import assert from "node:assert/strict";
import test from "node:test";
import { testTarget, dummyNims, concurrentMap, capacityFixtureSource, requestSummary, fontFreeFixtureSource } from "../scripts/lib/voting-load-test";

const ref = "a".repeat(20), originalRef = "b".repeat(20);
const input = {
  VOTING_TEST_PROJECT_REF: ref,
  DATABASE_URL: `postgresql://postgres.${ref}:test-password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
  DIRECT_URL: `postgresql://postgres.${ref}:test-password@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`,
  VOTING_SECRET: "dummy-only-secret-longer-than-32-characters",
  VOTING_TEST_ACK: "ISOLATED_DUMMY_ONLY",
};
const original = { NEXT_PUBLIC_SUPABASE_URL: `https://${originalRef}.supabase.co`, VOTING_SECRET: "original-secret" };

test("target uji menolak project HIMA, URL campuran dan konfigurasi belum lengkap tanpa membocorkan password", () => {
  const snapshot = JSON.stringify(original);
  const target = testTarget(input, original, "/public-ca.crt");
  assert.equal(target.projectRef, ref);
  assert.equal(new URL(target.databaseUrl).searchParams.get("sslmode"), "verify-full");
  assert.equal(JSON.stringify(original), snapshot);
  for (const invalid of [
    { ...input, VOTING_TEST_PROJECT_REF: originalRef },
    { ...input, DIRECT_URL: input.DIRECT_URL.replace(ref, originalRef) },
    { ...input, DATABASE_URL: "ISI_TRANSACTION_POOLER_URI" },
    { ...input, VOTING_TEST_ACK: "" },
    { ...input, VOTING_SECRET: original.VOTING_SECRET },
    { ...input, DATABASE_URL: input.DATABASE_URL.replace("test-password", "[YOUR-PASSWORD]") },
  ]) assert.throws(() => testTarget(invalid, original, "/public-ca.crt"), error => {
    assert.ok(error instanceof Error);
    assert.doesNotMatch(error.message, /test-password|postgresql:\/\//);
    return true;
  });
});

test("200 NIM dummy unik selalu delapan angka dan tidak menerima jumlah berlebihan", () => {
  const nims = dummyNims(200);
  assert.equal(nims.length, 200);
  assert.equal(new Set(nims).size, 200);
  assert.ok(nims.every(nim => /^99\d{6}$/.test(nim)));
  assert.throws(() => dummyNims(201));
});

test("simulasi menghormati concurrency dan mengerjakan setiap pemilih satu kali", async () => {
  let active = 0, peak = 0;
  const result = await concurrentMap([1,2,3,4,5], 2, async value => {
    active++; peak = Math.max(peak, active);
    await new Promise(resolve => setTimeout(resolve, 1));
    active--; return value * 2;
  });
  assert.equal(peak, 2);
  assert.deepEqual(result, [2,4,6,8,10]);
});

test("pelonggaran limiter hanya mengubah salinan fixture dan gagal jika pola sumber berubah", () => {
  const source = 'const networkLimit = 50; perNim = 5;';
  assert.equal(capacityFixtureSource(source), 'const networkLimit = 1000; perNim = 5;');
  assert.equal(source, 'const networkLimit = 50; perNim = 5;');
  assert.throws(() => capacityFixtureSource("unexpected source"));
});

test("laporan membedakan penolakan limiter dari kegagalan server serta menghitung p95", () => {
  assert.deepEqual(requestSummary([
    {status:200,ms:10},{status:200,ms:30},{status:429,ms:20},{status:503,ms:40},{status:0,ms:50},
  ]), {requests:5,ok:2,rateLimited:1,otherHttpErrors:1,networkErrors:1,p50Ms:30,p95Ms:50,maxMs:50});
});

test("salinan tes API tidak mengunduh font tetapi mempertahankan markup layout", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile("src/app/layout.tsx", "utf8");
  const fixture = fontFreeFixtureSource(source);
  assert.doesNotMatch(fixture, /next\/font\/google|= Figtree\(/);
  assert.ok(fixture.includes('<html'));
  assert.ok(fixture.includes('<SiteChrome>{children}</SiteChrome>'));
  assert.match(source, /next\/font\/google/);
});
