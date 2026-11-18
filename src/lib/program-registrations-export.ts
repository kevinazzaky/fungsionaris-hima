import * as XLSX from "xlsx";
import type { ProgramRegistrationListItem } from "@/domain/program-registrations";

export const PROGRAM_REGISTRATION_EXPORT_HEADERS = [
  "No",
  "Program Kerja",
  "Periode",
  "Nama Lengkap",
  "NIM",
  "Angkatan",
  "No. HP / WA",
  "ID LINE",
  "Email",
  "Catatan",
  "Waktu Daftar",
] as const;

export function sanitizeSpreadsheetText(value: string): string {
  if (!value) return "";
  // Prefix formula-trigger characters so spreadsheet apps render values as literal text.
  return /^[\t\r ]*[=+\-@]|^[\t\r]/.test(value) ? `'${value}` : value;
}

export function formatProgramRegistrationTimestamp(
  value: Date | string,
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.toLocaleString("id-ID", { timeZone: "Asia/Makassar" })} WITA`;
}

export function createProgramRegistrationsWorkbook(
  items: ProgramRegistrationListItem[],
): Buffer {
  const rows = items.map((item, index) => [
    index + 1,
    sanitizeSpreadsheetText(item.programTitle),
    sanitizeSpreadsheetText(item.programPeriod),
    sanitizeSpreadsheetText(item.nama),
    sanitizeSpreadsheetText(item.nim),
    sanitizeSpreadsheetText(item.angkatan),
    sanitizeSpreadsheetText(item.noHp),
    sanitizeSpreadsheetText(item.idLine),
    sanitizeSpreadsheetText(item.email),
    sanitizeSpreadsheetText(item.catatan),
    sanitizeSpreadsheetText(formatProgramRegistrationTimestamp(item.submittedAt)),
  ]);

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    [...PROGRAM_REGISTRATION_EXPORT_HEADERS],
    ...rows,
  ]);
  sheet["!cols"] = [
    { wch: 5 },
    { wch: 30 },
    { wch: 14 },
    { wch: 28 },
    { wch: 15 },
    { wch: 10 },
    { wch: 18 },
    { wch: 18 },
    { wch: 28 },
    { wch: 36 },
    { wch: 26 },
  ];

  XLSX.utils.book_append_sheet(workbook, sheet, "Peserta Program");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
