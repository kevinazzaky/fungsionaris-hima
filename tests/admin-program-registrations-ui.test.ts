import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_PROGRAM_FORM_CONFIG,
  type ProgramFormConfig,
} from "../src/domain/program-form-config";
import type { Program } from "../src/domain/programs";
import {
  createCustomFieldId,
  moveCustomField,
  parseSelectOptionsText,
  ProgramFormBuilder,
} from "../src/components/admin/program-form-builder";
import {
  ProgramEditor,
  ProgramListRow,
  ProgramsManager,
} from "../src/components/admin/programs-manager";
import {
  formatCustomCellValue,
  ParticipantEditor,
  ParticipantsTable,
  ProgramRegistrationsManager,
  summarizeCustomResponses,
  type ProgramRegistrationAdminRow,
} from "../src/components/admin/program-registrations-manager";

const EM_DASH_PATTERN = /\u2014/;

const sampleFormConfig: ProgramFormConfig = {
  builtInFields: {
    angkatan: "hidden",
    noHp: "optional",
    idLine: "hidden",
    email: "required",
    catatan: "hidden",
  },
  customFields: [
    {
      id: "cf_instansi",
      label: "Asal Instansi",
      type: "text",
      required: true,
      placeholder: "Contoh: Undiknas",
      options: [],
    },
    {
      id: "cf_motivasi",
      label: "Motivasi Mengikuti",
      type: "textarea",
      required: false,
      placeholder: "Tulis singkat",
      options: [],
    },
    {
      id: "cf_semester",
      label: "Semester Saat Ini",
      type: "number",
      required: true,
      placeholder: "Contoh: 4",
      options: [],
    },
    {
      id: "cf_kaos",
      label: "Ukuran Kaos",
      type: "select",
      required: true,
      placeholder: "",
      options: ["S", "M", "L"],
    },
    {
      id: "cf_setuju",
      label: "Setuju Tata Tertib",
      type: "checkbox",
      required: true,
      placeholder: "",
      options: [],
    },
    {
      id: "cf_tgl",
      label: "Tanggal Hadir",
      type: "date",
      required: false,
      placeholder: "",
      options: [],
    },
  ],
};

const sampleInternalProgram: Program = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "IT Versary & Sertijab 2026",
  body: "Perayaan tahunan Prodi TI.",
  fullDescription: "Detail lengkap acara.",
  period: "2025/2026",
  executionDate: "12 Desember 2026",
  time: "09.00 WITA",
  location: "Auditorium Undiknas",
  status: "open",
  icon: "cake",
  gformLink: "",
  registrationMode: "internal",
  registrationGroupLink: "https://line.me/ti/g/test",
  registrationMaxQuota: 100,
  registrationFormConfig: sampleFormConfig,
  speakers: [],
  price: "",
  benefits: [],
  contactPerson: "",
  sortOrder: 1,
  isPublished: true,
  imagePath: null,
  imageUrl: null,
};

const sampleExternalProgram: Program = {
  ...sampleInternalProgram,
  id: "22222222-2222-4222-8222-222222222222",
  title: "Seminar Eksternal",
  registrationMode: "external",
  gformLink: "https://example.com/form",
  registrationFormConfig: DEFAULT_PROGRAM_FORM_CONFIG,
};

const sampleParticipant: ProgramRegistrationAdminRow = {
  id: "33333333-3333-4333-8333-333333333333",
  programId: sampleInternalProgram.id,
  programTitle: sampleInternalProgram.title,
  programPeriod: sampleInternalProgram.period,
  nama: "Ni Luh Putu",
  nim: "22010101",
  angkatan: "",
  noHp: "081234567890",
  idLine: "",
  email: "putu@undiknas.ac.id",
  catatan: "",
  customResponses: {
    cf_instansi: "Undiknas",
    cf_motivasi: "",
    cf_semester: "5",
    cf_kaos: "M",
    cf_setuju: true,
    cf_tgl: "2026-12-12",
    cf_lama_dihapus: "Jawaban historis",
  },
  submittedAt: "2026-11-18T02:00:00.000Z",
  createdAt: "2026-11-18T02:00:00.000Z",
};

