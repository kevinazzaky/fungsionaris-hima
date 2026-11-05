import assert from "node:assert/strict";
import test from "node:test";
import { validatePasswordChange } from "../src/domain/account";
import { ValidationError } from "../src/domain/admin";
import { changePassword } from "../src/use-cases/change-password";
import type { PasswordRepository } from "../src/domain/repositories";

const valid = {
  currentPassword: "Existing-password-123",
  newPassword: "Replacement-password-456",
  confirmPassword: "Replacement-password-456",
};

test("kata sandi baru memerlukan panjang yang cukup dan konfirmasi yang sama", () => {
  for (const input of [
    { ...valid, newPassword: "pendek", confirmPassword: "pendek" },
    { ...valid, confirmPassword: "berbeda" },
    { ...valid, currentPassword: "" },
    { ...valid, currentPassword: 123 },
    { ...valid, newPassword: "x".repeat(73), confirmPassword: "x".repeat(73) },
    {
      ...valid,
      newPassword: "😀".repeat(20),
      confirmPassword: "😀".repeat(20),
    },
    {
      ...valid,
      newPassword: valid.currentPassword,
      confirmPassword: valid.currentPassword,
    },
  ])
    assert.throws(() => validatePasswordChange(input), ValidationError);
});

test("password tidak di-trim dan hanya data yang diperlukan diteruskan", () => {
  const password = "  Sandi panjang dengan spasi  ";
  assert.deepEqual(
    validatePasswordChange({
      ...valid,
      newPassword: password,
      confirmPassword: password,
      email: "diabaikan@example.invalid",
    }),
    { currentPassword: valid.currentPassword, newPassword: password },
  );
});

test("password saat ini diverifikasi sebelum password baru disimpan", async () => {
  const calls: string[] = [];
  const repository: PasswordRepository = {
    verifyCurrentPassword: async (password) => {
      assert.equal(password, valid.currentPassword);
      calls.push("verify");
      return true;
    },
    updatePassword: async (password, currentPassword) => {
      assert.equal(password, valid.newPassword);
      assert.equal(currentPassword, valid.currentPassword);
      calls.push("update");
    },
  };
  await changePassword(repository, valid);
  assert.deepEqual(calls, ["verify", "update"]);
});

test("password saat ini salah tidak pernah mengubah password akun", async () => {
  let updated = false;
  await assert.rejects(
    changePassword(
      {
        verifyCurrentPassword: async () => false,
        updatePassword: async () => {
          updated = true;
        },
      },
      valid,
    ),
    /saat ini tidak sesuai/,
  );
  assert.equal(updated, false);
});

test("input tidak valid ditolak sebelum menghubungi layanan Auth", async () => {
  let contacted = false;
  await assert.rejects(
    changePassword(
      {
        verifyCurrentPassword: async () => {
          contacted = true;
          return true;
        },
        updatePassword: async () => {},
      },
      { ...valid, confirmPassword: "berbeda" },
    ),
    ValidationError,
  );
  assert.equal(contacted, false);
});

test("kegagalan penyimpanan password tidak dilaporkan sebagai sukses", async () => {
  await assert.rejects(
    changePassword(
      {
        verifyCurrentPassword: async () => true,
        updatePassword: async () => {
          throw new Error("Auth unavailable");
        },
      },
      valid,
    ),
    /Auth unavailable/,
  );
});
