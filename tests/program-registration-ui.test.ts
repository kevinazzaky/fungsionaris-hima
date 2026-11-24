import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { ModuleKind, ScriptTarget, transpileModule } from "typescript";
import { createElement } from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { Cake } from "@phosphor-icons/react/dist/ssr";
import { ProgramPeriodTabs } from "../src/components/detail/program-period-tabs";
import { ProgramModal } from "../src/components/home/program-modal";
import {
  ProgramRegistrationConfirmation,
  ProgramRegistrationForm,
  ProgramRegistrationPrintableReceipt,
  validateAndBuildRegistrationPayload,
  type RegistrationResult,
} from "../src/components/programs/program-registration-form";
import { ValidationError } from "../src/domain/admin";
import {
  buildCohortQuotaSummary,
  DEFAULT_PROGRAM_FORM_CONFIG,
  normalizeProgramFormConfig,
  type ProgramFormConfig,
} from "../src/domain/program-form-config";
import type { Program } from "../src/domain/programs";
import { initialPrograms } from "../src/lib/program-seed";

const baseInternalProgram: Program = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "IT Versary & Sertijab 2026",
  body: "Perayaan tahunan Program Studi Teknologi Informasi.",
  fullDescription: "Peringatan hari jadi Program Studi TI dan sertijab HIMA TI.",
  period: "2025/2026",
  executionDate: "Akan diumumkan panitia",
  time: "Menyesuaikan Jadwal",
  location: "Auditorium Kampus Undiknas",
  status: "open",
  icon: "cake",
  gformLink: "",
  registrationMode: "internal",
  registrationGroupLink: "",
  registrationMaxQuota: 50,
  registrationFormConfig: DEFAULT_PROGRAM_FORM_CONFIG,
  speakers: [],
  price: "",
  benefits: [],
  contactPerson: "Panitia (081234567890)",
  sortOrder: 0,
  isPublished: true,
  imagePath: null,
  imageUrl: null,
};

const richCustomConfig: ProgramFormConfig = {
  builtInFields: {
    angkatan: "hidden",
    noHp: "optional",
    idLine: "hidden",
    email: "required",
    catatan: "hidden",
  },
  customFields: [
    {
      id: "asal_prodi",
      label: "Asal Program Studi",
      type: "text",
      required: true,
      placeholder: "Contoh: Teknologi Informasi",
      options: [],
    },
    {
      id: "motivasi_ikut",
      label: "Motivasi Mengikuti Kegiatan",
      type: "textarea",
      required: false,
      placeholder: "Ceritakan singkat motivasi Anda",
      options: [],
    },
    {
      id: "semester_aktif",
      label: "Semester Saat Ini",
      type: "number",
      required: true,
      placeholder: "Masukkan angka semester",
      options: [],
    },
    {
      id: "ukuran_kaos",
      label: "Ukuran Kaos",
      type: "select",
      required: true,
      placeholder: "",
      options: ["S", "M", "L", "XL"],
    },
    {
      id: "tanggal_siap",
      label: "Tanggal Ketersediaan Briefing",
      type: "date",
      required: false,
      placeholder: "",
      options: [],
    },
    {
      id: "setuju_aturan",
      label: "Saya bersedia mengikuti seluruh tata tertib kegiatan",
      type: "checkbox",
      required: true,
      placeholder: "Kehadiran wajib dicatat saat registrasi ulang",
      options: [],
    },
    {
      id: "bersedia_dokumentasi",
      label: "Bersedia menjadi relawan dokumentasi",
      type: "checkbox",
      required: false,
      placeholder: "",
      options: [],
    },
  ],
};