test("ProgramsManager merender tab daftar program dan peserta proker tanpa em dash", () => {
  const html = renderToStaticMarkup(createElement(ProgramsManager));
  assert.match(html, /role="tablist"/);
  assert.match(html, /Daftar program/);
  assert.match(html, /Peserta proker/);
  assert.match(html, /id="programs-tab-programs"[^>]*aria-selected="true"/);
  assert.match(html, /Tambah periode/);
  assert.match(html, /Tambah program/);
  assert.match(html, /Memuat program kerja/);
  assert.doesNotMatch(html, EM_DASH_PATTERN);
});

test("ProgramsManager mendukung tab awal peserta dengan filter programId", () => {
  const html = renderToStaticMarkup(
    createElement(ProgramsManager, {
      initialTab: "registrations",
      initialProgramId: "11111111-1111-4111-8111-111111111111",
    }),
  );
  assert.match(
    html,
    /id="programs-tab-registrations"[^>]*aria-selected="true"/,
  );
  assert.match(html, /Peserta program kerja/);
  assert.match(
    html,
    /href="\/api\/admin\/program-registrations\/export\?programId=11111111-1111-4111-8111-111111111111"/,
  );
  assert.doesNotMatch(html, EM_DASH_PATTERN);
});

test("ProgramRegistrationsManager merender filter program, pencarian, dan tautan ekspor Excel", () => {
  const html = renderToStaticMarkup(createElement(ProgramRegistrationsManager));
  assert.match(html, /Peserta program kerja/);
  assert.match(html, /Filter program kerja/);
  assert.match(html, /Cari peserta/);
  assert.match(html, /Unduh Excel \(\.xlsx\)/);
  assert.match(html, /href="\/api\/admin\/program-registrations\/export"/);
  assert.match(html, /Memuat daftar peserta/);
  assert.doesNotMatch(html, EM_DASH_PATTERN);
});

test("ProgramFormBuilder dan helper merender kolom bawaan, semua tipe custom, batas 20, serta urutan field", () => {
  const generatedId = createCustomFieldId(["cf_existing"]);
  assert.match(generatedId, /^cf_[a-zA-Z0-9_-]+$/);
  assert.notEqual(generatedId, "cf_existing");

  assert.deepEqual(
    parseSelectOptionsText("  S \n\n  M  \r\n L "),
    ["S", "M", "L"],
  );

  const reordered = moveCustomField(sampleFormConfig.customFields, 0, 1);
  assert.equal(reordered[0].id, "cf_motivasi");
  assert.equal(reordered[1].id, "cf_instansi");
  assert.equal(
    moveCustomField(sampleFormConfig.customFields, 0, -1),
    sampleFormConfig.customFields,
  );

  const emptyHtml = renderToStaticMarkup(
    createElement(ProgramFormBuilder, {
      value: DEFAULT_PROGRAM_FORM_CONFIG,
      onChange: () => {},
    }),
  );
  assert.match(emptyHtml, /Kolom bawaan formulir/);
  assert.match(
    emptyHtml,
    /Nama lengkap dan NIM selalu wajib sebagai identitas unik peserta\./,
  );
  for (const label of [
    "Angkatan",
    "Nomor HP / WhatsApp",
    "ID LINE",
    "Email",
    "Catatan untuk Panitia",
  ]) {
    assert.ok(emptyHtml.includes(label), `Missing built-in label ${label}`);
  }
  assert.match(emptyHtml, /\+ Tambah pertanyaan/);
  assert.match(emptyHtml, /Belum ada pertanyaan tambahan/);
  assert.doesNotMatch(emptyHtml, EM_DASH_PATTERN);

  const populatedHtml = renderToStaticMarkup(
    createElement(ProgramFormBuilder, {
      value: sampleFormConfig,
      onChange: () => {},
    }),
  );
  for (const needle of [
    "Asal Instansi",
    "Motivasi Mengikuti",
    "Semester Saat Ini",
    "Ukuran Kaos",
    "Setuju Tata Tertib",
    "Tanggal Hadir",
    "Daftar pilihan (satu per baris)",
    "S\nM\nL",
    "6 dari 20 pertanyaan tambahan",
  ]) {
    assert.ok(
      populatedHtml.includes(needle),
      `Missing expected form builder content: ${needle}`,
    );
  }
  assert.match(
    populatedHtml,
    /<button[^>]*disabled=""[^>]*aria-label="Naikkan pertanyaan 1"/,
  );
  assert.match(
    populatedHtml,
    /<button[^>]*disabled=""[^>]*aria-label="Turunkan pertanyaan 6"/,
  );
  const placeholderMatches = populatedHtml.match(
    /Placeholder \/ petunjuk \(opsional\)/g,
  );
  assert.equal(
    placeholderMatches?.length,
    3,
    "Placeholder input should render only for text, textarea, and number",
  );
  assert.doesNotMatch(populatedHtml, EM_DASH_PATTERN);

  const maxFieldsConfig: ProgramFormConfig = {
    ...DEFAULT_PROGRAM_FORM_CONFIG,
    customFields: Array.from({ length: 20 }, (_, idx) => ({
      id: `cf_${idx + 1}`,
      label: `Kolom ${idx + 1}`,
      type: "text" as const,
      required: false,
      placeholder: "",
      options: [],
    })),
  };
  const maxedHtml = renderToStaticMarkup(
    createElement(ProgramFormBuilder, {
      value: maxFieldsConfig,
      onChange: () => {},
    }),
  );
  assert.match(maxedHtml, /20 dari 20 pertanyaan tambahan/);
  assert.match(maxedHtml, /Maksimal 20 pertanyaan tambahan sudah tercapai/);
  assert.match(maxedHtml, /disabled=""[^>]*>\+ Tambah pertanyaan/);
});

