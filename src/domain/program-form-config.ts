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

export const MAX_COHORT_TIERS = 20;

export type CohortQuotaTier = {
  angkatan: string;
  maxQuota: number;
};

export type CohortQuotaConfig = {
  enabled: boolean;
  tiers: CohortQuotaTier[];
};

export type CohortQuotaSummaryItem = {
  angkatan: string;
  maxQuota: number;
  registered: number;
  remaining: number;
  isFull: boolean;
};

export type CohortQuotaSummary = {
  enabled: boolean;
  items: CohortQuotaSummaryItem[];
  allFull: boolean;
};

export type ProgramFormConfig = {
  builtInFields: Record<BuiltInFieldKey, BuiltInFieldMode>;
  customFields: CustomFormField[];
  cohortQuotas?: CohortQuotaConfig;
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
const COHORT_YEAR_PATTERN = /^(19|20)\d{2}$/;
const RESERVED_OBJECT_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const MAX_CUSTOM_FIELDS = 20;
const MAX_SELECT_OPTIONS = 30;
const MAX_COHORT_QUOTA_VALUE = 2147483647;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function cloneDefaultProgramFormConfig(): ProgramFormConfig {
  return {
    builtInFields: { ...DEFAULT_PROGRAM_FORM_CONFIG.builtInFields },
    customFields: [],
  };
}

export function resolveCohortQuotaConfig(
  config?: ProgramFormConfig | null,
): CohortQuotaConfig {
  const tiers = config?.cohortQuotas?.tiers
    ? config.cohortQuotas.tiers.map((tier) => ({ ...tier }))
    : [];
  return {
    enabled: Boolean(config?.cohortQuotas?.enabled && tiers.length > 0),
    tiers,
  };
}

export function buildCohortQuotaSummary(
  formConfig: ProgramFormConfig,
  cohortCounts: Record<string, number> = {},
): CohortQuotaSummary {
  const resolved = resolveCohortQuotaConfig(formConfig);
  const items = resolved.tiers.map((tier) => {
    const rawCount = Object.hasOwn(cohortCounts, tier.angkatan)
      ? cohortCounts[tier.angkatan]
      : 0;
    const registered =
      typeof rawCount === "number" && Number.isFinite(rawCount)
        ? Math.max(0, Math.floor(rawCount))
        : 0;
    const remaining = Math.max(0, tier.maxQuota - registered);
    const isFull = registered >= tier.maxQuota;
    return {
      angkatan: tier.angkatan,
      maxQuota: tier.maxQuota,
      registered,
      remaining,
      isFull,
    };
  });
  const enabled = resolved.enabled;
  const allFull =
    enabled && items.length > 0 && items.every((item) => item.isFull);
  return {
    enabled,
    items,
    allFull,
  };
}

export function createPresetCohortTiers(
  startYear = 2023,
  endYear = 2026,
  maxQuota = 5,
): CohortQuotaTier[] {
  const tiers: CohortQuotaTier[] = [];
  for (
    let year = startYear;
    year <= endYear && tiers.length < MAX_COHORT_TIERS;
    year += 1
  ) {
    tiers.push({ angkatan: String(year), maxQuota });
  }
  return tiers;
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

function parseOptionalCohortMaxQuota(value: unknown): number | null {
  if (typeof value === "string") {
    if (CONTROL_CHAR_PATTERN.test(value)) return null;
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) return null;
    const parsed = Number(trimmed);
    if (
      !Number.isSafeInteger(parsed) ||
      parsed < 1 ||
      parsed > MAX_COHORT_QUOTA_VALUE
    ) {
      return null;
    }
    return parsed;
  }
  if (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= MAX_COHORT_QUOTA_VALUE
  ) {
    return value;
  }
  return null;
}

function validateCohortMaxQuota(value: unknown, angkatan: string): number {
  if (typeof value === "string" && CONTROL_CHAR_PATTERN.test(value)) {
    throw new ValidationError(
      `Kuota angkatan ${angkatan} tidak boleh mengandung karakter kontrol.`,
    );
  }
  const parsed = parseOptionalCohortMaxQuota(value);
  if (parsed === null) {
    throw new ValidationError(
      `Kuota angkatan ${angkatan} harus berupa bilangan bulat antara 1 dan ${MAX_COHORT_QUOTA_VALUE}.`,
    );
  }
  return parsed;
}

function validateCohortQuotas(
  raw: unknown,
  builtInFields: Record<BuiltInFieldKey, BuiltInFieldMode>,
): CohortQuotaConfig | undefined {
  if (raw === undefined) return undefined;
  if (!isPlainObject(raw)) {
    throw new ValidationError(
      "Pengaturan kuota per angkatan harus berupa objek.",
    );
  }

  let enabled = false;
  if (raw.enabled !== undefined) {
    if (typeof raw.enabled !== "boolean") {
      throw new ValidationError(
        "Status aktif kuota per angkatan harus berupa boolean.",
      );
    }
    enabled = raw.enabled;
  }

  const rawTiers = raw.tiers === undefined ? [] : raw.tiers;
  if (!Array.isArray(rawTiers)) {
    throw new ValidationError(
      "Daftar kuota per angkatan harus berupa array.",
    );
  }
  if (rawTiers.length > MAX_COHORT_TIERS) {
    throw new ValidationError(
      `Kuota per angkatan maksimal ${MAX_COHORT_TIERS} angkatan.`,
    );
  }

  const seenAngkatan = new Set<string>();
  const tiers: CohortQuotaTier[] = [];
  for (let index = 0; index < rawTiers.length; index += 1) {
    const entry = rawTiers[index];
    if (!isPlainObject(entry)) {
      throw new ValidationError(`Kuota angkatan ke-${index + 1} tidak valid.`);
    }
    const angkatan = singleLineConfigText(
      entry.angkatan,
      `Angkatan ke-${index + 1}`,
      4,
      4,
      true,
    );
    if (!COHORT_YEAR_PATTERN.test(angkatan)) {
      throw new ValidationError("Angkatan harus berupa tahun empat digit.");
    }
    if (seenAngkatan.has(angkatan)) {
      throw new ValidationError(`Angkatan ${angkatan} tidak boleh duplikat.`);
    }
    seenAngkatan.add(angkatan);
    const maxQuota = validateCohortMaxQuota(entry.maxQuota, angkatan);
    tiers.push({ angkatan, maxQuota });
  }

  tiers.sort((a, b) => Number(a.angkatan) - Number(b.angkatan));

  if (enabled) {
    if (tiers.length < 1) {
      throw new ValidationError(
        "Tambahkan minimal 1 angkatan sebelum mengaktifkan kuota per angkatan.",
      );
    }
    if (builtInFields.angkatan !== "required") {
      throw new ValidationError(
        "Kolom bawaan Angkatan wajib diatur Wajib saat kuota per angkatan aktif.",
      );
    }
  }

  if (!enabled && tiers.length === 0) return undefined;
  return { enabled, tiers };
}

export function validateProgramFormConfig(raw: unknown): ProgramFormConfig {
  if (!isPlainObject(raw)) {
    throw new ValidationError(
      "Konfigurasi formulir pendaftaran harus berupa objek.",
    );
  }
  const builtInFields = validateBuiltInFields(raw.builtInFields);
  let customFields: CustomFormField[] = [];
  if (raw.customFields !== undefined) {
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
    customFields = raw.customFields.map((entry, index) =>
      validateCustomField(entry, index, seenIds),
    );
  }
  const cohortQuotas = validateCohortQuotas(raw.cohortQuotas, builtInFields);
  const result: ProgramFormConfig = { builtInFields, customFields };
  if (cohortQuotas) {
    result.cohortQuotas = cohortQuotas;
  }
  return result;
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

  let cohortQuotas: CohortQuotaConfig | undefined;
  if (isPlainObject(parsed.cohortQuotas)) {
    const tiers: CohortQuotaTier[] = [];
    const seenAngkatan = new Set<string>();
    if (Array.isArray(parsed.cohortQuotas.tiers)) {
      for (const entry of parsed.cohortQuotas.tiers) {
        if (tiers.length >= MAX_COHORT_TIERS) break;
        if (!isPlainObject(entry)) continue;
        if (
          typeof entry.angkatan !== "string" ||
          CONTROL_CHAR_PATTERN.test(entry.angkatan)
        ) {
          continue;
        }
        const angkatan = entry.angkatan.trim();
        if (
          !COHORT_YEAR_PATTERN.test(angkatan) ||
          seenAngkatan.has(angkatan)
        ) {
          continue;
        }
        const maxQuota = parseOptionalCohortMaxQuota(entry.maxQuota);
        if (maxQuota === null) continue;
        seenAngkatan.add(angkatan);
        tiers.push({ angkatan, maxQuota });
      }
    }
    tiers.sort((a, b) => Number(a.angkatan) - Number(b.angkatan));
    const enabled = parsed.cohortQuotas.enabled === true && tiers.length > 0;
    if (enabled) {
      builtInFields.angkatan = "required";
    }
    if (enabled || tiers.length > 0) {
      cohortQuotas = { enabled, tiers };
    }
  }

  const result: ProgramFormConfig = { builtInFields, customFields };
  if (cohortQuotas) {
    result.cohortQuotas = cohortQuotas;
  }
  return result;
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
