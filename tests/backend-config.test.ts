import assert from "node:assert/strict";
import test from "node:test";
import {
  isBackendConfigured,
  isDatabaseConfigured,
} from "../src/lib/backend-config";

test("nilai contoh DATABASE_URL tidak mengaktifkan backend", (context) => {
  const original = process.env.DATABASE_URL;
  context.after(() => {
    if (original === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = original;
  });
  for (const value of [
    "",
    "postgresql://postgres.PROJECT_REF:ENCODED_PASSWORD@aws-REGION.pooler.supabase.com:6543/postgres?sslmode=verify-full",
    "postgresql://postgres.YOUR_PROJECT:password@db.example.invalid:6543/postgres",
    "bukan connection string",
    "https://db.example.invalid/postgres",
  ]) {
    process.env.DATABASE_URL = value;
    assert.equal(isDatabaseConfigured(), false);
    assert.equal(isBackendConfigured(), false);
  }
});

test("connection string PostgreSQL yang sudah diisi dapat mengaktifkan pembacaan database", (context) => {
  const original = process.env.DATABASE_URL;
  context.after(() => {
    if (original === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = original;
  });
  for (const protocol of ["postgres", "postgresql"]) {
    process.env.DATABASE_URL = `${protocol}://postgres:password@db.example.invalid:5432/postgres`;
    assert.equal(isDatabaseConfigured(), true);
  }
});
