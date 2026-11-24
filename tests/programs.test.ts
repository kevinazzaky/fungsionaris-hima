import assert from "node:assert/strict";
import test from "node:test";
import { ValidationError } from "../src/domain/admin";
import {
  BUILT_IN_FIELD_MODES,
  CONFIGURABLE_BUILT_IN_FIELDS,
  CUSTOM_FIELD_TYPES,
  DEFAULT_PROGRAM_FORM_CONFIG,
  MAX_COHORT_TIERS,
  createPresetCohortTiers,
  formatCustomResponseValue,
  normalizeProgramFormConfig,
  normalizeStoredCustomResponses,
  resolveCohortQuotaConfig,
  validateProgramFormConfig,
} from "../src/domain/program-form-config";
import { initialPrograms } from "../src/lib/program-seed";
import {
  validateProgram,
  validateProgramFormSettings,
  type Program,
  type ProgramInput,
  type ProgramRepository,
} from "../src/domain/programs";
import { programPeriods } from "../src/components/home/program-periods";
import {
  saveProgram,
  saveProgramFormSettings,
  deleteProgram,
} from "../src/use-cases/manage-programs";
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

test("validateProgramFormSettings memvalidasi status, tautan grup, kuota, dan konfigurasi formulir", () => {
  const validConfig = validateProgramFormConfig({
    builtInFields: {
      angkatan: "hidden",
      noHp: "required",
      idLine: "optional",
      email: "required",
      catatan: "hidden",
    },
    customFields: [
      {
        id: "ukuran_kaos",
        label: "Ukuran Kaos",
        type: "select",
        required: true,
        options: ["S", "M", "L"],
      },
    ],
  });

  const parsed = validateProgramFormSettings({
    status: "open",
    registrationGroupLink: "https://chat.whatsapp.com/contoh-grup",
    registrationMaxQuota: "150",
    registrationFormConfig: validConfig,
  });
  assert.equal(parsed.status, "open");
  assert.equal(
    parsed.registrationGroupLink,
    "https://chat.whatsapp.com/contoh-grup",
  );
  assert.equal(parsed.registrationMaxQuota, 150);
  assert.deepEqual(parsed.registrationFormConfig, validConfig);

  const defaults = validateProgramFormSettings({
    status: "upcoming",
    registrationGroupLink: "",
    registrationMaxQuota: "",
    registrationFormConfig: null,
  });
  assert.equal(defaults.status, "upcoming");
  assert.equal(defaults.registrationGroupLink, "");
  assert.equal(defaults.registrationMaxQuota, null);
  assert.deepEqual(defaults.registrationFormConfig, DEFAULT_PROGRAM_FORM_CONFIG);

  const fromJson = validateProgramFormSettings({
    status: "closed",
    registrationMaxQuota: 40,
    registrationFormConfig: JSON.stringify(validConfig),
  });
  assert.equal(fromJson.status, "closed");
  assert.equal(fromJson.registrationGroupLink, "");
  assert.equal(fromJson.registrationMaxQuota, 40);
  assert.deepEqual(fromJson.registrationFormConfig, validConfig);

  for (const invalid of [
    {},
    { status: "invalid" },
    { status: "open", registrationGroupLink: "javascript:alert(1)" },
    { status: "open", registrationGroupLink: "bukan-url" },
    { status: "open", registrationMaxQuota: 0 },
    { status: "open", registrationMaxQuota: -1 },
    { status: "open", registrationMaxQuota: 1.5 },
    { status: "open", registrationMaxQuota: "abc" },
    { status: "open", registrationFormConfig: "{invalid-json" },
    { status: "open", registrationFormConfig: { builtInFields: { nama: "hidden" } } },
    {
      status: "open",
      registrationFormConfig: {
        builtInFields: DEFAULT_PROGRAM_FORM_CONFIG.builtInFields,
        customFields: [
          {
            id: "ukuran",
            label: "Ukuran",
            type: "select",
            required: true,
            options: [],
          },
        ],
      },
    },
  ]) {
    assert.throws(() => validateProgramFormSettings(invalid), ValidationError);
  }
});