test("formulir pendaftaran proker merender seluruh state kondisi dengan jujur tanpa em dash", () => {
  const unconfiguredHtml = renderToStaticMarkup(
    createElement(ProgramRegistrationForm, {
      program: baseInternalProgram,
      registeredCount: 0,
      configured: false,
    }),
  );
  assert.match(unconfiguredHtml, /Layanan Pendaftaran Belum Aktif/);
  assert.doesNotMatch(unconfiguredHtml, /<form|type="submit"|—/);

  const externalOpenHtml = renderToStaticMarkup(
    createElement(ProgramRegistrationForm, {
      program: {
        ...baseInternalProgram,
        registrationMode: "external",
        gformLink: "https://example.com/daftar",
      },
      registeredCount: 0,
      configured: true,
    }),
  );
  assert.match(externalOpenHtml, /Pendaftaran Melalui Formulir Eksternal/);
  assert.match(externalOpenHtml, /href="https:\/\/example\.com\/daftar"/);
  assert.match(externalOpenHtml, /target="_blank"/);
  assert.doesNotMatch(externalOpenHtml, /<form|—/);

  const externalClosedHtml = renderToStaticMarkup(
    createElement(ProgramRegistrationForm, {
      program: {
        ...baseInternalProgram,
        registrationMode: "external",
        status: "closed",
      },
      registeredCount: 0,
      configured: true,
    }),
  );
  assert.match(externalClosedHtml, /Pendaftaran Tidak Tersedia di Website/);
  assert.doesNotMatch(externalClosedHtml, /<form|—/);

  const upcomingHtml = renderToStaticMarkup(
    createElement(ProgramRegistrationForm, {
      program: { ...baseInternalProgram, status: "upcoming" },
      registeredCount: 0,
      configured: true,
    }),
  );
  assert.match(upcomingHtml, /Pendaftaran Belum Dibuka/);
  assert.match(upcomingHtml, /Akan diumumkan panitia/);
  assert.doesNotMatch(upcomingHtml, /<form|—/);

  const closedHtml = renderToStaticMarkup(
    createElement(ProgramRegistrationForm, {
      program: { ...baseInternalProgram, status: "closed" },
      registeredCount: 0,
      configured: true,
    }),
  );
  assert.match(closedHtml, /Pendaftaran Ditutup/);
  assert.doesNotMatch(closedHtml, /<form|—/);

  const quotaFullHtml = renderToStaticMarkup(
    createElement(ProgramRegistrationForm, {
      program: baseInternalProgram,
      registeredCount: 50,
      configured: true,
    }),
  );
  assert.match(quotaFullHtml, /Kuota Peserta Penuh/);
  assert.match(quotaFullHtml, /50 dari 50 peserta/);
  assert.doesNotMatch(quotaFullHtml, /<form|—/);
});

test("formulir pendaftaran aktif memiliki seluruh field wajib dan kontrol aksesibel", () => {
  const formHtml = renderToStaticMarkup(
    createElement(ProgramRegistrationForm, {
      program: baseInternalProgram,
      registeredCount: 10,
      configured: true,
    }),
  );
  for (const needle of [
    'id="reg-nama"',
    'id="reg-nim"',
    'inputMode="numeric"',
    'id="reg-angkatan"',
    'value="2020"',
    'value="2026"',
    'id="reg-noHp"',
    'inputMode="tel"',
    'id="reg-idLine"',
    'id="reg-email"',
    'id="reg-catatan"',
    'type="submit"',
    "Kirim Pendaftaran",
  ]) {
    assert.ok(formHtml.includes(needle), `Missing ${needle} in form markup`);
  }
  assert.doesNotMatch(formHtml, /—/);
});

test("formulir pendaftaran menghormati mode hidden, optional, required pada kolom bawaan dan pasangan grid adaptif", () => {
  const oddGridHtml = renderToStaticMarkup(
    createElement(ProgramRegistrationForm, {
      program: {
        ...baseInternalProgram,
        registrationFormConfig: richCustomConfig,
      },
      registeredCount: 3,
      configured: true,
    }),
  );

  assert.match(oddGridHtml, /id="reg-nama"[^>]*required/);
  assert.match(oddGridHtml, /id="reg-nim"[^>]*required/);
  assert.equal(oddGridHtml.includes('id="reg-angkatan"'), false);
  assert.equal(oddGridHtml.includes('id="reg-idLine"'), false);
  assert.equal(oddGridHtml.includes('id="reg-catatan"'), false);

  assert.match(oddGridHtml, /Nomor HP \/ WhatsApp aktif.*\(opsional\)/);
  assert.doesNotMatch(oddGridHtml, /id="reg-noHp"[^>]*required/);
  assert.match(oddGridHtml, /Email[^<]*<span[^>]*>\*<\/span>/);
  assert.match(oddGridHtml, /id="reg-email"[^>]*required/);
  assert.match(
    oddGridHtml,
    /class="min-w-0 space-y-1\.5 sm:col-span-2">[\s\S]*?id="reg-email"/,
  );

  const evenGridConfig: ProgramFormConfig = {
    builtInFields: {
      angkatan: "optional",
      noHp: "required",
      idLine: "hidden",
      email: "optional",
      catatan: "optional",
    },
    customFields: [],
  };
  const evenGridHtml = renderToStaticMarkup(
    createElement(ProgramRegistrationForm, {
      program: {
        ...baseInternalProgram,
        registrationFormConfig: evenGridConfig,
      },
      registeredCount: 3,
      configured: true,
    }),
  );
  assert.match(evenGridHtml, /Angkatan.*\(opsional\)/);
  assert.doesNotMatch(evenGridHtml, /id="reg-angkatan"[^>]*required/);
  assert.match(
    evenGridHtml,
    /<option value="" selected="">Pilih tahun angkatan \(opsional\)<\/option>/,
  );
  assert.equal(evenGridHtml.includes('id="reg-idLine"'), false);
  assert.equal(evenGridHtml.includes("sm:col-span-2"), false);

  const singleCompactConfig: ProgramFormConfig = {
    builtInFields: {
      angkatan: "hidden",
      noHp: "hidden",
      idLine: "hidden",
      email: "hidden",
      catatan: "hidden",
    },
    customFields: [],
  };
  const singleCompactHtml = renderToStaticMarkup(
    createElement(ProgramRegistrationForm, {
      program: {
        ...baseInternalProgram,
        registrationFormConfig: singleCompactConfig,
      },
      registeredCount: 1,
      configured: true,
    }),
  );
  assert.match(
    singleCompactHtml,
    /class="min-w-0 space-y-1\.5 sm:col-span-2">[\s\S]*?id="reg-nim"/,
  );
  assert.doesNotMatch(singleCompactHtml, /—/);
});