test("ProgramEditor menampilkan ProgramFormBuilder hanya saat mode pendaftaran internal", () => {
  const internalHtml = renderToStaticMarkup(
    createElement(ProgramEditor, {
      item: sampleInternalProgram,
      initialPeriod: "2025/2026",
      savedNotice: "",
      onCancel: () => {},
      onSaved: async () => {},
      onBusy: () => {},
    }),
  );
  assert.match(internalHtml, /Kolom bawaan formulir/);
  assert.match(internalHtml, /Pertanyaan tambahan custom/);
  assert.match(internalHtml, /Asal Instansi/);
  assert.doesNotMatch(internalHtml, EM_DASH_PATTERN);

  const externalHtml = renderToStaticMarkup(
    createElement(ProgramEditor, {
      item: sampleExternalProgram,
      initialPeriod: "2025/2026",
      savedNotice: "",
      onCancel: () => {},
      onSaved: async () => {},
      onBusy: () => {},
    }),
  );
  assert.doesNotMatch(externalHtml, /Kolom bawaan formulir/);
  assert.doesNotMatch(externalHtml, /Pertanyaan tambahan custom/);
  assert.doesNotMatch(externalHtml, EM_DASH_PATTERN);

  const internalRowHtml = renderToStaticMarkup(
    createElement(ProgramListRow, {
      item: sampleInternalProgram,
      count: 12,
      onViewParticipants: () => {},
      onEdit: () => {},
      onDelete: () => {},
    }),
  );
  assert.match(internalRowHtml, /Formulir Website/);
  assert.match(internalRowHtml, /6 kolom custom/);
  assert.match(internalRowHtml, /12 \/ 100 peserta/);

  const externalRowHtml = renderToStaticMarkup(
    createElement(ProgramListRow, {
      item: {
        ...sampleExternalProgram,
        registrationFormConfig: sampleFormConfig,
      },
      count: 0,
      onViewParticipants: () => {},
      onEdit: () => {},
      onDelete: () => {},
    }),
  );
  assert.match(externalRowHtml, /Tautan Eksternal/);
  assert.doesNotMatch(externalRowHtml, /kolom custom/);
});