test("saveProgramFormSettings memperbarui pengaturan formulir sambil menjaga metadata dan foto program", async () => {
  const internalId = "11111111-1111-4111-8111-111111111111";
  const externalId = "22222222-2222-4222-8222-222222222222";
  const savedCalls: Array<{
    input: ProgramInput;
    id?: string;
    imagePath?: string | null;
  }> = [];

  const programs = new Map<string, Program>([
    [
      internalId,
      {
        ...initialPrograms[0],
        id: internalId,
        title: "Workshop Cloud",
        body: "Pelatihan cloud untuk mahasiswa.",
        fullDescription: "Deskripsi lengkap workshop.",
        period: "2025/2026",
        executionDate: "20 November 2026",
        time: "09.00 WITA",
        location: "Aula Undiknas",
        status: "upcoming",
        icon: "code",
        gformLink: "https://example.com/legacy-link",
        registrationMode: "internal",
        registrationGroupLink: "",
        registrationMaxQuota: null,
        registrationFormConfig: DEFAULT_PROGRAM_FORM_CONFIG,
        speakers: ["Pembicara Satu"],
        price: "Gratis",
        benefits: ["E-sertifikat", "Materi"],
        contactPerson: "Panitia (08123)",
        imagePath: "programs/existing-cover.webp",
        imageUrl: "https://cdn.example/programs/existing-cover.webp",
        sortOrder: 2,
        isPublished: true,
      },
    ],
    [
      externalId,
      {
        ...initialPrograms[0],
        id: externalId,
        registrationMode: "external",
        imagePath: "programs/external.webp",
        imageUrl: null,
      },
    ],
  ]);

  const repository: Pick<ProgramRepository, "get" | "save"> = {
    get: async (id) => programs.get(id) ?? null,
    save: async (input, id, imagePath) => {
      savedCalls.push({ input, id, imagePath });
      const prev = id ? programs.get(id)! : null;
      const updated: Program = {
        ...input,
        id: id || "new",
        imagePath: imagePath === undefined ? (prev?.imagePath ?? null) : imagePath,
        imageUrl: prev?.imageUrl ?? null,
      };
      programs.set(updated.id, updated);
      return updated;
    },
  };

  for (const blankId of ["", "   "]) {
    await assert.rejects(
      saveProgramFormSettings(repository, blankId, { status: "open" }),
      (error: unknown) =>
        error instanceof ValidationError &&
        error.message === "Program kerja tidak ditemukan.",
    );
  }

  await assert.rejects(
    saveProgramFormSettings(repository, "33333333-3333-4333-8333-333333333333", {
      status: "open",
    }),
    (error: unknown) =>
      error instanceof ValidationError &&
      error.message === "Program kerja tidak ditemukan.",
  );

  await assert.rejects(
    saveProgramFormSettings(repository, externalId, { status: "open" }),
    (error: unknown) =>
      error instanceof ValidationError &&
      error.message ===
        "Pengaturan formulir hanya tersedia untuk program bermode Formulir Website.",
  );

  await assert.rejects(
    saveProgramFormSettings(repository, internalId, {
      status: "open",
      registrationGroupLink: "javascript:alert(1)",
    }),
    ValidationError,
  );
  assert.equal(savedCalls.length, 0);

  const nextConfig = validateProgramFormConfig({
    builtInFields: {
      angkatan: "hidden",
      noHp: "required",
      idLine: "hidden",
      email: "required",
      catatan: "optional",
    },
    customFields: [
      {
        id: "asal_kampus",
        label: "Asal Kampus",
        type: "text",
        required: true,
        placeholder: "Undiknas",
      },
    ],
  });

  const saved = await saveProgramFormSettings(repository, internalId, {
    status: "open",
    registrationGroupLink: "https://line.me/ti/g/workshop-cloud",
    registrationMaxQuota: 80,
    registrationFormConfig: nextConfig,
  });

  assert.equal(savedCalls.length, 1);
  assert.equal(savedCalls[0].id, internalId);
  assert.equal(savedCalls[0].imagePath, undefined);
  assert.equal("id" in savedCalls[0].input, false);
  assert.equal("imagePath" in savedCalls[0].input, false);
  assert.equal("imageUrl" in savedCalls[0].input, false);

  assert.equal(saved.status, "open");
  assert.equal(
    saved.registrationGroupLink,
    "https://line.me/ti/g/workshop-cloud",
  );
  assert.equal(saved.registrationMaxQuota, 80);
  assert.deepEqual(saved.registrationFormConfig, nextConfig);
  assert.equal(saved.title, "Workshop Cloud");
  assert.equal(saved.body, "Pelatihan cloud untuk mahasiswa.");
  assert.equal(saved.fullDescription, "Deskripsi lengkap workshop.");
  assert.equal(saved.period, "2025/2026");
  assert.equal(saved.executionDate, "20 November 2026");
  assert.equal(saved.time, "09.00 WITA");
  assert.equal(saved.location, "Aula Undiknas");
  assert.equal(saved.icon, "code");
  assert.equal(saved.gformLink, "https://example.com/legacy-link");
  assert.equal(saved.registrationMode, "internal");
  assert.deepEqual(saved.speakers, ["Pembicara Satu"]);
  assert.equal(saved.price, "Gratis");
  assert.deepEqual(saved.benefits, ["E-sertifikat", "Materi"]);
  assert.equal(saved.contactPerson, "Panitia (08123)");
  assert.equal(saved.sortOrder, 2);
  assert.equal(saved.isPublished, true);
  assert.equal(saved.imagePath, "programs/existing-cover.webp");
});

