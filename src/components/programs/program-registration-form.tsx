"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowSquareOut,
  CalendarBlank,
  CheckCircle,
  Clock,
  Printer,
  Users,
  Warning,
} from "@phosphor-icons/react/dist/ssr";
import Link from "@/components/ui/navigation-link";
import { PendingLabel } from "@/components/ui/pending-label";
import { ValidationError } from "@/domain/admin";
import {
  formatCustomResponseValue,
  normalizeProgramFormConfig,
  resolveCohortQuotaConfig,
  type CustomFormField,
  type ProgramCustomResponses,
  type ProgramFormConfig,
} from "@/domain/program-form-config";
import type { Program } from "@/domain/programs";
import {
  validateProgramRegistrationInput,
  type ProgramRegistrationInput,
} from "@/domain/program-registrations";

const ANGKATAN_OPTIONS = [
  "2020",
  "2021",
  "2022",
  "2023",
  "2024",
  "2025",
  "2026",
] as const;

const INPUT_CLASS =
  "min-h-[44px] w-full min-w-0 rounded-xl border border-zinc-500 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-600 transition-colors focus-visible:border-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 disabled:bg-zinc-100 disabled:text-zinc-600";

const TEXTAREA_CLASS =
  "min-h-[44px] w-full min-w-0 rounded-xl border border-zinc-500 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-600 transition-colors focus-visible:border-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 disabled:bg-zinc-100 disabled:text-zinc-600";

