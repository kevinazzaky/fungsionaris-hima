import { cache } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarBlank,
  Check,
  Clock,
  MapPin,
  Phone,
  Tag,
  Users,
} from "@phosphor-icons/react/dist/ssr";
import { DetailHeader } from "@/components/detail/detail-header";
import {
  buildCohortQuotaSummary,
  ProgramRegistrationForm,
} from "@/components/programs/program-registration-form";
import Link from "@/components/ui/navigation-link";
import { loadProgramRegistrationPage } from "@/data/programs";
import { normalizeProgramFormConfig } from "@/domain/program-form-config";
import { PROGRAM_STATUSES } from "@/domain/programs";

const getProgramRegistrationData = cache((id: string) =>
  loadProgramRegistrationPage(id),
);

const STATUS_BADGE_STYLES = {
  open: "border-emerald-300 bg-emerald-50 text-emerald-900",
  upcoming: "border-amber-300 bg-amber-100 text-amber-950",
  closed: "border-zinc-300 bg-zinc-100 text-zinc-800",
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getProgramRegistrationData(id);

  if (!data.program || !data.program.isPublished) {
    notFound();
  }

  return {
    title: `Pendaftaran ${data.program.title} (${data.program.period})`,
    description: `Informasi dan pendaftaran peserta ${data.program.title} periode ${data.program.period}. ${data.program.body}`,
    alternates: {
      canonical: `/program-kerja/${data.program.id}/daftar`,
    },
  };
}

