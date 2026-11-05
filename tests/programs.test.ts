import assert from "node:assert/strict";
import test from "node:test";
import { initialPrograms } from "../src/lib/program-seed";
import {
  validateProgram,
  type Program,
  type ProgramRepository,
} from "../src/domain/programs";
import { programPeriods } from "../src/components/home/program-periods";
import { saveProgram, deleteProgram } from "../src/use-cases/manage-programs";
import type { MediaStorage } from "../src/domain/repositories";

test("sembilan program lama tervalidasi dan dikelompokkan menurut periode tanpa kehilangan detail", () => {
  assert.equal(initialPrograms.length, 9);
  for (const item of initialPrograms) {
    const input = validateProgram(item);
    assert.equal(input.title, item.title);
    assert.deepEqual(input.benefits, item.benefits);
    assert.equal(input.fullDescription, item.fullDescription);
  }
  const periods = programPeriods(initialPrograms);
  assert.deepEqual(
    periods.map((period) => [period.label, period.programs.length]),
    [
      ["2025/2026", 5],
      ["2024/2025", 4],
    ],
  );
  assert.equal(periods[0].programs[2].extraDetails?.speakers?.length, 4);
  assert.equal(periods[0].programs[0].extraDetails, undefined);
  assert.deepEqual(programPeriods([]), []);
});
test("validasi program membatasi nilai enum, tautan, daftar, urutan dan menormalisasi periode", () => {
  const input = initialPrograms[0];
  assert.equal(
    validateProgram({ ...input, period: "2025-2026" }).period,
    "2025/2026",
  );
  for (const data of [
    { status: "invalid" },
    { icon: "unknown" },
    { gformLink: "javascript:alert(1)" },
    { status: "open", gformLink: "" },
    { speakers: [""] },
    { benefits: Array(51).fill("benefit") },
    { sortOrder: -1 },
    { isPublished: "true" },
  ])
    assert.throws(() => validateProgram({ ...input, ...data }));
  assert.equal(
    validateProgram({
      ...input,
      status: "open",
      gformLink: "https://example.com/form",
    }).status,
    "open",
  );
});
function fixture() {
  const events: string[] = [];
  let current: Program | null = {
    ...initialPrograms[0],
    imagePath: "programs/old.webp",
  };
  let fail = false;
  const repository: ProgramRepository = {
    list: async () => (current ? [current] : []),
    get: async () => current,
    save: async (input, id, imagePath) => {
      events.push("save");
      if (fail) throw new Error("database failed");
      current = {
        ...input,
        id: id || "new",
        imagePath:
          imagePath === undefined
            ? id
              ? current?.imagePath || null
              : null
            : imagePath,
        imageUrl: null,
      };
      return current;
    },
    delete: async () => {
      events.push("delete");
      if (fail) throw new Error("database failed");
      const old = current!;
      current = null;
      return old;
    },
  };
  const storage: MediaStorage = {
    upload: async (_file, folder) => {
      events.push(`upload:${folder}`);
      return "programs/new.webp";
    },
    remove: async (path) => {
      events.push(`remove:${path}`);
    },
  };
  return {
    repository,
    storage,
    events,
    fail: () => {
      fail = true;
    },
  };
}
test("program boleh tanpa foto, edit mempertahankan foto dan penghapusan foto dilakukan setelah save", async () => {
  const f = fixture();
  const fresh = fixture();
  const created = await saveProgram(
    fresh.repository,
    fresh.storage,
    initialPrograms[0],
  );
  assert.equal(created.imagePath, null);
  const edited = await saveProgram(
    f.repository,
    f.storage,
    initialPrograms[0],
    "test",
  );
  assert.equal(edited.imagePath, "programs/old.webp");
  f.events.length = 0;
  await saveProgram(
    f.repository,
    f.storage,
    initialPrograms[0],
    "test",
    undefined,
    true,
  );
  assert.deepEqual(f.events, ["save", "remove:programs/old.webp"]);
});
test("penggantian foto program memakai folder programs dan kompensasi ketika database gagal", async () => {
  const f = fixture();
  const file = new File(["image"], "photo.png");
  await saveProgram(f.repository, f.storage, initialPrograms[0], "test", file);
  assert.deepEqual(f.events, [
    "upload:programs",
    "save",
    "remove:programs/old.webp",
  ]);
  f.events.length = 0;
  f.fail();
  await assert.rejects(
    saveProgram(f.repository, f.storage, initialPrograms[0], "test", file),
    /database failed/,
  );
  assert.deepEqual(f.events, [
    "upload:programs",
    "save",
    "remove:programs/new.webp",
  ]);
});
test("hapus program tidak menghapus gambar jika database gagal dan menghapus setelah record berhasil", async () => {
  const f = fixture();
  await deleteProgram(f.repository, f.storage, "test");
  assert.deepEqual(f.events, ["delete", "remove:programs/old.webp"]);
  const failed = fixture();
  failed.fail();
  await assert.rejects(
    deleteProgram(failed.repository, failed.storage, "test"),
  );
  assert.deepEqual(failed.events, ["delete"]);
});
