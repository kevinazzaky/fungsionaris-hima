import * as XLSX from "xlsx";
import {
  formatCustomResponseValue,
  normalizeProgramFormConfig,
  type BuiltInFieldKey,
  type CustomFormField,
  type ProgramFormConfig,
} from "@/domain/program-form-config";
import type { Program } from "@/domain/programs";
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

export type ProgramExportSchemaInput =
  | Program
  | Program[]
  | ProgramFormConfig
  | undefined;

type ConfigurableBuiltInColumn = {
  key: BuiltInFieldKey;
  header: string;
  wch: number;
};

const CONFIGURABLE_BUILT_IN_COLUMNS: readonly ConfigurableBuiltInColumn[] = [
  { key: "angkatan", header: "Angkatan", wch: 10 },
  { key: "noHp", header: "No. HP / WA", wch: 18 },
  { key: "idLine", header: "ID LINE", wch: 18 },
  { key: "email", header: "Email", wch: 28 },
  { key: "catatan", header: "Catatan", wch: 36 },
];

type ExportColumn = {
  header: string;
  wch: number;
  value: (item: ProgramRegistrationListItem, index: number) => string | number;
};

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isProgram(value: unknown): value is Program {
  return (
    isRecord(value) && "id" in value && "registrationFormConfig" in value
  );
}

function isProgramFormConfig(value: unknown): value is ProgramFormConfig {
  return (
    isRecord(value) &&
    ("builtInFields" in value || "customFields" in value) &&
    !("id" in value)
  );
}

function resolveSchemaContext(
  items: ProgramRegistrationListItem[],
  programsOrFormConfig?: ProgramExportSchemaInput,
) {
  let singleFormConfig: ProgramFormConfig | null = null;
  let matchingPrograms: Program[] = [];

  if (Array.isArray(programsOrFormConfig)) {
    if (programsOrFormConfig.length === 1) {
      singleFormConfig = normalizeProgramFormConfig(
        programsOrFormConfig[0].registrationFormConfig,
      );
      matchingPrograms = programsOrFormConfig;
    } else if (programsOrFormConfig.length > 1) {
      const activeIds = new Set(items.map((item) => item.programId));
      matchingPrograms = programsOrFormConfig.filter((program) =>
        activeIds.has(program.id),
      );
    }
  } else if (isProgram(programsOrFormConfig)) {
    singleFormConfig = normalizeProgramFormConfig(
      programsOrFormConfig.registrationFormConfig,
    );
    matchingPrograms = [programsOrFormConfig];
  } else if (isProgramFormConfig(programsOrFormConfig)) {
    singleFormConfig = normalizeProgramFormConfig(programsOrFormConfig);
  }

  return { singleFormConfig, matchingPrograms };
}

function shouldIncludeBuiltInColumn(
  key: BuiltInFieldKey,
  singleFormConfig: ProgramFormConfig | null,
  items: ProgramRegistrationListItem[],
): boolean {
  if (!singleFormConfig || singleFormConfig.builtInFields[key] !== "hidden") {
    return true;
  }
  return items.some((item) => Boolean(item[key]?.trim()));
}

function customColumnWidth(header: string): number {
  return Math.min(40, Math.max(18, header.length + 4));
}

function allocateUniqueHeader(
  preferred: string,
  usedHeaders: Set<string>,
  suffix = "Tambahan",
): string {
  const base = sanitizeSpreadsheetText(preferred);
  if (!usedHeaders.has(base)) {
    usedHeaders.add(base);
    return base;
  }
  const withSuffix = sanitizeSpreadsheetText(`${preferred} (${suffix})`);
  if (!usedHeaders.has(withSuffix)) {
    usedHeaders.add(withSuffix);
    return withSuffix;
  }
  for (let counter = 2; ; counter++) {
    const candidate = sanitizeSpreadsheetText(
      `${preferred} (${suffix} ${counter})`,
    );
    if (!usedHeaders.has(candidate)) {
      usedHeaders.add(candidate);
      return candidate;
    }
  }
}

