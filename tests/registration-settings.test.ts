import assert from "node:assert/strict";
import test from "node:test";
import { setRegistrationOpen } from "../src/use-cases/registration-settings";
import { registrationConfig } from "../src/lib/pendaftaran-config";
import type { RegistrationSettingsRepository } from "../src/domain/registration-settings";

test("status buka/tutup disimpan sebagai boolean eksplisit tanpa field tambahan", async () => {
  const writes: boolean[] = [];
  const repo: RegistrationSettingsRepository = {
    get: async () => ({ isOpen: true }),
    setOpen: async (isOpen) => {
      writes.push(isOpen);
      return { isOpen };
    },
  };
  assert.deepEqual(
    await setRegistrationOpen(repo, { isOpen: false, id: "other" }),
    { isOpen: false },
  );
  assert.deepEqual(await setRegistrationOpen(repo, { isOpen: true }), {
    isOpen: true,
  });
  assert.deepEqual(writes, [false, true]);
});
test("status yang ambigu ditolak dan kegagalan simpan tidak dilaporkan berhasil", async () => {
  let writes = 0;
  const repo: RegistrationSettingsRepository = {
    get: async () => ({ isOpen: false }),
    setOpen: async () => {
      writes++;
      throw new Error("database failed");
    },
  };
  for (const isOpen of ["false", "true", 0, 1, null, undefined])
    assert.throws(() => setRegistrationOpen(repo, { isOpen }));
  assert.equal(writes, 0);
  await assert.rejects(
    setRegistrationOpen(repo, { isOpen: true }),
    /database failed/,
  );
});
test("copy publik mengikuti status dan periode yang dikirim server", () => {
  const open = registrationConfig(true, "2027/2028");
  assert.equal(open.isOpen, true);
  assert.ok(open.pageDesc.includes("2027/2028"));
  assert.equal(open.statusLabel, "Pendaftaran Dibuka");
  const closed = registrationConfig(false);
  assert.equal(closed.isOpen, false);
  assert.equal(closed.statusLabel, "Pendaftaran Ditutup");
  assert.equal(closed.ctaLabel, "Lihat Informasi");
});
