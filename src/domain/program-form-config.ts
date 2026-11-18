import { text, ValidationError } from "./admin";

export const BUILT_IN_FIELD_MODES = {
  required: "Wajib",
  optional: "Opsional",
  hidden: "Disembunyikan",
} as const;

export type BuiltInFieldMode = keyof typeof BUILT_IN_FIELD_MODES;

export const CONFIGURABLE_BUILT_IN_FIELDS = {
  angkatan: "Angkatan",
  noHp: "Nomor HP / WhatsApp",
  idLine: "ID LINE",
  email: "Email",
  catatan: "Catatan untuk Panitia",
} as const;

export type BuiltInFieldKey = keyof typeof CONFIGURABLE_BUILT_IN_FIELDS;

export const CUSTOM_FIELD_TYPES = {
  text: "Teks singkat",
  textarea: "Paragraf",
  number: "Angka",
  select: "Pilihan dropdown",
  checkbox: "Kotak centang",
  date: "Tanggal",
} as const;

export type CustomFieldType = keyof typeof CUSTOM_FIELD_TYPES;

export type CustomFormField = {
  id: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  placeholder: string;
  options: string[];
};

export type ProgramFormConfig = {
  builtInFields: Record<BuiltInFieldKey, BuiltInFieldMode>;
  customFields: CustomFormField[];
};

export type ProgramCustomResponses = Record<string, string | boolean>;

export const DEFAULT_PROGRAM_FORM_CONFIG: ProgramFormConfig = {
  builtInFields: {
    angkatan: "required",
    noHp: "required",
    idLine: "required",
    email: "optional",
    catatan: "optional",
  },
  customFields: [],
};

const CONTROL_CHAR_PATTERN = /[\u0000-\u001F\u007F]/;
const CUSTOM_FIELD_ID_PATTERN = /^[a-zA-Z0-9_-]{2,40}$/;
const RESERVED_OBJECT_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const MAX_CUSTOM_FIELDS = 20;
const MAX_SELECT_OPTIONS = 30;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function cloneDefaultProgramFormConfig(): ProgramFormConfig {
  return {
    builtInFields: { ...DEFAULT_PROGRAM_FORM_CONFIG.builtInFields },
    customFields: [],
  };
}

function singleLineConfigText(
  value: unknown,
  label: string,
  min: number,
  max: number,
  required: boolean,
): string {
  if (typeof value === "string" && CONTROL_CHAR_PATTERN.test(value)) {
    throw new ValidationError(
      `${label} tidak boleh mengandung karakter kontrol.`,
    );
  }
  const parsed = text(value, label, max, required);
  if (!parsed) return "";
  if (parsed.length < min) {
    throw new ValidationError(`${label} minimal ${min} karakter.`);
  }
  return parsed;
}

function validateBuiltInFields(
  raw: unknown,
): Record<BuiltInFieldKey, BuiltInFieldMode> {
  const result = { ...DEFAULT_PROGRAM_FORM_CONFIG.builtInFields };
  if (raw === undefined) return result;
  if (!isPlainObject(raw)) {
    throw new ValidationError(
      "Pengaturan kolom bawaan formulir harus berupa objek.",
    );
  }
  for (const key of Object.keys(raw)) {
    if (!Object.hasOwn(CONFIGURABLE_BUILT_IN_FIELDS, key)) {
      throw new ValidationError(`Kolom bawaan "${key}" tidak dapat diubah.`);
    }
  }
  for (const key of Object.keys(
    CONFIGURABLE_BUILT_IN_FIELDS,
  ) as BuiltInFieldKey[]) {
    if (!Object.hasOwn(raw, key) || raw[key] === undefined) continue;
    const mode = raw[key];
    if (typeof mode !== "string" || !Object.hasOwn(BUILT_IN_FIELD_MODES, mode)) {
      throw new ValidationError(
        `Mode kolom "${CONFIGURABLE_BUILT_IN_FIELDS[key]}" tidak valid.`,
      );
    }
    result[key] = mode as BuiltInFieldMode;
  }
  return result;
}