test("validasi dan normalisasi cohortQuotas mendukung preset 2023-2026, tier nonaktif, dan aturan angkatan wajib", () => {
  assert.equal(MAX_COHORT_TIERS, 20);
  const presetTiers = createPresetCohortTiers();
  assert.deepEqual(presetTiers, [
    { angkatan: "2023", maxQuota: 5 },
    { angkatan: "2024", maxQuota: 5 },
    { angkatan: "2025", maxQuota: 5 },
    { angkatan: "2026", maxQuota: 5 },
  ]);

  assert.deepEqual(resolveCohortQuotaConfig(null), { enabled: false, tiers: [] });
  assert.deepEqual(resolveCohortQuotaConfig(DEFAULT_PROGRAM_FORM_CONFIG), {
    enabled: false,
    tiers: [],
  });
  assert.deepEqual(
    resolveCohortQuotaConfig({
      ...DEFAULT_PROGRAM_FORM_CONFIG,
      cohortQuotas: { enabled: true, tiers: [] },
    }),
    { enabled: false, tiers: [] },
  );

  // Disabled and empty omits cohortQuotas so it matches DEFAULT_PROGRAM_FORM_CONFIG.
  const emptyDisabled = validateProgramFormConfig({
    builtInFields: DEFAULT_PROGRAM_FORM_CONFIG.builtInFields,
    customFields: [],
    cohortQuotas: { enabled: false, tiers: [] },
  });
  assert.equal("cohortQuotas" in emptyDisabled, false);
  assert.deepEqual(emptyDisabled, DEFAULT_PROGRAM_FORM_CONFIG);

  // Disabled with tiers preserves sorted tiers and allows optional/hidden angkatan.
  const disabledWithTiers = validateProgramFormConfig({
    builtInFields: {
      ...DEFAULT_PROGRAM_FORM_CONFIG.builtInFields,
      angkatan: "optional",
    },
    cohortQuotas: {
      enabled: false,
      tiers: [
        { angkatan: "2026", maxQuota: "8" },
        { angkatan: "2023", maxQuota: 5 },
      ],
    },
  });
  assert.deepEqual(disabledWithTiers.cohortQuotas, {
    enabled: false,
    tiers: [
      { angkatan: "2023", maxQuota: 5 },
      { angkatan: "2026", maxQuota: 8 },
    ],
  });

  // Enabled with preset 2023-2026 @ 5 sorted ascending.
  const enabledPreset = validateProgramFormConfig({
    builtInFields: DEFAULT_PROGRAM_FORM_CONFIG.builtInFields,
    customFields: [],
    cohortQuotas: {
      enabled: true,
      tiers: [...presetTiers].reverse(),
    },
  });
  assert.deepEqual(enabledPreset.cohortQuotas, {
    enabled: true,
    tiers: presetTiers,
  });
  const resolved = resolveCohortQuotaConfig(enabledPreset);
  assert.equal(resolved.enabled, true);
  assert.deepEqual(resolved.tiers, presetTiers);
  resolved.tiers[0].maxQuota = 99;
  assert.equal(enabledPreset.cohortQuotas?.tiers[0].maxQuota, 5);

  // Round-trip through validateProgramFormSettings and validateProgram.
  const fromSettings = validateProgramFormSettings({
    status: "open",
    registrationGroupLink: "",
    registrationMaxQuota: 20,
    registrationFormConfig: JSON.stringify(enabledPreset),
  });
  assert.deepEqual(fromSettings.registrationFormConfig, enabledPreset);

  assert.throws(
    () =>
      validateProgramFormConfig({
        builtInFields: DEFAULT_PROGRAM_FORM_CONFIG.builtInFields,
        cohortQuotas: { enabled: true, tiers: [] },
      }),
    (error: unknown) =>
      error instanceof ValidationError &&
      error.message ===
        "Tambahkan minimal 1 angkatan sebelum mengaktifkan kuota per angkatan.",
  );

  for (const mode of ["optional", "hidden"] as const) {
    assert.throws(
      () =>
        validateProgramFormConfig({
          builtInFields: {
            ...DEFAULT_PROGRAM_FORM_CONFIG.builtInFields,
            angkatan: mode,
          },
          cohortQuotas: { enabled: true, tiers: presetTiers },
        }),
      (error: unknown) =>
        error instanceof ValidationError &&
        error.message ===
          "Kolom bawaan Angkatan wajib diatur Wajib saat kuota per angkatan aktif.",
    );
  }

  for (const invalidCohort of [
    null,
    [],
    "2024",
    { enabled: "true", tiers: presetTiers },
    { enabled: false, tiers: "not-array" },
    {
      enabled: false,
      tiers: Array.from({ length: MAX_COHORT_TIERS + 1 }, (_, i) => ({
        angkatan: String(2010 + i),
        maxQuota: 5,
      })),
    },
    { enabled: false, tiers: ["2024"] },
    { enabled: false, tiers: [{ angkatan: "24", maxQuota: 5 }] },
    { enabled: false, tiers: [{ angkatan: "1899", maxQuota: 5 }] },
    { enabled: false, tiers: [{ angkatan: "2024\n", maxQuota: 5 }] },
    {
      enabled: false,
      tiers: [
        { angkatan: "2024", maxQuota: 5 },
        { angkatan: "2024", maxQuota: 10 },
      ],
    },
    { enabled: false, tiers: [{ angkatan: "2024", maxQuota: 0 }] },
    { enabled: false, tiers: [{ angkatan: "2024", maxQuota: -3 }] },
    { enabled: false, tiers: [{ angkatan: "2024", maxQuota: 2.5 }] },
    { enabled: false, tiers: [{ angkatan: "2024", maxQuota: "0" }] },
    { enabled: false, tiers: [{ angkatan: "2024", maxQuota: "2.5" }] },
    { enabled: false, tiers: [{ angkatan: "2024", maxQuota: "5\n" }] },
    { enabled: false, tiers: [{ angkatan: "2024", maxQuota: true }] },
    { enabled: false, tiers: [{ angkatan: "2024", maxQuota: 2147483648 }] },
  ]) {
    assert.throws(
      () =>
        validateProgramFormConfig({
          builtInFields: DEFAULT_PROGRAM_FORM_CONFIG.builtInFields,
          cohortQuotas: invalidCohort,
        }),
      ValidationError,
    );
  }

  // normalizeProgramFormConfig safely filters invalid/duplicate tiers, sorts ascending, and forces angkatan required when enabled.
  const normalizedEnabled = normalizeProgramFormConfig({
    builtInFields: {
      ...DEFAULT_PROGRAM_FORM_CONFIG.builtInFields,
      angkatan: "hidden",
    },
    cohortQuotas: {
      enabled: true,
      tiers: [
        { angkatan: "2025", maxQuota: "7" },
        { angkatan: "2023", maxQuota: 5 },
        { angkatan: "2023", maxQuota: 9 },
        { angkatan: "2024\n", maxQuota: 5 },
        { angkatan: "1899", maxQuota: 5 },
        { angkatan: "2026", maxQuota: 0 },
        { angkatan: "2026", maxQuota: 1.5 },
        { angkatan: "2024", maxQuota: 6 },
      ],
    },
  });
  assert.equal(normalizedEnabled.builtInFields.angkatan, "required");
  assert.deepEqual(normalizedEnabled.cohortQuotas, {
    enabled: true,
    tiers: [
      { angkatan: "2023", maxQuota: 5 },
      { angkatan: "2024", maxQuota: 6 },
      { angkatan: "2025", maxQuota: 7 },
    ],
  });

  // normalizeProgramFormConfig omits cohortQuotas when enabled has zero valid tiers.
  const normalizedEmpty = normalizeProgramFormConfig({
    builtInFields: {
      ...DEFAULT_PROGRAM_FORM_CONFIG.builtInFields,
      angkatan: "optional",
    },
    cohortQuotas: {
      enabled: true,
      tiers: [{ angkatan: "invalid", maxQuota: 0 }],
    },
  });
  assert.equal(normalizedEmpty.builtInFields.angkatan, "optional");
  assert.equal("cohortQuotas" in normalizedEmpty, false);

  // normalizeProgramFormConfig preserves disabled tiers without forcing angkatan required.
  const normalizedDisabled = normalizeProgramFormConfig({
    builtInFields: {
      ...DEFAULT_PROGRAM_FORM_CONFIG.builtInFields,
      angkatan: "optional",
    },
    cohortQuotas: {
      enabled: false,
      tiers: [{ angkatan: "2024", maxQuota: 5 }],
    },
  });
  assert.equal(normalizedDisabled.builtInFields.angkatan, "optional");
  assert.deepEqual(normalizedDisabled.cohortQuotas, {
    enabled: false,
    tiers: [{ angkatan: "2024", maxQuota: 5 }],
  });
});