function buildCustomFieldColumns(
  singleFormConfig: ProgramFormConfig | null,
  matchingPrograms: Program[],
  usedHeaders: Set<string>,
): ExportColumn[] {
  if (matchingPrograms.length === 0) {
    if (!singleFormConfig) return [];
    return singleFormConfig.customFields.map((field) => {
      const header = allocateUniqueHeader(field.label, usedHeaders);
      return {
        header,
        wch: customColumnWidth(header),
        value: (item) =>
          sanitizeSpreadsheetText(
            formatCustomResponseValue(item.customResponses?.[field.id]),
          ),
      };
    });
  }

  const programEntries = matchingPrograms.map((program) => ({
    program,
    customFields: normalizeProgramFormConfig(program.registrationFormConfig)
      .customFields,
  }));

  const fieldIdsByLabel = new Map<string, Set<string>>();
  const sharedAllowedPrograms = new Map<string, Set<string>>();
  const labelTitleCounts = new Map<string, number>();
  const labelTitlePeriodCounts = new Map<string, number>();

  for (const { program, customFields } of programEntries) {
    for (const field of customFields) {
      let ids = fieldIdsByLabel.get(field.label);
      if (!ids) {
        ids = new Set();
        fieldIdsByLabel.set(field.label, ids);
      }
      ids.add(field.id);

      const sharedKey = `${field.label}\0${field.id}`;
      let allowed = sharedAllowedPrograms.get(sharedKey);
      if (!allowed) {
        allowed = new Set();
        sharedAllowedPrograms.set(sharedKey, allowed);
      }
      allowed.add(program.id);

      const titleKey = `${field.label}\0${program.title}`;
      labelTitleCounts.set(titleKey, (labelTitleCounts.get(titleKey) ?? 0) + 1);

      const periodKey = `${titleKey}\0${program.period}`;
      labelTitlePeriodCounts.set(
        periodKey,
        (labelTitlePeriodCounts.get(periodKey) ?? 0) + 1,
      );
    }
  }

  const columns: ExportColumn[] = [];
  const emittedShared = new Set<string>();

  for (const { program, customFields } of programEntries) {
    for (const field of customFields) {
      const hasLabelAmbiguity =
        (fieldIdsByLabel.get(field.label)?.size ?? 0) > 1;
      if (!hasLabelAmbiguity) {
        const sharedKey = `${field.label}\0${field.id}`;
        if (emittedShared.has(sharedKey)) continue;
        emittedShared.add(sharedKey);
        const allowed = sharedAllowedPrograms.get(sharedKey)!;
        const header = allocateUniqueHeader(field.label, usedHeaders);
        columns.push({
          header,
          wch: customColumnWidth(header),
          value: (item) =>
            allowed.has(item.programId)
              ? sanitizeSpreadsheetText(
                  formatCustomResponseValue(item.customResponses?.[field.id]),
                )
              : "",
        });
        continue;
      }

      const titleKey = `${field.label}\0${program.title}`;
      const periodKey = `${titleKey}\0${program.period}`;
      let preferred = `${field.label} (${program.title})`;
      if ((labelTitleCounts.get(titleKey) ?? 0) > 1) {
        preferred =
          (labelTitlePeriodCounts.get(periodKey) ?? 0) > 1
            ? `${field.label} (${program.title} [${field.id}])`
            : `${field.label} (${program.title} - ${program.period})`;
      }
      const header = allocateUniqueHeader(preferred, usedHeaders);
      columns.push({
        header,
        wch: customColumnWidth(header),
        value: (item) =>
          item.programId === program.id
            ? sanitizeSpreadsheetText(
                formatCustomResponseValue(item.customResponses?.[field.id]),
              )
            : "",
      });
    }
  }

  return columns;
}