test("formulir pendaftaran merender seluruh 6 tipe kolom kustom sesuai urutan konfigurasi dan standar antislop", () => {
  const html = renderToStaticMarkup(
    createElement(ProgramRegistrationForm, {
      program: {
        ...baseInternalProgram,
        registrationFormConfig: richCustomConfig,
      },
      registeredCount: 5,
      configured: true,
    }),
  );

  assert.match(html, /Pertanyaan Tambahan/);
  assert.match(
    html,
    /id="reg-custom-asal_prodi"[^>]*type="text"[^>]*required=""[^>]*maxLength="200"[^>]*placeholder="Contoh: Teknologi Informasi"/,
  );
  assert.match(
    html,
    /<textarea id="reg-custom-motivasi_ikut"[^>]*rows="3"[^>]*maxLength="500"[^>]*placeholder="Ceritakan singkat motivasi Anda"/,
  );
  assert.match(html, /Motivasi Mengikuti Kegiatan.*\(opsional\)/);
  assert.match(html, /0\/500/);

  assert.match(
    html,
    /id="reg-custom-semester_aktif"[^>]*type="text"[^>]*inputMode="decimal"[^>]*required=""[^>]*maxLength="30"/,
  );
  assert.match(html, /Masukkan angka saja \(gunakan titik untuk desimal/);

  assert.match(html, /<select id="reg-custom-ukuran_kaos"[^>]*required=""/);
  assert.match(
    html,
    /<option value="" disabled="" selected="">Pilih Ukuran Kaos<\/option>/,
  );
  for (const size of ["S", "M", "L", "XL"]) {
    assert.ok(html.includes(`<option value="${size}">${size}</option>`));
  }

  assert.match(html, /id="reg-custom-tanggal_siap"[^>]*type="date"/);
  assert.doesNotMatch(html, /id="reg-custom-tanggal_siap"[^>]*required/);
  assert.match(html, /Tanggal Ketersediaan Briefing.*\(opsional\)/);

  assert.match(
    html,
    /<label for="reg-custom-setuju_aturan" class="flex min-h-\[44px\][^"]*has-\[:focus-visible\]:ring-amber-700[^"]*">[\s\S]*?<input id="reg-custom-setuju_aturan"[^>]*type="checkbox"[^>]*required=""[^>]*focus-visible:ring-amber-700/,
  );
  assert.match(html, /Kehadiran wajib dicatat saat registrasi ulang/);
  assert.match(
    html,
    /<label for="reg-custom-bersedia_dokumentasi"[\s\S]*?<input id="reg-custom-bersedia_dokumentasi"[^>]*type="checkbox"/,
  );
  assert.doesNotMatch(html, /id="reg-custom-bersedia_dokumentasi"[^>]*required/);

  const orderIds = [
    'id="reg-custom-asal_prodi"',
    'id="reg-custom-motivasi_ikut"',
    'id="reg-custom-semester_aktif"',
    'id="reg-custom-ukuran_kaos"',
    'id="reg-custom-tanggal_siap"',
    'id="reg-custom-setuju_aturan"',
    'id="reg-custom-bersedia_dokumentasi"',
  ];
  let previousIdx = -1;
  for (const idMarker of orderIds) {
    const idx = html.indexOf(idMarker);
    assert.ok(idx > previousIdx, `Expected ${idMarker} after index ${previousIdx}`);
    previousIdx = idx;
  }

  assert.doesNotMatch(html, /—/);
});

test("validasi klien mengirim string kosong untuk kolom bawaan tersembunyi serta menolak jawaban kustom yang salah", () => {
  const payload = validateAndBuildRegistrationPayload(
    baseInternalProgram.id,
    {
      nama: "I Made Santika",
      nim: "22010101",
      angkatan: "2024",
      noHp: "",
      idLine: "id_lama_tersembunyi",
      email: "santika@undiknas.ac.id",
      catatan: "catatan tersembunyi",
      customValues: {
        asal_prodi: "Teknologi Informasi",
        motivasi_ikut: "",
        semester_aktif: "5",
        ukuran_kaos: "L",
        tanggal_siap: "",
        setuju_aturan: true,
        bersedia_dokumentasi: false,
      },
    },
    richCustomConfig,
  );

  assert.equal(payload.programId, baseInternalProgram.id);
  assert.equal(payload.angkatan, "");
  assert.equal(payload.noHp, "");
  assert.equal(payload.idLine, "");
  assert.equal(payload.email, "santika@undiknas.ac.id");
  assert.equal(payload.catatan, "");
  assert.deepEqual(payload.customResponses, {
    asal_prodi: "Teknologi Informasi",
    motivasi_ikut: "",
    semester_aktif: "5",
    ukuran_kaos: "L",
    tanggal_siap: "",
    setuju_aturan: true,
    bersedia_dokumentasi: false,
  });

  assert.throws(
    () =>
      validateAndBuildRegistrationPayload(
        baseInternalProgram.id,
        {
          nama: "I Made Santika",
          nim: "22010101",
          angkatan: "",
          noHp: "",
          idLine: "",
          email: "santika@undiknas.ac.id",
          catatan: "",
          customValues: {
            asal_prodi: "TI",
            semester_aktif: "5",
            ukuran_kaos: "L",
            setuju_aturan: false,
          },
        },
        richCustomConfig,
      ),
    ValidationError,
  );
});

test("ringkasan konfirmasi dan bukti cetak menampilkan field terlihat serta seluruh kolom kustom tanpa em dash", () => {
  const result: RegistrationResult = {
    registration: {
      id: "33333333-3333-4333-8333-333333333333",
      programId: baseInternalProgram.id,
      nama: "Ni Luh Putu",
      nim: "23010102",
      angkatan: "",
      submittedAt: "2026-11-18T03:30:00Z",
    },
    programTitle: baseInternalProgram.title,
    registrationGroupLink: "https://chat.whatsapp.com/contoh-grup",
    submittedNoHp: "081234567890",
    submittedIdLine: "",
    submittedEmail: "putu@undiknas.ac.id",
    submittedCatatan: "",
    submittedCustomResponses: {
      asal_prodi: "Teknologi Informasi",
      motivasi_ikut: "",
      semester_aktif: "4",
      ukuran_kaos: "M",
      tanggal_siap: "",
      setuju_aturan: true,
      bersedia_dokumentasi: false,
    },
  };

  const confirmHtml = renderToStaticMarkup(
    createElement(ProgramRegistrationConfirmation, {
      result,
      formConfig: richCustomConfig,
      onPrint: () => {},
    }),
  );
  const printHtml = renderToStaticMarkup(
    createElement(ProgramRegistrationPrintableReceipt, {
      result,
      programPeriod: baseInternalProgram.period,
      formConfig: richCustomConfig,
    }),
  );

  for (const rendered of [confirmHtml, printHtml]) {
    assert.match(rendered, /Ni Luh Putu/);
    assert.match(rendered, /23010102/);
    assert.match(rendered, /Nomor HP \/ WA/);
    assert.match(rendered, /081234567890/);
    assert.match(rendered, /Email/);
    assert.match(rendered, /putu@undiknas\.ac\.id/);

    assert.equal(rendered.includes("Angkatan"), false);
    assert.equal(rendered.includes("ID LINE"), false);
    assert.equal(rendered.includes("Catatan untuk Panitia"), false);

    assert.match(rendered, /Asal Program Studi[\s\S]*?Teknologi Informasi/);
    assert.match(rendered, /Motivasi Mengikuti Kegiatan[\s\S]*?>-</);
    assert.match(rendered, /Semester Saat Ini[\s\S]*?>4</);
    assert.match(rendered, /Ukuran Kaos[\s\S]*?>M</);
    assert.match(rendered, /Tanggal Ketersediaan Briefing[\s\S]*?>-</);
    assert.match(
      rendered,
      /Saya bersedia mengikuti seluruh tata tertib kegiatan[\s\S]*?>Ya</,
    );
    assert.match(
      rendered,
      /Bersedia menjadi relawan dokumentasi[\s\S]*?>Tidak</,
    );
    assert.doesNotMatch(rendered, /—/);
  }

  assert.match(confirmHtml, /Gabung Grup Peserta/);
  assert.match(
    confirmHtml,
    /href="https:\/\/chat\.whatsapp\.com\/contoh-grup"/,
  );
  assert.match(confirmHtml, /Cetak \/ Simpan Bukti/);
  assert.match(confirmHtml, /Lihat Program Kerja lain/);
  assert.match(confirmHtml, /href="\/program-kerja"/);

  assert.match(printHtml, /Bukti Pendaftaran Peserta Program Kerja/);
  assert.match(printHtml, /33333333-3333-4333-8333-333333333333/);
  assert.match(printHtml, /Tautan Grup Resmi Peserta/);

  const noGroupNoContactConfig: ProgramFormConfig = {
    builtInFields: {
      angkatan: "hidden",
      noHp: "hidden",
      idLine: "hidden",
      email: "hidden",
      catatan: "hidden",
    },
    customFields: [],
  };
  const fallbackConfirmHtml = renderToStaticMarkup(
    createElement(ProgramRegistrationConfirmation, {
      result: { ...result, registrationGroupLink: "" },
      formConfig: noGroupNoContactConfig,
      onPrint: () => {},
    }),
  );
  assert.match(fallbackConfirmHtml, /pengumuman resmi HIMA TI/);
  assert.doesNotMatch(fallbackConfirmHtml, /WhatsApp|ID LINE/);
});

test("komponen formulir pendaftaran memenuhi standar antislop (tanpa em dash, target 44px, alert aksesibel, min-w-0)", () => {
  const source = fs.readFileSync(
    path.join(
      process.cwd(),
      "src/components/programs/program-registration-form.tsx",
    ),
    "utf8",
  );
  assert.equal(source.includes("—"), false);
  assert.match(source, /min-h-\[44px\]/);
  assert.match(source, /min-h-\[48px\]/);
  assert.match(source, /min-w-0/);
  assert.match(source, /role="alert"/);
  assert.match(source, /<Warning/);
  assert.match(source, /focus-visible:ring-amber-700/);
});

test("halaman daftar program kerja menampilkan status, metadata, dan tautan daftar internal/eksternal", () => {
  const samplePrograms: Program[] = [
    ...initialPrograms,
    {
      ...baseInternalProgram,
      id: "22222222-2222-4222-8222-222222222222",
      title: "Seminar Eksternal Terbuka",
      registrationMode: "external",
      registrationMaxQuota: null,
      gformLink: "https://example.com/seminar",
      status: "open",
    },
  ];
  const tabsHtml = renderToStaticMarkup(
    createElement(ProgramPeriodTabs, { programs: samplePrograms }),
  );
  assert.match(tabsHtml, /role="tablist"/);
  assert.match(tabsHtml, /role="tab"/);
  assert.match(tabsHtml, /Pendaftaran Dibuka/);
  assert.match(tabsHtml, /Segera Hadir/);
  assert.match(tabsHtml, /Pendaftaran Ditutup/);
  assert.match(
    tabsHtml,
    /href="\/program-kerja\/program-2025-2026-4\/daftar"/,
  );
  assert.match(tabsHtml, /href="https:\/\/example\.com\/seminar"/);
  assert.doesNotMatch(tabsHtml, /—/);
});

test("modal program kerja mengarahkan pendaftaran internal ke halaman pendaftaran website", () => {
  const modalHtml = renderToStaticMarkup(
    createElement(ProgramModal, {
      program: {
        id: baseInternalProgram.id,
        period: baseInternalProgram.period,
        icon: Cake,
        title: baseInternalProgram.title,
        body: baseInternalProgram.body,
        fullDescription: baseInternalProgram.fullDescription,
        executionDate: baseInternalProgram.executionDate,
        time: baseInternalProgram.time,
        location: baseInternalProgram.location,
        status: "open",
        statusText: "Pendaftaran Dibuka",
        registrationMode: "internal",
        registrationMaxQuota: 50,
      },
      onClose: () => {},
    }),
  );
  assert.match(
    modalHtml,
    /href="\/program-kerja\/11111111-1111-4111-8111-111111111111\/daftar"/,
  );
  assert.match(modalHtml, /Daftar Sekarang/);
  assert.doesNotMatch(modalHtml, /—/);
});

test("buildCohortQuotaSummary menghitung sisa slot dan status penuh secara akurat", () => {
  const defaultSummary = buildCohortQuotaSummary(DEFAULT_PROGRAM_FORM_CONFIG, {
    "2023": 5,
  });
  assert.deepEqual(defaultSummary, {
    enabled: false,
    items: [],
    allFull: false,
  });

  const disabledWithTiersConfig: ProgramFormConfig = {
    ...DEFAULT_PROGRAM_FORM_CONFIG,
    cohortQuotas: {
      enabled: false,
      tiers: [
        { angkatan: "2023", maxQuota: 5 },
        { angkatan: "2024", maxQuota: 5 },
      ],
    },
  };
  const disabledSummary = buildCohortQuotaSummary(disabledWithTiersConfig, {
    "2023": 5,
    "2024": 5,
  });
  assert.equal(disabledSummary.enabled, false);
  assert.equal(disabledSummary.allFull, false);
  assert.equal(disabledSummary.items.length, 2);

  const cohortConfig: ProgramFormConfig = {
    ...DEFAULT_PROGRAM_FORM_CONFIG,
    cohortQuotas: {
      enabled: true,
      tiers: [
        { angkatan: "2023", maxQuota: 5 },
        { angkatan: "2024", maxQuota: 5 },
        { angkatan: "2025", maxQuota: 5 },
        { angkatan: "2026", maxQuota: 5 },
      ],
    },
  };
  const partialSummary = buildCohortQuotaSummary(cohortConfig, {
    "2023": 5,
    "2024": 2,
    "2025": -3,
    "2026": 7,
  });
  assert.equal(partialSummary.enabled, true);
  assert.equal(partialSummary.allFull, false);
  assert.deepEqual(partialSummary.items, [
    { angkatan: "2023", maxQuota: 5, registered: 5, remaining: 0, isFull: true },
    { angkatan: "2024", maxQuota: 5, registered: 2, remaining: 3, isFull: false },
    { angkatan: "2025", maxQuota: 5, registered: 0, remaining: 5, isFull: false },
    { angkatan: "2026", maxQuota: 5, registered: 7, remaining: 0, isFull: true },
  ]);

  const fullSummary = buildCohortQuotaSummary(cohortConfig, {
    "2023": 5,
    "2024": 5,
    "2025": 5,
    "2026": 5,
  });
  assert.equal(fullSummary.enabled, true);
  assert.equal(fullSummary.allFull, true);
});

test("formulir pendaftaran mode default tetap menampilkan angkatan 2020 sampai 2026 tanpa panel kuota angkatan", () => {
  const html = renderToStaticMarkup(
    createElement(ProgramRegistrationForm, {
      program: baseInternalProgram,
      registeredCount: 4,
      configured: true,
    }),
  );
  for (const year of ["2020", "2021", "2022", "2023", "2024", "2025", "2026"]) {
    assert.ok(
      html.includes(`<option value="${year}">${year}</option>`),
      `Expected default option ${year}`,
    );
  }
  assert.equal(html.includes("Kuota per Angkatan"), false);
  assert.doesNotMatch(html, /[\u2014\u2013]/);
});

test("formulir pendaftaran dengan cohortQuotas 2023-2026 membatasi whitelist, menonaktifkan angkatan penuh, dan menolak angkatan penuh di validasi klien", () => {
  const cohortConfig: ProgramFormConfig = {
    ...DEFAULT_PROGRAM_FORM_CONFIG,
    cohortQuotas: {
      enabled: true,
      tiers: [
        { angkatan: "2023", maxQuota: 5 },
        { angkatan: "2024", maxQuota: 5 },
        { angkatan: "2025", maxQuota: 5 },
        { angkatan: "2026", maxQuota: 5 },
      ],
    },
  };
  const cohortCounts = { "2023": 5, "2024": 2, "2025": 0, "2026": 4 };

  const html = renderToStaticMarkup(
    createElement(ProgramRegistrationForm, {
      program: {
        ...baseInternalProgram,
        registrationFormConfig: cohortConfig,
      },
      registeredCount: 11,
      cohortCounts,
      configured: true,
    }),
  );

  assert.doesNotMatch(html, /Kuota per Angkatan/);

  for (const excluded of ["2020", "2021", "2022"]) {
    assert.equal(
      html.includes(`value="${excluded}"`),
      false,
      `Angkatan ${excluded} tidak boleh muncul di dropdown whitelist`,
    );
  }
  assert.match(
    html,
    /<option value="2023" disabled="">2023 \(Penuh - 5\/5\)<\/option>/,
  );
  assert.match(
    html,
    /<option value="2024">2024 \(Sisa 3 dari 5\)<\/option>/,
  );
  assert.match(
    html,
    /<option value="2025">2025 \(Sisa 5 dari 5\)<\/option>/,
  );
  assert.match(
    html,
    /<option value="2026">2026 \(Sisa 1 dari 5\)<\/option>/,
  );
  assert.doesNotMatch(html, /[\u2014\u2013]/);

  const validPayload = validateAndBuildRegistrationPayload(
    baseInternalProgram.id,
    {
      nama: "I Made Santika",
      nim: "24010101",
      angkatan: "2024",
      noHp: "081234567890",
      idLine: "santika_ti",
      email: "santika@undiknas.ac.id",
      catatan: "",
      customValues: {},
    },
    cohortConfig,
    cohortCounts,
  );
  assert.equal(validPayload.angkatan, "2024");

  assert.throws(
    () =>
      validateAndBuildRegistrationPayload(
        baseInternalProgram.id,
        {
          nama: "I Made Santika",
          nim: "22010101",
          angkatan: "2022",
          noHp: "081234567890",
          idLine: "santika_ti",
          email: "",
          catatan: "",
          customValues: {},
        },
        cohortConfig,
        cohortCounts,
      ),
    (error: unknown) =>
      error instanceof ValidationError &&
      /2023, 2024, 2025, 2026/.test(error.message),
  );

  assert.throws(
    () =>
      validateAndBuildRegistrationPayload(
        baseInternalProgram.id,
        {
          nama: "I Made Santika",
          nim: "23010101",
          angkatan: "2023",
          noHp: "081234567890",
          idLine: "santika_ti",
          email: "",
          catatan: "",
          customValues: {},
        },
        cohortConfig,
        cohortCounts,
      ),
    (error: unknown) =>
      error instanceof ValidationError &&
      /angkatan 2023 sudah penuh/i.test(error.message),
  );
});

test("formulir pendaftaran menampilkan notice penuh saat seluruh kuota angkatan terisi penuh", () => {
  const cohortConfig: ProgramFormConfig = {
    ...DEFAULT_PROGRAM_FORM_CONFIG,
    cohortQuotas: {
      enabled: true,
      tiers: [
        { angkatan: "2023", maxQuota: 5 },
        { angkatan: "2024", maxQuota: 5 },
        { angkatan: "2025", maxQuota: 5 },
        { angkatan: "2026", maxQuota: 5 },
      ],
    },
  };
  const allFullHtml = renderToStaticMarkup(
    createElement(ProgramRegistrationForm, {
      program: {
        ...baseInternalProgram,
        registrationMaxQuota: null,
        registrationFormConfig: cohortConfig,
      },
      registeredCount: 20,
      cohortCounts: { "2023": 5, "2024": 5, "2025": 5, "2026": 5 },
      configured: true,
    }),
  );

  assert.match(allFullHtml, /Kuota Peserta Penuh/);
  assert.match(allFullHtml, /Seluruh kuota angkatan yang dibuka/);
  assert.match(allFullHtml, /5\/5 peserta/);
  assert.doesNotMatch(allFullHtml, /<form|type="submit"|[\u2014\u2013]/);
});

test("seluruh file UI publik program pendaftaran bebas dari karakter em dash dan en dash", () => {
  const files = [
    "src/app/program-kerja/[id]/daftar/page.tsx",
    "src/components/programs/program-registration-form.tsx",
    "src/components/home/program-modal.tsx",
    "src/components/detail/program-period-tabs.tsx",
  ];
  for (const rel of files) {
    const content = fs.readFileSync(path.join(process.cwd(), rel), "utf8");
    assert.equal(content.includes("\u2014"), false, `Em dash found in ${rel}`);
    assert.equal(content.includes("\u2013"), false, `En dash found in ${rel}`);
  }
});

test("generateMetadata dan halaman daftar proker memanggil notFound() serta meneruskan cohortCounts dan ringkasan kuota angkatan", async () => {
  class NotFoundSignal extends Error {
    digest = "NEXT_HTTP_ERROR_FALLBACK;404";
  }
  let mockData: {
    program: Program | null;
    registeredCount: number;
    cohortCounts: Record<string, number>;
    configured: boolean;
  } = { program: null, registeredCount: 0, cohortCounts: {}, configured: true };
  let capturedFormProps: Record<string, unknown> | null = null;
  const stub = () => null;
  const modules: Record<string, unknown> = {
    react: { cache: (fn: unknown) => fn },
    "react/jsx-runtime": jsxRuntime,
    "next/image": { default: stub },
    "next/navigation": {
      notFound: () => {
        throw new NotFoundSignal("notFound");
      },
    },
    "@phosphor-icons/react/dist/ssr": new Proxy({}, { get: () => stub }),
    "@/components/detail/detail-header": { DetailHeader: stub },
    "@/components/programs/program-registration-form": {
      ProgramRegistrationForm: (props: Record<string, unknown>) => {
        capturedFormProps = props;
        return null;
      },
    },
    "@/components/ui/navigation-link": { default: stub },
    "@/data/programs": {
      loadProgramRegistrationPage: async () => mockData,
    },
    "@/domain/program-form-config": { buildCohortQuotaSummary, normalizeProgramFormConfig },
    "@/domain/programs": {
      PROGRAM_STATUSES: {
        open: "Pendaftaran Dibuka",
        upcoming: "Segera Hadir",
        closed: "Pendaftaran Ditutup",
      },
    },
  };
  const context = {
    exports: {} as {
      default: (args: {
        params: Promise<{ id: string }>;
      }) => Promise<React.ReactElement>;
      generateMetadata: (args: {
        params: Promise<{ id: string }>;
      }) => Promise<{ title?: string }>;
    },
    require: (name: string) => {
      assert.ok(Object.hasOwn(modules, name), `Unexpected import: ${name}`);
      return modules[name];
    },
  };
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/app/program-kerja/[id]/daftar/page.tsx"),
    "utf8",
  );
  runInNewContext(
    transpileModule(source, {
      compilerOptions: {
        module: ModuleKind.CommonJS,
        target: ScriptTarget.ES2020,
        jsx: 4,
      },
    }).outputText,
    context,
  );

  await assert.rejects(
    context.exports.generateMetadata({
      params: Promise.resolve({ id: "missing" }),
    }),
    NotFoundSignal,
  );

  mockData = {
    program: { ...baseInternalProgram, isPublished: false },
    registeredCount: 0,
    cohortCounts: {},
    configured: true,
  };
  await assert.rejects(
    context.exports.generateMetadata({
      params: Promise.resolve({ id: "unpublished" }),
    }),
    NotFoundSignal,
  );

  const cohortConfig: ProgramFormConfig = {
    ...DEFAULT_PROGRAM_FORM_CONFIG,
    cohortQuotas: {
      enabled: true,
      tiers: [
        { angkatan: "2023", maxQuota: 5 },
        { angkatan: "2024", maxQuota: 5 },
      ],
    },
  };
  mockData = {
    program: {
      ...baseInternalProgram,
      registrationFormConfig: cohortConfig,
    },
    registeredCount: 10,
    cohortCounts: { "2023": 5, "2024": 5 },
    configured: true,
  };
  const meta = await context.exports.generateMetadata({
    params: Promise.resolve({ id: baseInternalProgram.id }),
  });
  assert.match(String(meta.title), /IT Versary & Sertijab 2026/);

  const pageTree = await context.exports.default({
    params: Promise.resolve({ id: baseInternalProgram.id }),
  });
  const pageHtml = renderToStaticMarkup(pageTree);
  assert.match(pageHtml, /Kuota per Angkatan/);
  assert.match(pageHtml, /Angkatan 2023/);
  assert.match(pageHtml, /Angkatan 2024/);
  assert.match(pageHtml, /5\/5 peserta/);
  assert.match(pageHtml, /Kuota penuh/);
  assert.doesNotMatch(pageHtml, /[\u2014\u2013]/);
  assert.deepEqual(
    (capturedFormProps as { cohortCounts?: Record<string, number> } | null)
      ?.cohortCounts,
    { "2023": 5, "2024": 5 },
  );
});