export default async function ProgramRegistrationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getProgramRegistrationData(id);

  if (!data.program || !data.program.isPublished) {
    notFound();
  }

  const { program, registeredCount, cohortCounts, configured } = data;
  const cohortSummary = buildCohortQuotaSummary(
    normalizeProgramFormConfig(program.registrationFormConfig),
    cohortCounts,
  );
  const hasQuota = program.registrationMaxQuota !== null && configured;
  const hasCohortQuota = configured && cohortSummary.enabled;
  const isOverallQuotaFull =
    hasQuota &&
    program.registrationMaxQuota !== null &&
    registeredCount >= program.registrationMaxQuota;
  const isQuotaFull =
    isOverallQuotaFull || (hasCohortQuota && cohortSummary.allFull);

  return (
    <>
      <DetailHeader
        title={`Pendaftaran ${program.title}`}
        description={`Periode ${program.period}. ${program.body}`}
      />

      <section className="mx-auto w-full max-w-6xl px-4 pb-20 pt-8 sm:px-6 sm:pb-24 sm:pt-12 no-print">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:items-start">
          <aside className="min-w-0 space-y-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span
                className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-bold ${STATUS_BADGE_STYLES[program.status]}`}
              >
                {PROGRAM_STATUSES[program.status]}
              </span>
              <span className="text-xs font-semibold text-zinc-700">
                Periode {program.period}
              </span>
            </div>

            {program.imageUrl ? (
              <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-zinc-200">
                <Image
                  src={program.imageUrl}
                  alt={program.title}
                  fill
                  sizes="(min-width: 1024px) 320px, 100vw"
                  className="object-cover"
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <h2 className="font-heading text-lg font-bold text-zinc-900 break-words">
                {program.title}
              </h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-700 break-words">
                {program.fullDescription || program.body}
              </p>
            </div>

            <dl className="space-y-3.5 border-t border-zinc-200 pt-4 text-sm">
              <div className="flex items-start gap-2.5">
                <CalendarBlank
                  size={18}
                  weight="bold"
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-amber-800"
                />
                <div className="min-w-0">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                    Jadwal Pelaksanaan
                  </dt>
                  <dd className="mt-0.5 font-medium text-zinc-900 break-words">
                    {program.executionDate || "Menunggu pengumuman panitia"}
                  </dd>
                </div>
              </div>

              {program.time ? (
                <div className="flex items-start gap-2.5">
                  <Clock
                    size={18}
                    weight="bold"
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-amber-800"
                  />
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                      Waktu
                    </dt>
                    <dd className="mt-0.5 font-medium text-zinc-900 break-words">
                      {program.time}
                    </dd>
                  </div>
                </div>
              ) : null}

              <div className="flex items-start gap-2.5">
                <MapPin
                  size={18}
                  weight="bold"
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-amber-800"
                />
                <div className="min-w-0">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                    Lokasi
                  </dt>
                  <dd className="mt-0.5 font-medium text-zinc-900 break-words">
                    {program.location || "Menunggu pengumuman panitia"}
                  </dd>
                </div>
              </div>

              {program.price ? (
                <div className="flex items-start gap-2.5">
                  <Tag
                    size={18}
                    weight="bold"
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-amber-800"
                  />
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                      Biaya
                    </dt>
                    <dd className="mt-0.5 font-medium text-zinc-900 break-words">
                      {program.price}
                    </dd>
                  </div>
                </div>
              ) : null}

              {program.contactPerson ? (
                <div className="flex items-start gap-2.5">
                  <Phone
                    size={18}
                    weight="bold"
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-amber-800"
                  />
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                      Narahubung
                    </dt>
                    <dd className="mt-0.5 whitespace-pre-line font-medium text-zinc-900 break-words">
                      {program.contactPerson}
                    </dd>
                  </div>
                </div>
              ) : null}

              {hasQuota && program.registrationMaxQuota !== null ? (
                <div className="flex items-start gap-2.5">
                  <Users
                    size={18}
                    weight="bold"
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-amber-800"
                  />
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                      Kuota Peserta
                    </dt>
                    <dd className="mt-0.5 flex flex-wrap items-center gap-2 font-medium text-zinc-900">
                      <span>
                        Terdaftar {registeredCount} dari{" "}
                        {program.registrationMaxQuota} peserta
                      </span>
                      {isQuotaFull ? (
                        <span className="inline-block rounded-md border border-red-600 bg-red-50 px-2 py-0.5 text-xs font-bold text-red-800">
                          Kuota penuh
                        </span>
                      ) : null}
                    </dd>
                  </div>
                </div>
              ) : null}
            </dl>

            {hasCohortQuota ? (
              <div className="border-t border-zinc-200 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                    Kuota per Angkatan
                  </p>
                  {cohortSummary.allFull ? (
                    <span className="inline-block rounded-md border border-red-600 bg-red-50 px-2 py-0.5 text-xs font-bold text-red-800">
                      Kuota penuh
                    </span>
                  ) : null}
                </div>
                <ul className="mt-2.5 space-y-2 text-sm">
                  {cohortSummary.items.map((item) => (
                    <li
                      key={item.angkatan}
                      className={
                        item.isFull
                          ? "flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-600 bg-red-50 px-3 py-2"
                          : "flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-300 bg-white px-3 py-2"
                      }
                    >
                      <span className="font-semibold text-zinc-900">
                        Angkatan {item.angkatan}
                      </span>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-medium text-zinc-700">
                          {item.registered}/{item.maxQuota} peserta
                        </span>
                        <span
                          className={
                            item.isFull
                              ? "font-bold text-red-800"
                              : "font-bold text-emerald-800"
                          }
                        >
                          {item.isFull ? "Penuh" : `Sisa ${item.remaining}`}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {program.benefits.length > 0 ? (
              <div className="border-t border-zinc-200 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                  Benefit Peserta
                </p>
                <ul className="mt-2 space-y-1.5 text-sm text-zinc-800">
                  {program.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-2">
                      <Check
                        size={15}
                        weight="bold"
                        aria-hidden="true"
                        className="mt-0.5 shrink-0 text-amber-800"
                      />
                      <span className="min-w-0 break-words">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="border-t border-zinc-200 pt-4">
              <Link
                href="/program-kerja"
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-zinc-500 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2"
              >
                <ArrowLeft size={16} weight="bold" aria-hidden="true" />
                Kembali ke Program Kerja
              </Link>
            </div>
          </aside>

          <div className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs sm:p-8">
            <ProgramRegistrationForm
              program={program}
              registeredCount={registeredCount}
              cohortCounts={cohortCounts}
              configured={configured}
            />
          </div>
        </div>
      </section>
    </>
  );
}