export type ProgramRegistrationFormProps = {
  program: Program;
  registeredCount: number;
  cohortCounts?: Record<string, number>;
  configured: boolean;
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

export type RegistrationResult = {
  registration: {
    id: string;
    programId: string;
    nama: string;
    nim: string;
    angkatan: string;
    submittedAt: string;
  };
  programTitle: string;
  registrationGroupLink: string;
  submittedNoHp: string;
  submittedIdLine: string;
  submittedEmail: string;
  submittedCatatan: string;
  submittedCustomResponses: ProgramCustomResponses;
};

export type RegistrationSummaryField = {
  key: string;
  label: string;
  value: string;
  multiline?: boolean;
};

export type RawRegistrationFormState = {
  nama: string;
  nim: string;
  angkatan: string;
  noHp: string;
  idLine: string;
  email: string;
  catatan: string;
  customValues: ProgramCustomResponses;
};

function isSafeHttpUrl(value: string): boolean {
  if (!value) return false;
  try {
    const protocol = new URL(value).protocol;
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

function formatSubmittedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Baru saja";
  return (
    new Intl.DateTimeFormat("id-ID", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Asia/Makassar",
    }).format(date) + " WITA"
  );
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

export function validateAndBuildRegistrationPayload(
  programId: string,
  state: RawRegistrationFormState,
  formConfig: ProgramFormConfig,
  cohortCounts?: Record<string, number>,
): ProgramRegistrationInput & { programId: string } {
  const { builtInFields, customFields } = formConfig;
  const cohortSummary = buildCohortQuotaSummary(formConfig, cohortCounts);
  const customResponses: ProgramCustomResponses = {};
  for (const field of customFields) {
    const raw = Object.hasOwn(state.customValues, field.id)
      ? state.customValues[field.id]
      : undefined;
    customResponses[field.id] =
      field.type === "checkbox"
        ? Boolean(raw)
        : typeof raw === "string"
          ? raw
          : "";
  }

  const validated = validateProgramRegistrationInput(
    {
      nama: state.nama,
      nim: state.nim,
      angkatan:
        builtInFields.angkatan === "hidden" && !cohortSummary.enabled
          ? ""
          : state.angkatan,
      noHp: builtInFields.noHp === "hidden" ? "" : state.noHp,
      idLine: builtInFields.idLine === "hidden" ? "" : state.idLine,
      email: builtInFields.email === "hidden" ? "" : state.email,
      catatan: builtInFields.catatan === "hidden" ? "" : state.catatan,
      customResponses,
    },
    formConfig,
  );

  if (cohortSummary.enabled) {
    const selectedCohort = cohortSummary.items.find(
      (item) => item.angkatan === validated.angkatan,
    );
    if (selectedCohort?.isFull) {
      throw new ValidationError(
        `Kuota pendaftaran untuk angkatan ${selectedCohort.angkatan} sudah penuh (${selectedCohort.registered}/${selectedCohort.maxQuota} peserta).`,
      );
    }
  }

  return {
    programId,
    ...validated,
  };
}

export function buildRegistrationSummaryFields(
  result: RegistrationResult,
  formConfig: ProgramFormConfig,
): RegistrationSummaryField[] {
  const { builtInFields, customFields } = formConfig;
  const fields: RegistrationSummaryField[] = [
    {
      key: "nama",
      label: "Nama Lengkap",
      value: result.registration.nama,
    },
    {
      key: "nim",
      label: "NIM",
      value: result.registration.nim,
    },
  ];

  if (builtInFields.angkatan !== "hidden" && result.registration.angkatan) {
    fields.push({
      key: "angkatan",
      label: "Angkatan",
      value: result.registration.angkatan,
    });
  }
  if (builtInFields.noHp !== "hidden" && result.submittedNoHp) {
    fields.push({
      key: "noHp",
      label: "Nomor HP / WA",
      value: result.submittedNoHp,
    });
  }
  if (builtInFields.idLine !== "hidden" && result.submittedIdLine) {
    fields.push({
      key: "idLine",
      label: "ID LINE",
      value: result.submittedIdLine,
    });
  }
  if (builtInFields.email !== "hidden" && result.submittedEmail) {
    fields.push({
      key: "email",
      label: "Email",
      value: result.submittedEmail,
    });
  }
  if (builtInFields.catatan !== "hidden" && result.submittedCatatan) {
    fields.push({
      key: "catatan",
      label: "Catatan untuk Panitia",
      value: result.submittedCatatan,
      multiline: true,
    });
  }

  for (const field of customFields) {
    const formatted = formatCustomResponseValue(
      result.submittedCustomResponses[field.id],
    );
    fields.push({
      key: `custom:${field.id}`,
      label: field.label,
      value: formatted || (field.type === "checkbox" ? "Tidak" : "-"),
      multiline: field.type === "textarea",
    });
  }

  return fields;
}

function buildContactFallbackText(formConfig: ProgramFormConfig): string {
  const { builtInFields } = formConfig;
  const channels: string[] = [];
  if (builtInFields.noHp !== "hidden") channels.push("WhatsApp");
  if (builtInFields.idLine !== "hidden") channels.push("ID LINE");
  if (builtInFields.email !== "hidden") channels.push("email");

  if (channels.length === 0) {
    return "Informasi teknis pelaksanaan dan undangan koordinasi akan disampaikan oleh panitia melalui pengumuman resmi HIMA TI.";
  }
  if (channels.length === 1) {
    return `Informasi teknis pelaksanaan dan undangan koordinasi akan disampaikan oleh panitia melalui ${channels[0]} yang Anda daftarkan.`;
  }
  const last = channels[channels.length - 1];
  const head = channels.slice(0, -1).join(", ");
  return `Informasi teknis pelaksanaan dan undangan koordinasi akan disampaikan oleh panitia melalui kontak ${head} atau ${last} yang Anda daftarkan.`;
}

function FieldLabelSuffix({ required }: { required: boolean }) {
  return required ? (
    <span className="text-amber-800">*</span>
  ) : (
    <span className="font-normal text-zinc-600">(opsional)</span>
  );
}

function CustomFieldControl({
  field,
  value,
  onChange,
}: {
  field: CustomFormField;
  value: string | boolean | undefined;
  onChange: (fieldId: string, nextValue: string | boolean) => void;
}) {
  const inputId = `reg-custom-${field.id}`;
  const fieldName = `custom_${field.id}`;

  if (field.type === "checkbox") {
    return (
      <div className="min-w-0">
        <label
          htmlFor={inputId}
          className="flex min-h-[44px] w-full min-w-0 cursor-pointer items-start gap-3 rounded-xl border border-zinc-500 bg-white px-4 py-3 text-sm text-zinc-900 transition-colors hover:bg-zinc-50 has-[:focus-visible]:border-amber-700 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-amber-700 has-[:disabled]:cursor-not-allowed has-[:disabled]:bg-zinc-100 has-[:disabled]:text-zinc-600"
        >
          <input
            id={inputId}
            name={fieldName}
            type="checkbox"
            required={field.required}
            checked={Boolean(value)}
            onChange={(e) => onChange(field.id, e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-zinc-500 accent-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed"
          />
          <span className="min-w-0 flex-1 font-medium leading-relaxed break-words">
            {field.label} <FieldLabelSuffix required={field.required} />
            {field.placeholder ? (
              <span className="mt-0.5 block text-xs font-normal text-zinc-600 break-words">
                {field.placeholder}
              </span>
            ) : null}
          </span>
        </label>
      </div>
    );
  }

  const textValue = typeof value === "string" ? value : "";

  if (field.type === "textarea") {
    return (
      <div className="min-w-0 space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <label
            htmlFor={inputId}
            className="block min-w-0 text-sm font-semibold text-zinc-900 break-words"
          >
            {field.label} <FieldLabelSuffix required={field.required} />
          </label>
          <span className="shrink-0 text-xs text-zinc-600">
            {textValue.length}/500
          </span>
        </div>
        <textarea
          id={inputId}
          name={fieldName}
          rows={3}
          required={field.required}
          maxLength={500}
          value={textValue}
          onChange={(e) => onChange(field.id, e.target.value)}
          placeholder={field.placeholder || undefined}
          className={TEXTAREA_CLASS}
        />
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div className="min-w-0 space-y-1.5">
        <label
          htmlFor={inputId}
          className="block text-sm font-semibold text-zinc-900 break-words"
        >
          {field.label} <FieldLabelSuffix required={field.required} />
        </label>
        <select
          id={inputId}
          name={fieldName}
          required={field.required}
          value={textValue}
          onChange={(e) => onChange(field.id, e.target.value)}
          className={INPUT_CLASS}
        >
          <option value="" disabled={field.required}>
            Pilih {field.label}
          </option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "number") {
    const hintId = `${inputId}-hint`;
    return (
      <div className="min-w-0 space-y-1.5">
        <label
          htmlFor={inputId}
          className="block text-sm font-semibold text-zinc-900 break-words"
        >
          {field.label} <FieldLabelSuffix required={field.required} />
        </label>
        <input
          id={inputId}
          name={fieldName}
          type="text"
          inputMode="decimal"
          required={field.required}
          maxLength={30}
          value={textValue}
          onChange={(e) => onChange(field.id, e.target.value)}
          aria-describedby={hintId}
          placeholder={field.placeholder || undefined}
          className={INPUT_CLASS}
        />
        <p id={hintId} className="text-xs leading-relaxed text-zinc-600">
          Masukkan angka saja (gunakan titik untuk desimal, maksimal 30 karakter).
        </p>
      </div>
    );
  }

  if (field.type === "date") {
    return (
      <div className="min-w-0 space-y-1.5">
        <label
          htmlFor={inputId}
          className="block text-sm font-semibold text-zinc-900 break-words"
        >
          {field.label} <FieldLabelSuffix required={field.required} />
        </label>
        <input
          id={inputId}
          name={fieldName}
          type="date"
          required={field.required}
          value={textValue}
          onChange={(e) => onChange(field.id, e.target.value)}
          className={INPUT_CLASS}
        />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-1.5">
      <label
        htmlFor={inputId}
        className="block text-sm font-semibold text-zinc-900 break-words"
      >
        {field.label} <FieldLabelSuffix required={field.required} />
      </label>
      <input
        id={inputId}
        name={fieldName}
        type="text"
        required={field.required}
        maxLength={200}
        value={textValue}
        onChange={(e) => onChange(field.id, e.target.value)}
        placeholder={field.placeholder || undefined}
        className={INPUT_CLASS}
      />
    </div>
  );
}

export function ProgramRegistrationConfirmation({
  result,
  formConfig,
  onPrint,
  headingRef,
}: {
  result: RegistrationResult;
  formConfig: ProgramFormConfig;
  onPrint: () => void;
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
}) {
  const hasGroupLink = isSafeHttpUrl(result.registrationGroupLink);
  const formattedTime = formatSubmittedAt(result.registration.submittedAt);
  const summaryFields = buildRegistrationSummaryFields(result, formConfig);

  return (
    <div className="space-y-5 no-print">
      <div className="flex items-start gap-3.5 rounded-2xl border border-emerald-300 bg-emerald-50 p-5">
        <CheckCircle
          size={26}
          weight="fill"
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-emerald-900"
        />
        <div className="min-w-0 space-y-1">
          <span className="inline-block rounded-md border border-emerald-200 bg-white px-2.5 py-0.5 text-xs font-bold text-emerald-900">
            Pendaftaran Tercatat
          </span>
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="pt-1 font-heading text-xl font-bold text-zinc-900 focus:outline-none sm:text-2xl"
          >
            Pendaftaran Berhasil Dikirim
          </h2>
          <p className="text-sm leading-relaxed text-zinc-700 break-words">
            Data keikutsertaan Anda pada {result.programTitle} sudah tersimpan di
            sistem panitia.
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-5 sm:grid-cols-2">
        {summaryFields.map((item) => (
          <div
            key={item.key}
            className={item.multiline ? "min-w-0 sm:col-span-2" : "min-w-0"}
          >
            <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-600 break-words">
              {item.label}
            </dt>
            <dd
              className={`mt-1 text-sm font-bold text-zinc-900 break-words ${
                item.multiline ? "whitespace-pre-line font-semibold" : ""
              }`}
            >
              {item.value}
            </dd>
          </div>
        ))}
        <div className="min-w-0">
          <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
            Program Kerja
          </dt>
          <dd className="mt-1 text-sm font-bold text-zinc-900 break-words">
            {result.programTitle}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
            Waktu Daftar
          </dt>
          <dd className="mt-1 text-sm font-semibold text-zinc-900">
            {formattedTime}
          </dd>
        </div>
      </dl>

      {hasGroupLink ? (
        <div className="space-y-3 rounded-2xl border border-amber-300 bg-amber-50 p-5">
          <div className="space-y-1">
            <h3 className="font-heading text-base font-bold text-zinc-900">
              Gabung Grup Resmi Peserta
            </h3>
            <p className="text-sm leading-relaxed text-zinc-700">
              Masuk ke grup koordinasi peserta untuk menerima pembaruan jadwal,
              lokasi, dan arahan teknis dari panitia.
            </p>
          </div>
          <a
            href={result.registrationGroupLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-3 text-sm font-bold text-zinc-950 transition-colors hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2 sm:w-auto"
          >
            Gabung Grup Peserta
            <ArrowSquareOut size={16} weight="bold" aria-hidden="true" />
          </a>
        </div>
      ) : (
        <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          {buildContactFallbackText(formConfig)}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={onPrint}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-zinc-500 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2"
        >
          <Printer size={18} weight="bold" aria-hidden="true" />
          Cetak / Simpan Bukti
        </button>
        <Link
          href="/program-kerja"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-zinc-500 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2"
        >
          Lihat Program Kerja lain
        </Link>
      </div>
    </div>
  );
}

export function ProgramRegistrationPrintableReceipt({
  result,
  programPeriod,
  formConfig,
}: {
  result: RegistrationResult;
  programPeriod: string;
  formConfig: ProgramFormConfig;
}) {
  const hasGroupLink = isSafeHttpUrl(result.registrationGroupLink);
  const formattedTime = formatSubmittedAt(result.registration.submittedAt);
  const summaryFields = buildRegistrationSummaryFields(result, formConfig);

  return (
    <div className="hidden p-8 text-zinc-900 print:block">
      <div className="mx-auto max-w-2xl space-y-6 border border-zinc-400 p-8">
        <div className="border-b border-zinc-400 pb-4">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-700">
            HIMA TI Universitas Pendidikan Nasional
          </p>
          <h1 className="mt-1 text-2xl font-bold text-zinc-900">
            Bukti Pendaftaran Peserta Program Kerja
          </h1>
          <p className="mt-1 text-sm text-zinc-700 break-words">
            {result.programTitle} (Periode {programPeriod})
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div className="min-w-0">
            <dt className="text-xs uppercase text-zinc-600">ID Pendaftaran</dt>
            <dd className="mt-0.5 font-mono text-xs text-zinc-900 break-all">
              {result.registration.id}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs uppercase text-zinc-600">Waktu Daftar</dt>
            <dd className="mt-0.5 font-semibold text-zinc-900">
              {formattedTime}
            </dd>
          </div>
          {summaryFields.map((item) => (
            <div
              key={item.key}
              className={item.multiline ? "col-span-2 min-w-0" : "min-w-0"}
            >
              <dt className="text-xs uppercase text-zinc-600 break-words">
                {item.label}
              </dt>
              <dd
                className={`mt-0.5 text-zinc-900 break-words ${
                  item.multiline ? "whitespace-pre-line" : "font-semibold"
                }`}
              >
                {item.value}
              </dd>
            </div>
          ))}
        </dl>

        {hasGroupLink ? (
          <div className="border-t border-zinc-300 pt-4 text-xs text-zinc-700">
            <p className="font-semibold text-zinc-900">
              Tautan Grup Resmi Peserta:
            </p>
            <p className="mt-1 break-all">{result.registrationGroupLink}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StatusNoticeCard({
  icon,
  title,
  description,
  extra,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  extra?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="space-y-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-6 sm:p-8">
      <div className="flex items-start gap-3.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-900">
          {icon}
        </div>
        <div className="min-w-0 space-y-1.5">
          <h2 className="font-heading text-lg font-bold text-zinc-900 sm:text-xl">
            {title}
          </h2>
          <p className="text-sm leading-relaxed text-zinc-700 break-words">
            {description}
          </p>
          {extra}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        {action}
        <Link
          href="/program-kerja"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-zinc-500 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2"
        >
          Lihat Program Kerja lain
        </Link>
      </div>
    </div>
  );
}

export function ProgramRegistrationForm({
  program,
  registeredCount,
  cohortCounts = {},
  configured,
}: ProgramRegistrationFormProps) {
  const formConfig = normalizeProgramFormConfig(program.registrationFormConfig);
  const cohortSummary = buildCohortQuotaSummary(formConfig, cohortCounts);
  const { builtInFields, customFields } = formConfig;

  const [nama, setNama] = useState("");
  const [nim, setNim] = useState("");
  const [angkatan, setAngkatan] = useState("");
  const [noHp, setNoHp] = useState("");
  const [idLine, setIdLine] = useState("");
  const [email, setEmail] = useState("");
  const [catatan, setCatatan] = useState("");
  const [customValues, setCustomValues] = useState<ProgramCustomResponses>({});

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<RegistrationResult | null>(null);

  const inFlight = useRef(false);
  const alertRef = useRef<HTMLDivElement>(null);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (result) {
      successHeadingRef.current?.focus();
    }
  }, [result]);

  if (!configured) {
    return (
      <StatusNoticeCard
        icon={<Clock size={22} weight="bold" aria-hidden="true" />}
        title="Layanan Pendaftaran Belum Aktif"
        description="Sistem pendaftaran peserta belum dikonfigurasi pada server ini. Silakan hubungi panitia untuk informasi pendaftaran."
        extra={
          program.contactPerson ? (
            <p className="pt-1 text-sm font-medium text-zinc-800 break-words">
              Narahubung: {program.contactPerson}
            </p>
          ) : null
        }
      />
    );
  }

  if (program.registrationMode !== "internal") {
    const canOpenExternal =
      program.status === "open" && isSafeHttpUrl(program.gformLink);
    return (
      <StatusNoticeCard
        icon={<ArrowSquareOut size={22} weight="bold" aria-hidden="true" />}
        title={
          canOpenExternal
            ? "Pendaftaran Melalui Formulir Eksternal"
            : program.status === "upcoming"
              ? "Pendaftaran Belum Dibuka"
              : "Pendaftaran Tidak Tersedia di Website"
        }
        description={
          canOpenExternal
            ? `Pendaftaran peserta untuk ${program.title} dibuka melalui tautan formulir resmi panitia di luar website ini.`
            : `Program kerja ${program.title} menggunakan kanal pendaftaran eksternal dan saat ini tidak menerima pendaftaran melalui formulir website.`
        }
        extra={
          program.contactPerson ? (
            <p className="pt-1 text-sm font-medium text-zinc-800 break-words">
              Narahubung: {program.contactPerson}
            </p>
          ) : null
        }
        action={
          canOpenExternal ? (
            <a
              href={program.gformLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-zinc-950 transition-colors hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2"
            >
              Buka Formulir Pendaftaran
              <ArrowSquareOut size={16} weight="bold" aria-hidden="true" />
            </a>
          ) : undefined
        }
      />
    );
  }

  if (program.status === "upcoming") {
    return (
      <StatusNoticeCard
        icon={<CalendarBlank size={22} weight="bold" aria-hidden="true" />}
        title="Pendaftaran Belum Dibuka"
        description={`Pendaftaran peserta untuk ${program.title} belum dibuka. Silakan pantau informasi terbaru menjelang jadwal pelaksanaan.`}
        extra={
          <div className="space-y-1 pt-1 text-sm text-zinc-800">
            {program.executionDate ? (
              <p className="font-medium break-words">
                Jadwal pelaksanaan: {program.executionDate}
              </p>
            ) : null}
            {program.contactPerson ? (
              <p className="font-medium break-words">
                Narahubung: {program.contactPerson}
              </p>
            ) : null}
          </div>
        }
      />
    );
  }

  if (program.status !== "open") {
    return (
      <StatusNoticeCard
        icon={<Clock size={22} weight="bold" aria-hidden="true" />}
        title="Pendaftaran Ditutup"
        description={`Pendaftaran peserta untuk ${program.title} telah ditutup dan tidak lagi menerima pengisian formulir baru.`}
        extra={
          program.contactPerson ? (
            <p className="pt-1 text-sm font-medium text-zinc-800 break-words">
              Narahubung: {program.contactPerson}
            </p>
          ) : null
        }
      />
    );
  }

  const isOverallQuotaFull =
    program.registrationMaxQuota !== null &&
    registeredCount >= program.registrationMaxQuota;

  if (isOverallQuotaFull || cohortSummary.allFull) {
    const cohortYears = cohortSummary.items
      .map((item) => item.angkatan)
      .join(", ");
    const description = cohortSummary.allFull
      ? `Seluruh kuota angkatan yang dibuka (${cohortYears}) untuk ${program.title} sudah terisi penuh.`
      : `Seluruh ${program.registrationMaxQuota} slot peserta untuk ${program.title} telah terisi (${registeredCount} dari ${program.registrationMaxQuota} peserta terdaftar).`;

    return (
      <StatusNoticeCard
        icon={<Users size={22} weight="bold" aria-hidden="true" />}
        title="Kuota Peserta Penuh"
        description={description}
        extra={
          cohortSummary.enabled || program.contactPerson ? (
            <div className="space-y-3 pt-1">
              {cohortSummary.enabled ? (
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {cohortSummary.items.map((item) => (
                    <li
                      key={item.angkatan}
                      className={
                        item.isFull
                          ? "min-w-0 rounded-xl border border-red-600 bg-red-50 px-3 py-2 text-xs"
                          : "min-w-0 rounded-xl border border-emerald-600 bg-emerald-50 px-3 py-2 text-xs"
                      }
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="font-bold text-zinc-900">
                          {item.angkatan}
                        </span>
                        <span
                          className={
                            item.isFull
                              ? "font-bold text-red-800"
                              : "font-bold text-emerald-900"
                          }
                        >
                          {item.isFull ? "Penuh" : `Sisa ${item.remaining}`}
                        </span>
                      </div>
                      <p className="mt-1 text-zinc-700 break-words">
                        {item.registered}/{item.maxQuota} peserta
                      </p>
                    </li>
                  ))}
                </ul>
              ) : null}
              {program.contactPerson ? (
                <p className="text-sm font-medium text-zinc-800 break-words">
                  Narahubung: {program.contactPerson}
                </p>
              ) : null}
            </div>
          ) : null
        }
      />
    );
  }

  function handleCustomFieldChange(fieldId: string, nextValue: string | boolean) {
    setCustomValues((prev) => ({ ...prev, [fieldId]: nextValue }));
  }

  function handlePrint() {
    const originalTitle = document.title;
    if (result) {
      document.title = `Bukti Pendaftaran ${result.programTitle} - ${result.registration.nama}`;
    }
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current) return;

    let payload: ProgramRegistrationInput & { programId: string };
    try {
      payload = validateAndBuildRegistrationPayload(
        program.id,
        {
          nama,
          nim,
          angkatan,
          noHp,
          idLine,
          email,
          catatan,
          customValues,
        },
        formConfig,
        cohortCounts,
      );
    } catch (error) {
      setErrorMsg(
        error instanceof ValidationError
          ? error.message
          : "Periksa kembali data yang dimasukkan.",
      );
      requestAnimationFrame(() => alertRef.current?.focus());
      return;
    }

    inFlight.current = true;
    setBusy(true);
    setErrorMsg("");

    try {
      const response = await fetch("/api/program-registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      const responseJson = (await response.json().catch(() => null)) as {
        error?: string;
        registration?: RegistrationResult["registration"] & {
          noHp?: string;
          idLine?: string;
          email?: string;
          catatan?: string;
          customResponses?: ProgramCustomResponses;
        };
        programTitle?: string;
        registrationGroupLink?: string;
      } | null;

      if (!response.ok || !responseJson?.registration) {
        setErrorMsg(
          responseJson?.error ||
            "Terjadi kesalahan saat memproses pendaftaran. Silakan coba kembali.",
        );
        requestAnimationFrame(() => alertRef.current?.focus());
        return;
      }

      setResult({
        registration: {
          id: responseJson.registration.id,
          programId: responseJson.registration.programId,
          nama: responseJson.registration.nama,
          nim: responseJson.registration.nim,
          angkatan: responseJson.registration.angkatan,
          submittedAt: responseJson.registration.submittedAt,
        },
        programTitle: responseJson.programTitle || program.title,
        registrationGroupLink: responseJson.registrationGroupLink || "",
        submittedNoHp: responseJson.registration.noHp ?? payload.noHp,
        submittedIdLine: responseJson.registration.idLine ?? payload.idLine,
        submittedEmail: responseJson.registration.email ?? payload.email,
        submittedCatatan: responseJson.registration.catatan ?? payload.catatan,
        submittedCustomResponses:
          responseJson.registration.customResponses ?? payload.customResponses,
      });
    } catch {
      setErrorMsg(
        "Gagal terhubung ke server. Periksa koneksi internet Anda lalu coba kembali.",
      );
      requestAnimationFrame(() => alertRef.current?.focus());
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div className="space-y-6">
        <ProgramRegistrationConfirmation
          result={result}
          formConfig={formConfig}
          onPrint={handlePrint}
          headingRef={successHeadingRef}
        />

        {/* Portal receipt outside <main>, because globals.css hides <main> during @media print. */}
        {typeof document !== "undefined" &&
          createPortal(
            <ProgramRegistrationPrintableReceipt
              result={result}
              programPeriod={program.period}
              formConfig={formConfig}
            />,
            document.body,
          )}
      </div>
    );
  }

  const compactFields: Array<{ key: string; node: React.ReactNode }> = [
    {
      key: "nim",
      node: (
        <>
          <label
            htmlFor="reg-nim"
            className="block text-sm font-semibold text-zinc-900"
          >
            NIM <span className="text-amber-800">*</span>
          </label>
          <input
            id="reg-nim"
            name="nim"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            required
            minLength={5}
            maxLength={30}
            value={nim}
            onChange={(e) => setNim(e.target.value.replace(/\D/g, ""))}
            aria-describedby="reg-nim-hint"
            placeholder="Masukkan NIM (hanya angka)"
            className={INPUT_CLASS}
          />
          <p id="reg-nim-hint" className="text-xs leading-relaxed text-zinc-600">
            Hanya angka, 5 sampai 30 digit (misalnya 8 digit NIM Undiknas).
          </p>
        </>
      ),
    },
  ];

  if (builtInFields.angkatan !== "hidden" || cohortSummary.enabled) {
    const required =
      builtInFields.angkatan === "required" || cohortSummary.enabled;
    compactFields.push({
      key: "angkatan",
      node: (
        <>
          <label
            htmlFor="reg-angkatan"
            className="block text-sm font-semibold text-zinc-900"
          >
            Angkatan <FieldLabelSuffix required={required} />
          </label>
          <select
            id="reg-angkatan"
            name="angkatan"
            required={required}
            value={angkatan}
            onChange={(e) => setAngkatan(e.target.value)}
            aria-describedby={
              cohortSummary.enabled ? "reg-angkatan-hint" : undefined
            }
            className={INPUT_CLASS}
          >
            <option value="" disabled={required}>
              {required
                ? "Pilih tahun angkatan"
                : "Pilih tahun angkatan (opsional)"}
            </option>
            {cohortSummary.enabled
              ? cohortSummary.items.map((item) => (
                  <option
                    key={item.angkatan}
                    value={item.angkatan}
                    disabled={item.isFull}
                  >
                    {item.isFull
                      ? `${item.angkatan} (Penuh - ${item.registered}/${item.maxQuota})`
                      : `${item.angkatan} (Sisa ${item.remaining} dari ${item.maxQuota})`}
                  </option>
                ))
              : ANGKATAN_OPTIONS.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
          </select>
          {cohortSummary.enabled ? (
            <p
              id="reg-angkatan-hint"
              className="text-xs leading-relaxed text-zinc-600"
            >
              Pilih angkatan yang masih memiliki sisa kuota peserta.
            </p>
          ) : null}
        </>
      ),
    });
  }

  if (builtInFields.noHp !== "hidden") {
    const required = builtInFields.noHp === "required";
    compactFields.push({
      key: "noHp",
      node: (
        <>
          <label
            htmlFor="reg-noHp"
            className="block text-sm font-semibold text-zinc-900"
          >
            Nomor HP / WhatsApp aktif <FieldLabelSuffix required={required} />
          </label>
          <input
            id="reg-noHp"
            name="noHp"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required={required}
            maxLength={20}
            value={noHp}
            onChange={(e) => setNoHp(e.target.value)}
            aria-describedby="reg-noHp-hint"
            placeholder="Contoh: 08xxxxxxxxxx"
            className={INPUT_CLASS}
          />
          <p id="reg-noHp-hint" className="text-xs leading-relaxed text-zinc-600">
            Digunakan panitia untuk komunikasi darurat atau konfirmasi.
          </p>
        </>
      ),
    });
  }

  if (builtInFields.idLine !== "hidden") {
    const required = builtInFields.idLine === "required";
    compactFields.push({
      key: "idLine",
      node: (
        <>
          <label
            htmlFor="reg-idLine"
            className="block text-sm font-semibold text-zinc-900"
          >
            ID LINE aktif <FieldLabelSuffix required={required} />
          </label>
          <input
            id="reg-idLine"
            name="idLine"
            type="text"
            autoComplete="off"
            required={required}
            minLength={2}
            maxLength={64}
            value={idLine}
            onChange={(e) => setIdLine(e.target.value)}
            placeholder="Masukkan ID LINE aktif"
            className={INPUT_CLASS}
          />
        </>
      ),
    });
  }

  if (builtInFields.email !== "hidden") {
    const required = builtInFields.email === "required";
    compactFields.push({
      key: "email",
      node: (
        <>
          <label
            htmlFor="reg-email"
            className="block text-sm font-semibold text-zinc-900"
          >
            Email <FieldLabelSuffix required={required} />
          </label>
          <input
            id="reg-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required={required}
            maxLength={120}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@email.com"
            className={INPUT_CLASS}
          />
        </>
      ),
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-busy={busy}
      className="space-y-6 no-print"
    >
      <div className="space-y-1">
        <h2 className="font-heading text-xl font-bold text-zinc-900 sm:text-2xl">
          Formulir Pendaftaran Peserta
        </h2>
        <p className="text-sm text-zinc-600">
          Lengkapi identitas peserta untuk mendaftar ke kegiatan {program.title}.
          Kolom bertanda bintang (*) wajib diisi.
        </p>
      </div>

      {cohortSummary.enabled ? (
        <section
          aria-labelledby="cohort-quota-heading"
          className="space-y-3 rounded-xl border border-zinc-300 bg-zinc-50 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3
              id="cohort-quota-heading"
              className="flex items-center gap-2 text-sm font-bold text-zinc-900"
            >
              <Users
                size={16}
                weight="bold"
                aria-hidden="true"
                className="shrink-0 text-amber-800"
              />
              Kuota per Angkatan
            </h3>
            <span className="text-xs font-medium text-zinc-600">
              Terbuka untuk {cohortSummary.items.length} angkatan
            </span>
          </div>
          <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {cohortSummary.items.map((item) => (
              <li
                key={item.angkatan}
                className={
                  item.isFull
                    ? "min-w-0 rounded-xl border border-red-600 bg-red-50 p-3"
                    : "min-w-0 rounded-xl border border-emerald-600 bg-emerald-50 p-3"
                }
              >
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="text-sm font-bold text-zinc-900">
                    {item.angkatan}
                  </span>
                  <span
                    className={
                      item.isFull
                        ? "text-xs font-bold text-red-800"
                        : "text-xs font-bold text-emerald-900"
                    }
                  >
                    {item.isFull ? "Penuh" : `Sisa ${item.remaining}`}
                  </span>
                </div>
                <p className="mt-1 text-xs font-medium text-zinc-700 break-words">
                  {item.registered}/{item.maxQuota} peserta
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <fieldset disabled={busy} className="m-0 min-w-0 space-y-5 border-0 p-0">
        <div className="min-w-0 space-y-1.5">
          <label
            htmlFor="reg-nama"
            className="block text-sm font-semibold text-zinc-900"
          >
            Nama lengkap <span className="text-amber-800">*</span>
          </label>
          <input
            id="reg-nama"
            name="nama"
            type="text"
            required
            autoComplete="name"
            minLength={2}
            maxLength={100}
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="Masukkan nama lengkap"
            className={INPUT_CLASS}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {compactFields.map((item, index) => {
            const spanFull =
              compactFields.length % 2 === 1 &&
              index === compactFields.length - 1;
            return (
              <div
                key={item.key}
                className={
                  spanFull
                    ? "min-w-0 space-y-1.5 sm:col-span-2"
                    : "min-w-0 space-y-1.5"
                }
              >
                {item.node}
              </div>
            );
          })}
        </div>

        {builtInFields.catatan !== "hidden" ? (
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <label
                htmlFor="reg-catatan"
                className="block text-sm font-semibold text-zinc-900"
              >
                Catatan untuk panitia{" "}
                <FieldLabelSuffix
                  required={builtInFields.catatan === "required"}
                />
              </label>
              <span className="shrink-0 text-xs text-zinc-600">
                {catatan.length}/300
              </span>
            </div>
            <textarea
              id="reg-catatan"
              name="catatan"
              rows={3}
              required={builtInFields.catatan === "required"}
              maxLength={300}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Tulis informasi tambahan seperti kebutuhan konsumsi atau pertanyaan singkat"
              className={TEXTAREA_CLASS}
            />
          </div>
        ) : null}

        {customFields.length > 0 ? (
          <div className="space-y-5 border-t border-zinc-200 pt-5">
            <h3 className="font-heading text-base font-bold text-zinc-900">
              Pertanyaan Tambahan
            </h3>
            {customFields.map((field) => (
              <CustomFieldControl
                key={field.id}
                field={field}
                value={customValues[field.id]}
                onChange={handleCustomFieldChange}
              />
            ))}
          </div>
        ) : null}

        {errorMsg ? (
          <div
            ref={alertRef}
            tabIndex={-1}
            role="alert"
            className="scroll-mt-24 flex items-start gap-2.5 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
          >
            <Warning
              size={18}
              weight="bold"
              aria-hidden="true"
              className="mt-0.5 shrink-0"
            />
            <span className="min-w-0 break-words">{errorMsg}</span>
          </div>
        ) : null}

        <div className="pt-1">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-amber-400 px-6 py-3 text-sm font-bold text-zinc-950 shadow-xs transition-colors hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[240px]"
          >
            <PendingLabel pending={busy} text="Mengirim pendaftaran...">
              Kirim Pendaftaran
            </PendingLabel>
          </button>
        </div>
      </fieldset>
    </form>
  );
}