test("ParticipantsTable menyesuaikan kolom program terfilter dan menampilkan ringkasan jawaban custom di semua program", () => {
  assert.equal(formatCustomCellValue(true), "Ya");
  assert.equal(formatCustomCellValue(false), "Tidak");
  assert.equal(formatCustomCellValue("  "), "-");
  assert.equal(formatCustomCellValue(undefined), "-");

  const summary = summarizeCustomResponses(
    sampleParticipant.customResponses,
    sampleFormConfig,
  );
  assert.equal(summary.count, 6);
  assert.match(summary.preview, /Asal Instansi: Undiknas/);

  const filteredHtml = renderToStaticMarkup(
    createElement(ParticipantsTable, {
      items: [sampleParticipant],
      programs: [sampleInternalProgram],
      selectedProgram: sampleInternalProgram,
      selectedFormConfig: sampleFormConfig,
      onSelect: () => {},
      onRemove: () => {},
    }),
  );
  for (const needle of [
    "Asal Instansi",
    "Motivasi Mengikuti",
    "Ukuran Kaos",
    "Setuju Tata Tertib",
    "Undiknas",
    ">Ya<",
    ">-<",
    "081234567890",
    "putu@undiknas.ac.id",
  ]) {
    assert.ok(filteredHtml.includes(needle), `Missing ${needle} in filtered table`);
  }
  assert.doesNotMatch(filteredHtml, /Angkatan/);
  assert.doesNotMatch(filteredHtml, /ID LINE/);
  assert.doesNotMatch(filteredHtml, /<th scope="col">Catatan<\/th>/);
  assert.doesNotMatch(filteredHtml, EM_DASH_PATTERN);

  const allProgramsHtml = renderToStaticMarkup(
    createElement(ParticipantsTable, {
      items: [
        sampleParticipant,
        {
          ...sampleParticipant,
          id: "44444444-4444-4444-8444-444444444444",
          programId: sampleExternalProgram.id,
          programTitle: sampleExternalProgram.title,
          customResponses: {},
        },
      ],
      programs: [sampleInternalProgram, sampleExternalProgram],
      onSelect: () => {},
      onRemove: () => {},
    }),
  );
  assert.match(allProgramsHtml, /Jawaban custom/);
  assert.match(allProgramsHtml, /6 jawaban custom/);
  assert.match(allProgramsHtml, /Asal Instansi: Undiknas, Semester Saat Ini: 5/);
  assert.doesNotMatch(allProgramsHtml, EM_DASH_PATTERN);
});

test("ParticipantEditor merender konfigurasi built-in, semua input custom, nilai legacy tersembunyi, dan jawaban kolom terdahulu", () => {
  const participantWithLegacy: ProgramRegistrationAdminRow = {
    ...sampleParticipant,
    angkatan: "2023",
    customResponses: {
      ...sampleParticipant.customResponses,
      cf_kaos: "XXL",
    },
  };

  const editorHtml = renderToStaticMarkup(
    createElement(ParticipantEditor, {
      item: participantWithLegacy,
      formConfig: sampleFormConfig,
      saving: false,
      error: "",
      onCancel: () => {},
      onSubmit: () => {},
    }),
  );

  for (const needle of [
    "Nama lengkap (wajib)",
    "NIM (wajib)",
    "No. HP / WA (opsional)",
    "Email (wajib)",
    "Data bawaan terdahulu",
    "Angkatan (disembunyikan)",
    "2023",
    "Pertanyaan tambahan custom",
    "Asal Instansi (wajib)",
    "Motivasi Mengikuti (opsional)",
    "Semester Saat Ini (wajib)",
    "Ukuran Kaos (wajib)",
    "Setuju Tata Tertib (wajib)",
    "Tanggal Hadir (opsional)",
    'name="custom_cf_setuju" checked=""',
    'value="2026-12-12"',
    "Nilai tersimpan sebelumnya: &quot;XXL&quot;",
    "Jawaban kolom terdahulu",
    "cf_lama_dihapus",
    "Jawaban historis",
  ]) {
    assert.ok(editorHtml.includes(needle), `Missing ${needle} in ParticipantEditor`);
  }
  assert.doesNotMatch(editorHtml, /name="angkatan"/);
  assert.doesNotMatch(editorHtml, /name="idLine"/);
  assert.doesNotMatch(editorHtml, /name="catatan"/);
  assert.doesNotMatch(editorHtml, EM_DASH_PATTERN);
});

