import assert from "node:assert/strict";
import test from "node:test";
import { buildRegistrationDocument } from "../src/use-cases/registration-document";
import type { Registration } from "../src/domain/admin";

const registration: Registration = {
  id: "test",
  nama: "Pendaftar uji",
  nim: "000123456",
  angkatan: "2025",
  period: "2026",
  tempatTanggalLahir: "Denpasar, 1 Januari 2005",
  jenisKelamin: "Laki-laki",
  alamat: "Alamat uji",
  noHp: "08123456789",
  idLine: "akun-uji",
  pengalamanOrganisasi:
    "Kegiatan pertama; Kegiatan kedua; Kegiatan ketiga; Kegiatan keempat",
  minatSkill: "Desain",
  alasanBergabung: "Belajar berorganisasi",
  divisi: "hh, psdm, Divisi lain",
  alasanDivisi: "Mengembangkan kemampuan",
  submittedAt: new Date("2026-11-04T18:30:00.000Z"),
  berkas: "lampiran.pdf",
  berkasPath: null,
  berkasSize: null,
  source: "spreadsheet",
};
const divisions = [
  { id: "hh", label: "HH" },
  { id: "psdm", label: "PSDM" },
];

test("surat admin memakai identitas tersimpan, label divisi dan tanggal WITA", () => {
  const data = buildRegistrationDocument(registration, divisions);
  assert.equal(data.nama, registration.nama);
  assert.equal(data.nim, registration.nim);
  assert.equal(data.noHp, registration.noHp);
  assert.equal(data.alasanBergabung, registration.alasanBergabung);
  assert.equal(data.divisi, "HH, PSDM, Divisi lain");
  assert.equal(data.tanggalDaftar, "5 November 2026");
  assert.equal(data.period, "2026");
});

test("seluruh pengalaman organisasi tetap tersedia dalam tiga slot template", () => {
  const data = buildRegistrationDocument(registration, divisions);
  assert.equal(data.pengalaman1, "Kegiatan pertama");
  assert.equal(data.pengalaman2, "Kegiatan kedua");
  assert.equal(data.pengalaman3, "Kegiatan ketiga; Kegiatan keempat");
});

test("tanggal dan foto yang tidak tersimpan tidak diganti data buatan", () => {
  const data = buildRegistrationDocument(
    { ...registration, submittedAt: null, pengalamanOrganisasi: "-" },
    divisions,
  );
  assert.equal(data.tanggalDaftar, "....................");
  assert.equal(data.fotoUrl, undefined);
  assert.equal(data.pengalaman1, undefined);
  assert.ok(!Object.hasOwn(data, "berkasPath"));
});
