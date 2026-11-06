import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { loadEnvConfig } from "@next/env";
import * as XLSX from "xlsx";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { importRegistrations } from "../src/use-cases/import-registrations";
import type { RegistrationImportRepository } from "../src/domain/repositories";

loadEnvConfig(process.cwd());

async function main() {
  const { values } = parseArgs({
    options: {
      file: { type: "string" },
      period: { type: "string" },
      sheet: { type: "string" },
      commit: { type: "boolean", default: false },
    },
  });
  if (!values.file || !values.period)
    throw new Error(
      "Gunakan: npm run db:import-registrations -- --file PATH --period PERIODE [--commit]",
    );
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL belum diisi.");
  const workbook = XLSX.read(readFileSync(values.file), {
    type: "buffer",
    raw: true,
    cellDates: false,
    dateNF: "dd/mm/yyyy hh:mm:ss",
  });
  const sheet = values.sheet || workbook.SheetNames[0];
  if (!sheet || !workbook.Sheets[sheet])
    throw new Error("Sheet tidak ditemukan.");
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets[sheet],
    { raw: false, defval: "", blankrows: false },
  );
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  const repository: RegistrationImportRepository = {
    existingNims: async (nims, period) =>
      (
        await prisma.registration.findMany({
          where: { nim: { in: nims }, period },
          select: { nim: true },
        })
      ).map((row) => row.nim),
    insertImported: async (entries) =>
      (
        await prisma.registration.createMany({
          data: entries.map((entry) => ({ ...entry, source: "spreadsheet" })),
          skipDuplicates: true,
        })
      ).count,
  };
  try {
    const result = await importRegistrations(
      repository,
      rows,
      values.period,
      values.commit === true,
    );
    console.log(
      JSON.stringify({
        total: result.total,
        ready: result.ready,
        duplicates: result.duplicates,
        imported: result.imported,
        ignoredColumns: result.ignoredColumns,
        issues: result.issues.map((issue) => ({
          row: issue.row,
          message: issue.message.replace(/\d{5,}/g, "[identifier]"),
        })),
        mode: values.commit ? "commit" : "preview",
      }),
    );
    if (result.issues.length) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => {
  console.error(
    "Migrasi belum berhasil. Periksa header, format tanggal, dan koneksi database. Data pribadi tidak dicetak ke log.",
  );
  process.exitCode = 1;
});