test("ParticipantEditor merender option fallback untuk nilai select terdahulu yang dihapus agar mudah diganti", () => {
  const optionalSelectConfig: ProgramFormConfig = {
    ...DEFAULT_PROGRAM_FORM_CONFIG,
    customFields: [
      {
        id: "cf_kaos",
        label: "Ukuran Kaos",
        type: "select",
        required: false,
        placeholder: "",
        options: ["S", "M", "L"],
      },
    ],
  };

  const staleHtml = renderToStaticMarkup(
    createElement(ParticipantEditor, {
      item: {
        ...sampleParticipant,
        customResponses: { cf_kaos: "XXL" },
      },
      formConfig: optionalSelectConfig,
      saving: false,
      error: "",
      onCancel: () => {},
      onSubmit: () => {},
    }),
  );

  assert.match(staleHtml, /Ukuran Kaos \(opsional\)/);
  assert.ok(
    staleHtml.includes(
      '<option value="XXL" selected="">XXL (opsi terdahulu - tidak tersedia)</option>',
    ),
    "Fallback option for stale select value should be rendered and selected",
  );
  assert.ok(
    staleHtml.includes('<option value="">Pilih Ukuran Kaos</option>'),
    "Empty default option should stay unselected when stale option is active",
  );
  assert.ok(
    staleHtml.includes(
      "Nilai tersimpan sebelumnya: &quot;XXL&quot; (tidak lagi tersedia pada daftar pilihan).",
    ),
  );
  assert.doesNotMatch(staleHtml, EM_DASH_PATTERN);

  const validHtml = renderToStaticMarkup(
    createElement(ParticipantEditor, {
      item: {
        ...sampleParticipant,
        customResponses: { cf_kaos: "M" },
      },
      formConfig: optionalSelectConfig,
      saving: false,
      error: "",
      onCancel: () => {},
      onSubmit: () => {},
    }),
  );
  assert.doesNotMatch(validHtml, /opsi terdahulu - tidak tersedia/);
  assert.ok(validHtml.includes('<option value="M" selected="">M</option>'));
  assert.doesNotMatch(validHtml, EM_DASH_PATTERN);

  const emptyHtml = renderToStaticMarkup(
    createElement(ParticipantEditor, {
      item: {
        ...sampleParticipant,
        customResponses: {},
      },
      formConfig: optionalSelectConfig,
      saving: false,
      error: "",
      onCancel: () => {},
      onSubmit: () => {},
    }),
  );
  assert.doesNotMatch(emptyHtml, /opsi terdahulu - tidak tersedia/);
  assert.ok(
    emptyHtml.includes(
      '<option value="" selected="">Pilih Ukuran Kaos</option>',
    ),
  );
  assert.doesNotMatch(emptyHtml, EM_DASH_PATTERN);
});

test("seluruh file Admin UI yang diubah bebas em dash dan memenuhi penjagaan aksesibilitas CSS", () => {
  const files = [
    "src/components/admin/program-form-builder.tsx",
    "src/components/admin/programs-manager.tsx",
    "src/components/admin/program-registrations-manager.tsx",
    "src/app/admin/admin.css",
    "tests/admin-program-registrations-ui.test.ts",
  ];
  for (const rel of files) {
    const content = fs.readFileSync(path.join(process.cwd(), rel), "utf8");
    assert.equal(
      content.includes("\u2014"),
      false,
      `Em dash found in ${rel}`,
    );
  }

  const css = fs.readFileSync(
    path.join(process.cwd(), "src/app/admin/admin.css"),
    "utf8",
  );
  assert.match(css, /\.admin-form-builder/);
  assert.match(
    css,
    /\.admin-custom-field-card\s*\{[^}]*border:\s*1px solid #8c8c82/,
  );
  assert.match(
    css,
    /\.admin-legacy-responses\s*\{[^}]*border:\s*1px solid #8c8c82/,
  );
  assert.match(css, /outline:\s*3px solid #805400/);
  assert.match(css, /min-height:\s*44px/);
});
