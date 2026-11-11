import assert from "node:assert/strict";

const base = process.argv[2] || "http://localhost:3001";
const host = new URL(base).hostname;
if (!["localhost", "127.0.0.1", "[::1]"].includes(host)) {
  throw new Error(
    "Pemeriksaan ini hanya untuk server lokal; tidak mengirim request ke produksi.",
  );
}

for (const path of ["/api/admin/voting", "/api/admin/voting?export=true"]) {
  const response = await fetch(`${base}${path}`, { redirect: "manual" });
  assert.equal(response.status, 401, `${path} harus memerlukan login`);
  const body = await response.json();
  assert.deepEqual(Object.keys(body), ["error"]);
}
const page = await fetch(`${base}/admin/voting`, { redirect: "manual" });
if (page.status === 307) {
  assert.equal(page.headers.get("location"), "/admin/login");
} else {
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /<meta id="__next-page-redirect" http-equiv="refresh" content="[01];url=\/admin\/login"\s*\/>/);
  assert.doesNotMatch(html, /class="admin-shell"/);
}

const form = new FormData();
form.set("action", "create");
form.set("period", "9998/9999");
const mutation = await fetch(`${base}/api/admin/voting`, {
  method: "POST",
  headers: { Origin: base },
  body: form,
});
assert.equal(
  mutation.status,
  401,
  "Mutasi tanpa login harus ditolak sebelum membaca data",
);

for (const path of ["/api/voting/check", "/api/voting/ballots", "/api/voting/status"]) {
  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      Origin: "https://cross-origin.example.invalid",
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  assert.equal(response.status, 403, `${path} harus menolak origin asing`);
  assert.ok(response.headers.get("cache-control")?.split(/\s*,\s*/).includes("no-store"));
}
console.log(
  "PASS: dashboard/API admin memerlukan login; endpoint publik menolak origin asing dan tidak di-cache.",
);
