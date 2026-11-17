import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProgramsManager } from "../src/components/admin/programs-manager";
import { ProgramRegistrationsManager } from "../src/components/admin/program-registrations-manager";

test("ProgramsManager merender tab daftar program dan peserta proker tanpa em dash", () => {
  const html = renderToStaticMarkup(createElement(ProgramsManager));
  assert.match(html, /role="tablist"/);
  assert.match(html, /Daftar program/);
  assert.match(html, /Peserta proker/);
  assert.match(html, /id="programs-tab-programs"[^>]*aria-selected="true"/);
  assert.match(html, /Tambah periode/);
  assert.match(html, /Tambah program/);
  assert.match(html, /Memuat program kerja/);
  assert.doesNotMatch(html, /—/);
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
  assert.doesNotMatch(html, /—/);
});

test("ProgramRegistrationsManager merender filter program, pencarian, dan tautan ekspor Excel", () => {
  const html = renderToStaticMarkup(createElement(ProgramRegistrationsManager));
  assert.match(html, /Peserta program kerja/);
  assert.match(html, /Filter program kerja/);
  assert.match(html, /Cari peserta/);
  assert.match(html, /Unduh Excel \(\.xlsx\)/);
  assert.match(html, /href="\/api\/admin\/program-registrations\/export"/);
  assert.match(html, /Memuat daftar peserta/);
  assert.doesNotMatch(html, /—/);
});
