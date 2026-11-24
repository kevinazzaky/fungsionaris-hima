"use client";

import { useState } from "react";
import {
  BUILT_IN_FIELD_MODES,
  CONFIGURABLE_BUILT_IN_FIELDS,
  CUSTOM_FIELD_TYPES,
  type BuiltInFieldKey,
  type BuiltInFieldMode,
  type CustomFieldType,
  type CustomFormField,
  type ProgramFormConfig,
} from "@/domain/program-form-config";

const MAX_CUSTOM_FIELDS = 20;
const TYPES_WITH_PLACEHOLDER = new Set<CustomFieldType>([
  "text",
  "textarea",
  "number",
]);

let fallbackIdCounter = 0;

export function createCustomFieldId(existingIds: Iterable<string>): string {
  const used = new Set(existingIds);
  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix =
      typeof globalThis.crypto?.randomUUID === "function"
        ? globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 8)
        : `${Date.now().toString(36)}${(++fallbackIdCounter).toString(36)}`;
    const candidate = `cf_${suffix}`;
    if (!used.has(candidate)) return candidate;
  }
  let index = used.size + 1;
  while (used.has(`cf_${index}`)) index++;
  return `cf_${index}`;
}

export function parseSelectOptionsText(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function moveCustomField(
  fields: CustomFormField[],
  fromIndex: number,
  direction: -1 | 1,
): CustomFormField[] {
  const toIndex = fromIndex + direction;
  if (
    fromIndex < 0 ||
    fromIndex >= fields.length ||
    toIndex < 0 ||
    toIndex >= fields.length
  ) {
    return fields;
  }
  const next = [...fields];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

type OptionDraft = {
  raw: string;
  parsedKey: string;
};

export type ProgramFormBuilderProps = {
  value: ProgramFormConfig;
  onChange: (next: ProgramFormConfig) => void;
  disabled?: boolean;
};

export function ProgramFormBuilder({
  value,
  onChange,
  disabled = false,
}: ProgramFormBuilderProps) {
  // Keep raw newline text while typing so trailing newlines are not stripped mid-edit.
  const [optionDrafts, setOptionDrafts] = useState<Record<string, OptionDraft>>(
    {},
  );

  function updateBuiltInMode(key: BuiltInFieldKey, mode: BuiltInFieldMode) {
    if (key === "angkatan" && Boolean(value.cohortQuotas?.enabled)) {
      return;
    }
    onChange({
      ...value,
      builtInFields: {
        ...value.builtInFields,
        [key]: mode,
      },
    });
  }

  function updateField(index: number, patch: Partial<CustomFormField>) {
    onChange({
      ...value,
      customFields: value.customFields.map((field, idx) =>
        idx === index ? { ...field, ...patch } : field,
      ),
    });
  }

  function addCustomField() {
    if (value.customFields.length >= MAX_CUSTOM_FIELDS) return;
    const newField: CustomFormField = {
      id: createCustomFieldId(value.customFields.map((field) => field.id)),
      label: "",
      type: "text",
      required: false,
      placeholder: "",
      options: [],
    };
    onChange({
      ...value,
      customFields: [...value.customFields, newField],
    });
  }

  function removeField(index: number) {
    const target = value.customFields[index];
    if (target) {
      clearOptionDraft(target.id);
    }
    onChange({
      ...value,
      customFields: value.customFields.filter((_, idx) => idx !== index),
    });
  }

  function moveField(index: number, direction: -1 | 1) {
    onChange({
      ...value,
      customFields: moveCustomField(value.customFields, index, direction),
    });
  }

  function handleTypeChange(index: number, nextType: CustomFieldType) {
    const field = value.customFields[index];
    if (!field) return;
    if (nextType !== "select") {
      clearOptionDraft(field.id);
    }
    updateField(index, {
      type: nextType,
      placeholder: TYPES_WITH_PLACEHOLDER.has(nextType)
        ? field.placeholder
        : "",
      options: nextType === "select" ? field.options : [],
    });
  }

  function clearOptionDraft(fieldId: string) {
    setOptionDrafts((prev) => {
      if (!Object.hasOwn(prev, fieldId)) return prev;
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }

  function handleOptionsChange(index: number, fieldId: string, raw: string) {
    const parsed = parseSelectOptionsText(raw);
    setOptionDrafts((prev) => ({
      ...prev,
      [fieldId]: {
        raw,
        parsedKey: parsed.join("\n"),
      },
    }));
    updateField(index, { options: parsed });
  }

  const atLimit = value.customFields.length >= MAX_CUSTOM_FIELDS;

  return (
    <section
      className="admin-form-builder"
      aria-label="Pengaturan formulir pendaftaran"
    >
      <div className="admin-form-builder-section">
        <h3>Kolom bawaan formulir</h3>
        <p className="admin-meta">
          Nama lengkap dan NIM selalu wajib sebagai identitas unik peserta.
        </p>
        <div className="admin-form-builder-builtin-grid">
          {(
            Object.entries(CONFIGURABLE_BUILT_IN_FIELDS) as [
              BuiltInFieldKey,
              string,
            ][]
          ).map(([key, label]) => {
            const cohortQuotaLocked =
              key === "angkatan" && Boolean(value.cohortQuotas?.enabled);
            return (
              <label key={key} className="admin-form-builder-builtin-item">
                <span>{label}</span>
                <select
                  aria-label={`Status kolom ${label}`}
                  disabled={disabled || cohortQuotaLocked}
                  value={cohortQuotaLocked ? "required" : value.builtInFields[key]}
                  onChange={(event) =>
                    updateBuiltInMode(key, event.target.value as BuiltInFieldMode)
                  }
                >
                  {(
                    Object.entries(BUILT_IN_FIELD_MODES) as [
                      BuiltInFieldMode,
                      string,
                    ][]
                  ).map(([modeKey, modeLabel]) => (
                    <option key={modeKey} value={modeKey}>
                      {modeLabel}
                    </option>
                  ))}
                </select>
                {cohortQuotaLocked && (
                  <small>Dikunci ke Wajib selama kuota per angkatan aktif.</small>
                )}
              </label>
            );
          })}
        </div>
      </div>

      <div className="admin-form-builder-section">
        <div className="admin-form-builder-header">
          <div>
            <h3>Pertanyaan tambahan custom</h3>
            <p className="admin-meta">
              {`${value.customFields.length} dari ${MAX_CUSTOM_FIELDS} pertanyaan tambahan`}
            </p>
          </div>
          <button
            type="button"
            className="admin-button"
            disabled={disabled || atLimit}
            onClick={addCustomField}
          >
            + Tambah pertanyaan
          </button>
        </div>

        {atLimit && (
          <p className="admin-meta">
            Maksimal 20 pertanyaan tambahan sudah tercapai.
          </p>
        )}

        {value.customFields.length === 0 ? (
          <p className="admin-form-builder-empty">
            Belum ada pertanyaan tambahan. Gunakan tombol + Tambah pertanyaan
            jika panitia membutuhkan kolom di luar data bawaan.
          </p>
        ) : (
          <div className="admin-custom-field-list">
            {value.customFields.map((field, index) => {
              const canonicalOptions = field.options.join("\n");
              const draft = optionDrafts[field.id];
              const optionsValue =
                draft && draft.parsedKey === canonicalOptions
                  ? draft.raw
                  : canonicalOptions;

              return (
                <article key={field.id} className="admin-custom-field-card">
                  <div className="admin-custom-field-card-header">
                    <strong>{`Pertanyaan ${index + 1}`}</strong>
                    <div className="admin-actions">
                      <button
                        type="button"
                        className="admin-button"
                        disabled={disabled || index === 0}
                        aria-label={`Naikkan pertanyaan ${index + 1}`}
                        onClick={() => moveField(index, -1)}
                      >
                        Naik
                      </button>
                      <button
                        type="button"
                        className="admin-button"
                        disabled={
                          disabled || index === value.customFields.length - 1
                        }
                        aria-label={`Turunkan pertanyaan ${index + 1}`}
                        onClick={() => moveField(index, 1)}
                      >
                        Turun
                      </button>
                      <button
                        type="button"
                        className="admin-button danger"
                        disabled={disabled}
                        aria-label={`Hapus pertanyaan ${index + 1}`}
                        onClick={() => removeField(index)}
                      >
                        Hapus
                      </button>
                    </div>
                  </div>

                  <div className="admin-form-columns">
                    <label>
                      Label pertanyaan
                      <input
                        type="text"
                        required
                        minLength={2}
                        maxLength={80}
                        disabled={disabled}
                        value={field.label}
                        placeholder="Contoh: Asal instansi atau ukuran kaos"
                        onChange={(event) =>
                          updateField(index, { label: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      Tipe input
                      <select
                        disabled={disabled}
                        value={field.type}
                        onChange={(event) =>
                          handleTypeChange(
                            index,
                            event.target.value as CustomFieldType,
                          )
                        }
                      >
                        {(
                          Object.entries(CUSTOM_FIELD_TYPES) as [
                            CustomFieldType,
                            string,
                          ][]
                        ).map(([typeKey, typeLabel]) => (
                          <option key={typeKey} value={typeKey}>
                            {typeLabel}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="admin-check">
                    <input
                      type="checkbox"
                      disabled={disabled}
                      checked={field.required}
                      onChange={(event) =>
                        updateField(index, {
                          required: event.currentTarget.checked,
                        })
                      }
                    />
                    Wajib diisi
                  </label>

                  {TYPES_WITH_PLACEHOLDER.has(field.type) && (
                    <label>
                      Placeholder / petunjuk (opsional)
                      <input
                        type="text"
                        maxLength={120}
                        disabled={disabled}
                        value={field.placeholder}
                        placeholder="Petunjuk singkat di dalam kolom input"
                        onChange={(event) =>
                          updateField(index, {
                            placeholder: event.target.value,
                          })
                        }
                      />
                    </label>
                  )}

                  {field.type === "select" && (
                    <label>
                      Daftar pilihan (satu per baris)
                      <textarea
                        rows={3}
                        required
                        disabled={disabled}
                        value={optionsValue}
                        placeholder={"Pilihan 1\nPilihan 2"}
                        onChange={(event) =>
                          handleOptionsChange(
                            index,
                            field.id,
                            event.target.value,
                          )
                        }
                        onBlur={() => clearOptionDraft(field.id)}
                      />
                      <small>
                        Minimal 1 pilihan, maksimal 30 pilihan tanpa duplikat.
                      </small>
                    </label>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
