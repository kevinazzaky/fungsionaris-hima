import assert from "node:assert/strict";
import test from "node:test";
import { ValidationError } from "../src/domain/admin";
import {
  BUILT_IN_FIELD_MODES,
  CONFIGURABLE_BUILT_IN_FIELDS,
  CUSTOM_FIELD_TYPES,
  DEFAULT_PROGRAM_FORM_CONFIG,
  formatCustomResponseValue,
  normalizeProgramFormConfig,
  normalizeStoredCustomResponses,
  validateProgramFormConfig,
} from "../src/domain/program-form-config";
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
    assert.equal(input.registrationMode, item.registrationMode);
    assert.equal(input.registrationGroupLink, item.registrationGroupLink);
    assert.equal(input.registrationMaxQuota, item.registrationMaxQuota);
    assert.deepEqual(input.registrationFormConfig, DEFAULT_PROGRAM_FORM_CONFIG);
  }
  const itVersary = initialPrograms.find(
    (item) =>
      item.period === "2025/2026" &&
      item.title === "IT Versary & Sertijab 2026",
  );
  assert.ok(itVersary);
  assert.equal(itVersary.registrationMode, "internal");
  assert.equal(itVersary.status, "open");
  assert.equal(itVersary.registrationGroupLink, "");
  assert.equal(itVersary.registrationMaxQuota, null);

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
test("validasi program membatasi nilai enum, tautan, mode, kuota, daftar, urutan dan menormalisasi periode", () => {
  const input = initialPrograms[0];
  assert.equal(
    validateProgram({ ...input, period: "2025-2026" }).period,
    "2025/2026",
  );
  const {
    registrationMode: _omittedMode,
    registrationGroupLink: _omittedGroup,
    registrationMaxQuota: _omittedQuota,
    registrationFormConfig: _omittedFormConfig,
    ...legacyInput
  } = input;
  void _omittedMode;
  void _omittedGroup;
  void _omittedQuota;
  void _omittedFormConfig;
  const legacyValidated = validateProgram(legacyInput);
  assert.equal(legacyValidated.registrationMode, "external");
  assert.equal(legacyValidated.registrationGroupLink, "");
  assert.equal(legacyValidated.registrationMaxQuota, null);
  assert.deepEqual(
    legacyValidated.registrationFormConfig,
    DEFAULT_PROGRAM_FORM_CONFIG,
  );

  for (const data of [
    { status: "invalid" },
    { icon: "unknown" },
    { gformLink: "javascript:alert(1)" },
    { status: "open", gformLink: "" },
    { status: "open", registrationMode: "external", gformLink: "" },
    { registrationMode: "hybrid" },
    { registrationMode: "" },
    { registrationGroupLink: "javascript:alert(1)" },
    { registrationGroupLink: "bukan-url" },
    { registrationMaxQuota: 0 },
    { registrationMaxQuota: -5 },
    { registrationMaxQuota: 1.5 },
    { registrationMaxQuota: "0" },
    { registrationMaxQuota: "abc" },
    { registrationMaxQuota: true },
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
  const internalOpen = validateProgram({
    ...input,
    status: "open",
    registrationMode: "internal",
    gformLink: "",
    registrationGroupLink: "https://line.me/ti/g/contoh",
    registrationMaxQuota: "120",
  });
  assert.equal(internalOpen.status, "open");
  assert.equal(internalOpen.registrationMode, "internal");
  assert.equal(internalOpen.gformLink, "");
  assert.equal(
    internalOpen.registrationGroupLink,
    "https://line.me/ti/g/contoh",
  );
  assert.equal(internalOpen.registrationMaxQuota, 120);
  assert.equal(
    validateProgram({
      ...input,
      registrationMaxQuota: "",
    }).registrationMaxQuota,
    null,
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
    getPublished: async () => (current?.isPublished ? current : null),
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

test("konfigurasi formulir pendaftaran memvalidasi, menormalisasi nilai lama, dan memformat respons kustom", () => {
  assert.deepEqual(Object.keys(BUILT_IN_FIELD_MODES), [
    "required",
    "optional",
    "hidden",
  ]);
  assert.deepEqual(Object.keys(CONFIGURABLE_BUILT_IN_FIELDS), [
    "angkatan",
    "noHp",
    "idLine",
    "email",
    "catatan",
  ]);
  assert.deepEqual(Object.keys(CUSTOM_FIELD_TYPES), [
    "text",
    "textarea",
    "number",
    "select",
    "checkbox",
    "date",
  ]);

  assert.deepEqual(normalizeProgramFormConfig({}), DEFAULT_PROGRAM_FORM_CONFIG);
  assert.deepEqual(normalizeProgramFormConfig(null), DEFAULT_PROGRAM_FORM_CONFIG);
  assert.deepEqual(
    normalizeProgramFormConfig("{not-json"),
    DEFAULT_PROGRAM_FORM_CONFIG,
  );

  const normalizedPartial = normalizeProgramFormConfig({
    builtInFields: {
      angkatan: "hidden",
      email: "invalid-mode",
      nama: "hidden",
    },
    customFields: [
      {
        id: "asal_kampus",
        label: "Asal Kampus",
        type: "text",
        required: true,
        placeholder: "Undiknas",
        options: ["ignored"],
      },
      {
        id: "broken-select",
        label: "Tanpa Opsi",
        type: "select",
        required: true,
        options: [],
      },
      {
        id: "ukuran_baju",
        label: "Ukuran Baju",
        type: "select",
        required: false,
        options: ["S", "M", "M", ""],
      },
    ],
  });
  assert.equal(normalizedPartial.builtInFields.angkatan, "hidden");
  assert.equal(normalizedPartial.builtInFields.email, "optional");
  assert.equal(normalizedPartial.customFields.length, 2);
  assert.deepEqual(normalizedPartial.customFields[0].options, []);
  assert.deepEqual(normalizedPartial.customFields[1].options, ["S", "M"]);

  const strictConfig = validateProgramFormConfig({
    builtInFields: {
      angkatan: "optional",
      noHp: "hidden",
      idLine: "required",
      email: "required",
      catatan: "hidden",
    },
    customFields: [
      {
        id: "asal-instansi",
        label: "Asal Instansi",
        type: "text",
        required: true,
        placeholder: "Undiknas",
        options: ["Sisa lama"],
      },
      {
        id: "ukuran_kaos",
        label: "Ukuran Kaos",
        type: "select",
        required: true,
        options: ["S", "M", "L", "XL"],
      },
      {
        id: "setuju_aturan",
        label: "Setuju Tata Tertib",
        type: "checkbox",
        required: true,
      },
    ],
  });
  assert.equal(strictConfig.builtInFields.noHp, "hidden");
  assert.equal(strictConfig.builtInFields.email, "required");
  assert.deepEqual(strictConfig.customFields[0].options, []);
  assert.deepEqual(strictConfig.customFields[1].options, ["S", "M", "L", "XL"]);
  assert.equal(strictConfig.customFields[2].required, true);

  for (const invalid of [
    null,
    [],
    "text",
    { builtInFields: { nama: "hidden" } },
    { builtInFields: { nim: "optional" } },
    { builtInFields: { email: "mandatory" } },
    { customFields: "not-array" },
    {
      customFields: Array.from({ length: 21 }, (_, idx) => ({
        id: `field_${idx + 1}`,
        label: `Kolom ${idx + 1}`,
        type: "text",
        required: false,
      })),
    },
    {
      customFields: [
        { id: "a", label: "Label", type: "text", required: false },
      ],
    },
    {
      customFields: [
        { id: "__proto__", label: "Label", type: "text", required: false },
      ],
    },
    {
      customFields: [
        { id: "bad id", label: "Label", type: "text", required: false },
      ],
    },
    {
      customFields: [
        { id: "dup", label: "Satu", type: "text", required: false },
        { id: "dup", label: "Dua", type: "text", required: false },
      ],
    },
    {
      customFields: [
        { id: "f1", label: "A", type: "text", required: false },
      ],
    },
    {
      customFields: [
        { id: "f1", label: "Baris\nDua", type: "text", required: false },
      ],
    },
    {
      customFields: [
        { id: "f1", label: "Tipe", type: "file", required: false },
      ],
    },
    {
      customFields: [
        {
          id: "f1",
          label: "Placeholder",
          type: "text",
          required: false,
          placeholder: "a".repeat(121),
        },
      ],
    },
    {
      customFields: [
        { id: "f1", label: "Required", type: "text", required: "yes" },
      ],
    },
    {
      customFields: [
        {
          id: "f1",
          label: "Pilihan",
          type: "select",
          required: true,
          options: [],
        },
      ],
    },
    {
      customFields: [
        {
          id: "f1",
          label: "Pilihan",
          type: "select",
          required: true,
          options: ["A", "A"],
        },
      ],
    },
    {
      customFields: [
        {
          id: "f1",
          label: "Pilihan",
          type: "select",
          required: true,
          options: Array.from({ length: 31 }, (_, i) => `Opsi ${i}`),
        },
      ],
    },
  ]) {
    assert.throws(() => validateProgramFormConfig(invalid), ValidationError);
  }

  const base = initialPrograms[0];
  const fromJson = validateProgram({
    ...base,
    registrationFormConfig: JSON.stringify(strictConfig),
  });
  assert.deepEqual(fromJson.registrationFormConfig, strictConfig);
  const fromNull = validateProgram({
    ...base,
    registrationFormConfig: null,
  });
  assert.deepEqual(fromNull.registrationFormConfig, DEFAULT_PROGRAM_FORM_CONFIG);
  assert.throws(
    () =>
      validateProgram({
        ...base,
        registrationFormConfig: "{invalid-json",
      }),
    ValidationError,
  );

  const parsedResponses = normalizeStoredCustomResponses(
    JSON.parse(
      '{"asal":"Undiknas","hadir":true,"jumlah":2,"nested":{"x":1},"__proto__":{"polluted":true}}',
    ),
  );
  assert.deepEqual(parsedResponses, {
    asal: "Undiknas",
    hadir: true,
    jumlah: "2",
  });
  assert.deepEqual(normalizeStoredCustomResponses(null), {});
  assert.equal(formatCustomResponseValue(true), "Ya");
  assert.equal(formatCustomResponseValue(false), "Tidak");
  assert.equal(formatCustomResponseValue("  Hadir  "), "Hadir");
  assert.equal(formatCustomResponseValue(undefined), "");
});
