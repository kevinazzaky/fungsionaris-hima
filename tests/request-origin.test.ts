import assert from "node:assert/strict";
import test from "node:test";
import { hasSameOrigin } from "../src/domain/request-origin";

test("origin memakai Host browser ketika Next menormalisasi loopback menjadi localhost", () => {
  assert.ok(
    hasSameOrigin(
      "http://localhost:3000/api/admin/content/hero",
      "127.0.0.1:3000",
      "http://127.0.0.1:3000",
    ),
  );
  assert.ok(
    hasSameOrigin(
      "https://example.com/api",
      "example.com",
      "https://example.com",
    ),
  );
  assert.ok(
    hasSameOrigin("https://example.com/api", null, "https://example.com"),
  );
});
test("origin kosong, lintas host, skema, port dan Host tidak valid tetap ditolak", () => {
  for (const origin of [
    null,
    "null",
    "https://evil.example",
    "http://example.com",
    "https://example.com:3000",
    "https://example.com/path",
  ]) {
    assert.equal(
      hasSameOrigin("https://example.com/api", "example.com", origin),
      false,
    );
  }
  for (const host of [
    "example.com@evil.example",
    "example.com/path",
    "example.com?query",
    "example.com#hash",
    "invalid host",
  ])
    assert.equal(
      hasSameOrigin("https://example.com/api", host, "https://example.com"),
      false,
    );
});
