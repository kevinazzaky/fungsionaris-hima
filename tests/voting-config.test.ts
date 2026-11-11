import assert from "node:assert/strict";
import test from "node:test";
import { isVotingConfigured } from "../src/lib/backend-config";

test("voting NIM-only tidak memerlukan key Turnstile tetapi tetap memerlukan aktivasi prototipe dan secret", (context) => {
  const keys = [
    "VOTING_SECRET",
    "VOTING_PROTOTYPE_ENABLED",
    "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
    "TURNSTILE_SECRET_KEY",
    "TURNSTILE_EXPECTED_HOSTNAME",
  ];
  const original = Object.fromEntries(
    keys.map((key) => [key, process.env[key]]),
  );
  context.after(() => {
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  });
  for (const key of keys) delete process.env[key];
  process.env.VOTING_SECRET = "test-secret-only-longer-than-32-characters";
  process.env.VOTING_PROTOTYPE_ENABLED = "true";
  assert.equal(isVotingConfigured(), true);
  process.env.VOTING_PROTOTYPE_ENABLED = "false";
  assert.equal(isVotingConfigured(), false);
  process.env.VOTING_PROTOTYPE_ENABLED = "true";
  process.env.VOTING_SECRET = "too-short";
  assert.equal(isVotingConfigured(), false);
  delete process.env.VOTING_SECRET;
  assert.equal(isVotingConfigured(), false);
});
