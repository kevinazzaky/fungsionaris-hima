import assert from "node:assert/strict";
import test from "node:test";
import {
  updateRegistration,
  deleteRegistration,
} from "../src/use-cases/manage-registrations";
import type { Registration } from "../src/domain/admin";

const original: Registration = {
  id: "test",
  nama: "Pendaftar uji",
  nim: "001234567",
  angkatan: "2025",
  period: "2026",
  tempatTanggalLahir: "",
  jenisKelamin: "",
  alamat: "",
  noHp: "",
  idLine: "",
  pengalamanOrganisasi: "",
  minatSkill: "",
  alasanBergabung: "",
  divisi: "kominfo",
  alasanDivisi: "",
  submittedAt: new Date("2026-11-05T00:00:00Z"),
  source: "spreadsheet",
  berkas: "test.pdf",
  berkasPath: "test.pdf",
  berkasSize: 20,
};

test("edit memvalidasi dan hanya meneruskan field yang boleh diubah", async () => {
  const result = await updateRegistration(
    {
      update: async (id, input, period) => {
        assert.equal(id, original.id);
        assert.equal(input.nim, "000123456");
        assert.ok(!("source" in input));
        assert.ok(!("berkasPath" in input));
        assert.ok(!("submittedAt" in input));
        return { ...original, ...input, period };
      },
    },
    original.id,
    {
      ...original,
      nim: "000123456",
      period: "2025/2026",
      source: "web",
      berkasPath: "other.pdf",
      submittedAt: null,
    },
  );
  assert.equal(result.source, "spreadsheet");
  assert.equal(result.berkasPath, "test.pdf");
  assert.equal(result.period, "2025/2026");
  assert.equal(result.submittedAt, original.submittedAt);
});
test("edit tidak menulis input NIM atau periode yang tidak valid", async () => {
  let writes = 0;
  const repo = {
    update: async () => {
      writes++;
      return original;
    },
  };
  await assert.rejects(
    updateRegistration(repo, "test", { ...original, nim: "invalid" }),
  );
  await assert.rejects(
    updateRegistration(repo, "test", { ...original, period: "invalid" }),
  );
  assert.equal(writes, 0);
});
test("hapus menghapus record dahulu lalu lampiran; tanpa path tidak menghapus nama file historis", async () => {
  const events: string[] = [];
  const storage = {
    remove: async (path: string) => {
      events.push(`file:${path}`);
    },
  };
  assert.deepEqual(
    await deleteRegistration(
      {
        delete: async () => {
          events.push("record");
          return original;
        },
      },
      storage,
      "test",
    ),
    { fileCleanupPending: false },
  );
  assert.deepEqual(events, ["record", "file:test.pdf"]);
  events.length = 0;
  await deleteRegistration(
    { delete: async () => ({ ...original, berkasPath: null }) },
    storage,
    "test",
  );
  assert.equal(events.length, 0);
});
test("database gagal menghapus: lampiran tetap ada", async () => {
  let removed = false;
  await assert.rejects(
    deleteRegistration(
      {
        delete: async () => {
          throw new Error("database unavailable");
        },
      },
      {
        remove: async () => {
          removed = true;
        },
      },
      "test",
    ),
  );
  assert.equal(removed, false);
});
test("cleanup gagal sesudah data dihapus menghasilkan status pending", async (t) => {
  t.mock.method(console, "error", () => {});
  assert.deepEqual(
    await deleteRegistration(
      { delete: async () => original },
      {
        remove: async () => {
          throw new Error("storage unavailable");
        },
      },
      "test",
    ),
    { fileCleanupPending: true },
  );
});