function validateSelectOptions(rawOptions: unknown, label: string): string[] {
  if (!Array.isArray(rawOptions)) {
    throw new ValidationError(
      `Pilihan dropdown pada kolom "${label}" harus berupa daftar.`,
    );
  }
  if (rawOptions.length < 1 || rawOptions.length > MAX_SELECT_OPTIONS) {
    throw new ValidationError(
      `Kolom dropdown "${label}" harus memiliki 1 sampai ${MAX_SELECT_OPTIONS} pilihan.`,
    );
  }
  const options: string[] = [];
  const seen = new Set<string>();
  for (const entry of rawOptions) {
    const option = singleLineConfigText(
      entry,
      `Pilihan dropdown pada kolom "${label}"`,
      1,
      80,
      true,
    );
    if (seen.has(option)) {
      throw new ValidationError(
        `Pilihan "${option}" pada kolom "${label}" tidak boleh duplikat.`,
      );
    }
    seen.add(option);
    options.push(option);
  }
  return options;
}

function validateCustomField(
  raw: unknown,
  index: number,
  seenIds: Set<string>,
): CustomFormField {
  if (!isPlainObject(raw)) {
    throw new ValidationError(`Kolom tambahan ke-${index + 1} tidak valid.`);
  }
  const id = singleLineConfigText(
    raw.id,
    `ID kolom tambahan ke-${index + 1}`,
    2,
    40,
    true,
  );
  if (RESERVED_OBJECT_KEYS.has(id) || !CUSTOM_FIELD_ID_PATTERN.test(id)) {
    throw new ValidationError(
      `ID kolom "${id}" hanya boleh berisi huruf, angka, tanda hubung, atau garis bawah (2-40 karakter).`,
    );
  }
  if (seenIds.has(id)) {
    throw new ValidationError(`ID kolom "${id}" tidak boleh duplikat.`);
  }
  seenIds.add(id);

  const label = singleLineConfigText(
    raw.label,
    `Label kolom tambahan ke-${index + 1}`,
    2,
    80,
    true,
  );
  const type = raw.type;
  if (typeof type !== "string" || !Object.hasOwn(CUSTOM_FIELD_TYPES, type)) {
    throw new ValidationError(`Tipe kolom "${label}" tidak dikenal.`);
  }

  let required = false;
  if (raw.required !== undefined) {
    if (typeof raw.required !== "boolean") {
      throw new ValidationError(
        `Status wajib pada kolom "${label}" harus berupa boolean.`,
      );
    }
    required = raw.required;
  }

  const placeholder = singleLineConfigText(
    raw.placeholder,
    `Placeholder kolom "${label}"`,
    1,
    120,
    false,
  );

  const fieldType = type as CustomFieldType;
  const options =
    fieldType === "select" ? validateSelectOptions(raw.options, label) : [];

  return {
    id,
    label,
    type: fieldType,
    required,
    placeholder,
    options,
  };
}

export function validateProgramFormConfig(raw: unknown): ProgramFormConfig {
  if (!isPlainObject(raw)) {
    throw new ValidationError(
      "Konfigurasi formulir pendaftaran harus berupa objek.",
    );
  }
  const builtInFields = validateBuiltInFields(raw.builtInFields);
  if (raw.customFields === undefined) {
    return { builtInFields, customFields: [] };
  }
  if (!Array.isArray(raw.customFields)) {
    throw new ValidationError(
      "Daftar kolom tambahan formulir harus berupa array.",
    );
  }
  if (raw.customFields.length > MAX_CUSTOM_FIELDS) {
    throw new ValidationError(
      `Kolom tambahan formulir maksimal ${MAX_CUSTOM_FIELDS} kolom.`,
    );
  }
  const seenIds = new Set<string>();
  const customFields = raw.customFields.map((entry, index) =>
    validateCustomField(entry, index, seenIds),
  );
  return { builtInFields, customFields };
}

