import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { ModuleKind, ScriptTarget, transpileModule } from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Cake } from "@phosphor-icons/react/dist/ssr";
import { ProgramPeriodTabs } from "../src/components/detail/program-period-tabs";
import { ProgramModal } from "../src/components/home/program-modal";
import { ProgramRegistrationForm } from "../src/components/programs/program-registration-form";
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
  speakers: [],
  price: "",
  benefits: [],
  contactPerson: "Panitia (081234567890)",
  sortOrder: 0,
  isPublished: true,
  imagePath: null,
  imageUrl: null,
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

test("seluruh file UI publik program pendaftaran bebas dari karakter em dash", () => {
  const files = [
    "src/app/program-kerja/[id]/daftar/page.tsx",
    "src/components/programs/program-registration-form.tsx",
    "src/components/home/program-modal.tsx",
    "src/components/detail/program-period-tabs.tsx",
  ];
  for (const rel of files) {
    const content = fs.readFileSync(path.join(process.cwd(), rel), "utf8");
    assert.equal(content.includes("—"), false, `Em dash found in ${rel}`);
  }
});

test("generateMetadata halaman daftar proker memanggil notFound() saat program tidak ditemukan atau belum dipublikasikan", async () => {
  class NotFoundSignal extends Error {
    digest = "NEXT_HTTP_ERROR_FALLBACK;404";
  }
  let mockData: {
    program: Program | null;
    registeredCount: number;
    configured: boolean;
  } = { program: null, registeredCount: 0, configured: true };
  const stub = {};
  const modules: Record<string, unknown> = {
    react: { cache: (fn: unknown) => fn },
    "react/jsx-runtime": { jsx: () => null, jsxs: () => null, Fragment: "fragment" },
    "next/image": stub,
    "next/navigation": {
      notFound: () => {
        throw new NotFoundSignal("notFound");
      },
    },
    "@phosphor-icons/react/dist/ssr": new Proxy({}, { get: () => stub }),
    "@/components/detail/detail-header": { DetailHeader: stub },
    "@/components/programs/program-registration-form": {
      ProgramRegistrationForm: stub,
    },
    "@/components/ui/navigation-link": stub,
    "@/data/programs": {
      loadProgramRegistrationPage: async () => mockData,
    },
    "@/domain/programs": { PROGRAM_STATUSES: {} },
  };
  const context = {
    exports: {} as {
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
    configured: true,
  };
  await assert.rejects(
    context.exports.generateMetadata({
      params: Promise.resolve({ id: "unpublished" }),
    }),
    NotFoundSignal,
  );

  mockData = {
    program: baseInternalProgram,
    registeredCount: 0,
    configured: true,
  };
  const meta = await context.exports.generateMetadata({
    params: Promise.resolve({ id: baseInternalProgram.id }),
  });
  assert.match(String(meta.title), /IT Versary & Sertijab 2026/);
});
