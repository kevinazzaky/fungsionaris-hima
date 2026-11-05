import { previewRegistrationImport } from "../domain/registration-import";
import { ValidationError, validatePeriod } from "../domain/admin";
import type { RegistrationImportRepository } from "../domain/repositories";

export async function importRegistrations(
  repository: RegistrationImportRepository,
  rows: unknown,
  periodValue: unknown,
  commit: boolean,
) {
  const period = validatePeriod(periodValue);
  const preview = previewRegistrationImport(rows, period);
  const existing = new Set(
    await repository.existingNims(
      preview.valid.map((row) => row.nim),
      period,
    ),
  );
  const ready = preview.valid.filter((row) => !existing.has(row.nim));
  if (commit && preview.issues.length > 0) {
    throw new ValidationError(
      "Perbaiki semua baris bermasalah sebelum menyimpan impor.",
    );
  }
  const imported =
    commit && ready.length ? await repository.insertImported(ready) : 0;
  return {
    total: preview.total,
    ready: ready.length,
    duplicates: existing.size,
    issues: preview.issues,
    ignoredColumns: preview.ignoredColumns,
    sample: ready
      .slice(0, 10)
      .map(({ nama, nim, angkatan, divisi, submittedAt }) => ({
        nama,
        nim,
        angkatan,
        divisi,
        submittedAt,
      })),
    imported,
  };
}