function buildLegacyCustomColumns(
  items: ProgramRegistrationListItem[],
  singleFormConfig: ProgramFormConfig | null,
  matchingPrograms: Program[],
  usedHeaders: Set<string>,
): ExportColumn[] {
  const coveredByProgram = new Map<string, Set<string>>();
  for (const program of matchingPrograms) {
    coveredByProgram.set(
      program.id,
      new Set(
        normalizeProgramFormConfig(
          program.registrationFormConfig,
        ).customFields.map((field: CustomFormField) => field.id),
      ),
    );
  }
  const globalCovered =
    matchingPrograms.length === 0 && singleFormConfig
      ? new Set(singleFormConfig.customFields.map((field) => field.id))
      : null;

  const isCoveredForRow = (item: ProgramRegistrationListItem, key: string) => {
    const programFields = coveredByProgram.get(item.programId);
    if (programFields) return programFields.has(key);
    return globalCovered ? globalCovered.has(key) : false;
  };

  const legacyKeys: string[] = [];
  const seenKeys = new Set<string>();
  for (const item of items) {
    const responses = item.customResponses;
    if (!responses || typeof responses !== "object") continue;
    for (const key of Object.keys(responses)) {
      if (seenKeys.has(key) || isCoveredForRow(item, key)) continue;
      seenKeys.add(key);
      legacyKeys.push(key);
    }
  }

  return legacyKeys.map((key) => {
    const header = allocateUniqueHeader(key, usedHeaders, "Kolom lama");
    return {
      header,
      wch: customColumnWidth(header),
      value: (item) => {
        if (isCoveredForRow(item, key)) return "";
        return sanitizeSpreadsheetText(
          formatCustomResponseValue(item.customResponses?.[key]),
        );
      },
    };
  });
}

export function createProgramRegistrationsWorkbook(
  items: ProgramRegistrationListItem[],
  programsOrFormConfig?: ProgramExportSchemaInput,
): Buffer {
  const { singleFormConfig, matchingPrograms } = resolveSchemaContext(
    items,
    programsOrFormConfig,
  );

  const columns: ExportColumn[] = [
    { header: "No", wch: 5, value: (_item, index) => index + 1 },
    {
      header: "Program Kerja",
      wch: 30,
      value: (item) => sanitizeSpreadsheetText(item.programTitle),
    },
    {
      header: "Periode",
      wch: 14,
      value: (item) => sanitizeSpreadsheetText(item.programPeriod),
    },
    {
      header: "Nama Lengkap",
      wch: 28,
      value: (item) => sanitizeSpreadsheetText(item.nama),
    },
    {
      header: "NIM",
      wch: 15,
      value: (item) => sanitizeSpreadsheetText(item.nim),
    },
  ];

  for (const builtIn of CONFIGURABLE_BUILT_IN_COLUMNS) {
    if (!shouldIncludeBuiltInColumn(builtIn.key, singleFormConfig, items)) {
      continue;
    }
    columns.push({
      header: builtIn.header,
      wch: builtIn.wch,
      value: (item) => sanitizeSpreadsheetText(item[builtIn.key]),
    });
  }

  columns.push({
    header: "Waktu Daftar",
    wch: 26,
    value: (item) =>
      sanitizeSpreadsheetText(
        formatProgramRegistrationTimestamp(item.submittedAt),
      ),
  });

  const usedHeaders = new Set(columns.map((column) => column.header));
  columns.push(
    ...buildCustomFieldColumns(singleFormConfig, matchingPrograms, usedHeaders),
    ...buildLegacyCustomColumns(
      items,
      singleFormConfig,
      matchingPrograms,
      usedHeaders,
    ),
  );

  const rows = items.map((item, index) =>
    columns.map((column) => column.value(item, index)),
  );

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    columns.map((column) => column.header),
    ...rows,
  ]);
  sheet["!cols"] = columns.map((column) => ({ wch: column.wch }));

  XLSX.utils.book_append_sheet(workbook, sheet, "Peserta Program");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