function parseJsonIfString(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function normalizeProgramFormConfig(raw: unknown): ProgramFormConfig {
  const parsed = parseJsonIfString(raw);
  if (!isPlainObject(parsed)) return cloneDefaultProgramFormConfig();

  const builtInFields = { ...DEFAULT_PROGRAM_FORM_CONFIG.builtInFields };
  if (isPlainObject(parsed.builtInFields)) {
    for (const key of Object.keys(
      CONFIGURABLE_BUILT_IN_FIELDS,
    ) as BuiltInFieldKey[]) {
      if (!Object.hasOwn(parsed.builtInFields, key)) continue;
      const mode = parsed.builtInFields[key];
      if (
        typeof mode === "string" &&
        Object.hasOwn(BUILT_IN_FIELD_MODES, mode)
      ) {
        builtInFields[key] = mode as BuiltInFieldMode;
      }
    }
  }

  const customFields: CustomFormField[] = [];
  const seenIds = new Set<string>();
  if (Array.isArray(parsed.customFields)) {
    for (const entry of parsed.customFields) {
      if (customFields.length >= MAX_CUSTOM_FIELDS) break;
      if (!isPlainObject(entry)) continue;
      if (typeof entry.id !== "string" || CONTROL_CHAR_PATTERN.test(entry.id)) {
        continue;
      }
      const id = entry.id.trim();
      if (
        !id ||
        RESERVED_OBJECT_KEYS.has(id) ||
        !CUSTOM_FIELD_ID_PATTERN.test(id) ||
        seenIds.has(id)
      ) {
        continue;
      }
      if (
        typeof entry.label !== "string" ||
        CONTROL_CHAR_PATTERN.test(entry.label)
      ) {
        continue;
      }
      const label = entry.label.trim();
      if (label.length < 2 || label.length > 80) continue;
      if (
        typeof entry.type !== "string" ||
        !Object.hasOwn(CUSTOM_FIELD_TYPES, entry.type)
      ) {
        continue;
      }
      const type = entry.type as CustomFieldType;
      const placeholder =
        typeof entry.placeholder === "string" &&
        !CONTROL_CHAR_PATTERN.test(entry.placeholder)
          ? entry.placeholder.trim().slice(0, 120)
          : "";

      let options: string[] = [];
      if (type === "select") {
        if (!Array.isArray(entry.options)) continue;
        const seenOptions = new Set<string>();
        options = [];
        for (const opt of entry.options) {
          if (options.length >= MAX_SELECT_OPTIONS) break;
          if (typeof opt !== "string" || CONTROL_CHAR_PATTERN.test(opt)) {
            continue;
          }
          const trimmedOpt = opt.trim();
          if (
            trimmedOpt.length < 1 ||
            trimmedOpt.length > 80 ||
            seenOptions.has(trimmedOpt)
          ) {
            continue;
          }
          seenOptions.add(trimmedOpt);
          options.push(trimmedOpt);
        }
        if (!options.length) continue;
      }

      seenIds.add(id);
      customFields.push({
        id,
        label,
        type,
        required: entry.required === true,
        placeholder,
        options,
      });
    }
  }

  return { builtInFields, customFields };
}

export function normalizeStoredCustomResponses(
  raw: unknown,
): ProgramCustomResponses {
  const parsed = parseJsonIfString(raw);
  if (!isPlainObject(parsed)) return {};
  const result: ProgramCustomResponses = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (
      !key ||
      key.length > 64 ||
      CONTROL_CHAR_PATTERN.test(key) ||
      RESERVED_OBJECT_KEYS.has(key)
    ) {
      continue;
    }
    if (typeof value === "boolean") {
      result[key] = value;
    } else if (typeof value === "string") {
      result[key] = value;
    } else if (typeof value === "number" && Number.isFinite(value)) {
      result[key] = String(value);
    }
  }
  return result;
}

export function formatCustomResponseValue(
  value: string | boolean | undefined,
): string {
  if (value === true) return "Ya";
  if (value === false) return "Tidak";
  if (typeof value === "string") return value.trim();
  return "";
}
