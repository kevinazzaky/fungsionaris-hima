"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowSquareOut,
  CalendarBlank,
  Clock,
  MapPin,
  Users,
} from "@phosphor-icons/react/dist/ssr";
import { motion, AnimatePresence } from "motion/react";
import Link from "@/components/ui/navigation-link";
import type { Program } from "@/domain/programs";
import { programPeriods } from "@/components/home/program-periods";

const STATUS_BADGE_STYLES = {
  open: "border-emerald-300 bg-emerald-50 text-emerald-900",
  upcoming: "border-amber-300 bg-amber-100 text-amber-950",
  closed: "border-zinc-300 bg-zinc-100 text-zinc-800",
} as const;

function isSafeHttpUrl(value?: string): value is string {
  if (!value) return false;
  try {
    const protocol = new URL(value).protocol;
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

export function ProgramPeriodTabs({ programs }: { programs: Program[] }) {
  const periods = programPeriods(programs);
  const [active, setActive] = useState(periods[0]?.key || "");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const current = periods.find((p) => p.key === active) ??
    periods[0] ?? { key: "", label: "", programs: [] };

  if (!periods.length)
    return (
      <p className="text-zinc-700">
        Belum ada program kerja yang dipublikasikan.
      </p>
    );

  function handleTabKeyDown(
    e: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let nextIndex = -1;
    if (e.key === "ArrowRight") nextIndex = (index + 1) % periods.length;
    else if (e.key === "ArrowLeft")
      nextIndex = (index - 1 + periods.length) % periods.length;
    else if (e.key === "Home") nextIndex = 0;
    else if (e.key === "End") nextIndex = periods.length - 1;

    if (nextIndex >= 0) {
      e.preventDefault();
      setActive(periods[nextIndex].key);
      tabRefs.current[nextIndex]?.focus();
    }
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label="Periode Program Kerja"
        className="relative inline-flex max-w-full flex-wrap gap-1 rounded-2xl border border-zinc-300 bg-white p-1.5 shadow-xs sm:rounded-full"
      >
        {periods.map((period, index) => {
          const isSelected = current.key === period.key;
          const domKey = period.key.replace(/[^a-zA-Z0-9_-]/g, "-");
          return (
            <button
              key={period.key}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              id={`program-period-tab-${domKey}`}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-controls={`program-period-panel-${domKey}`}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => setActive(period.key)}
              onKeyDown={(e) => handleTabKeyDown(e, index)}
              className={`relative z-10 min-h-[44px] rounded-xl px-5 py-2 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2 sm:rounded-full sm:px-6 ${
                isSelected
                  ? "text-zinc-950"
                  : "text-zinc-700 hover:text-zinc-950"
              }`}
            >
              {isSelected && (
                <motion.span
                  layoutId="active-period-detail-tab"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  className="absolute inset-0 z-[-1] rounded-xl bg-amber-400 shadow-xs sm:rounded-full"
                />
              )}
              {period.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.key}
          id={`program-period-panel-${current.key.replace(/[^a-zA-Z0-9_-]/g, "-")}`}
          role="tabpanel"
          aria-labelledby={`program-period-tab-${current.key.replace(/[^a-zA-Z0-9_-]/g, "-")}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2"
        >
          {current.programs.map((program, idx) => {
            const hasExternalAction =
              program.status === "open" &&
              program.registrationMode !== "internal" &&
              isSafeHttpUrl(program.gformLink);
            const hasInternalAction =
              program.status === "open" &&
              program.registrationMode === "internal";

            return (
              <motion.article
                key={program.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.35,
                  delay: idx * 0.06,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="group flex min-w-0 flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-xs transition-all duration-300 hover:border-amber-500/70 hover:shadow-lg"
              >
                {program.image && (
                  <div className="relative aspect-video w-full overflow-hidden bg-zinc-100">
                    <Image
                      src={program.image}
                      alt={program.title}
                      fill
                      sizes="(min-width: 768px) 45vw, 92vw"
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                  </div>
                )}

                <div className="flex flex-1 flex-col p-5 sm:p-6 lg:p-7">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex rounded-xl bg-amber-400/20 p-2.5 text-amber-800">
                      <program.icon
                        size={24}
                        weight="bold"
                        aria-hidden="true"
                      />
                    </div>
                    <span
                      className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-bold ${STATUS_BADGE_STYLES[program.status]}`}
                    >
                      {program.statusText}
                    </span>
                  </div>

                  <h3 className="mt-4 font-heading text-xl font-bold text-zinc-900 break-words">
                    {program.title}
                  </h3>

                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-700 break-words">
                    {program.fullDescription || program.body}
                  </p>

                  <dl className="mt-5 space-y-2 border-t border-zinc-200 pt-4 text-xs text-zinc-700 sm:text-sm">
                    {program.executionDate ? (
                      <div className="flex items-start gap-2">
                        <CalendarBlank
                          size={16}
                          weight="bold"
                          aria-hidden="true"
                          className="mt-0.5 shrink-0 text-amber-800"
                        />
                        <div className="min-w-0">
                          <dt className="sr-only">Jadwal Pelaksanaan</dt>
                          <dd className="font-medium text-zinc-900 break-words">
                            {program.executionDate}
                          </dd>
                        </div>
                      </div>
                    ) : null}

                    {program.time ? (
                      <div className="flex items-start gap-2">
                        <Clock
                          size={16}
                          weight="bold"
                          aria-hidden="true"
                          className="mt-0.5 shrink-0 text-amber-800"
                        />
                        <div className="min-w-0">
                          <dt className="sr-only">Waktu</dt>
                          <dd className="break-words">{program.time}</dd>
                        </div>
                      </div>
                    ) : null}

                    {program.location ? (
                      <div className="flex items-start gap-2">
                        <MapPin
                          size={16}
                          weight="bold"
                          aria-hidden="true"
                          className="mt-0.5 shrink-0 text-amber-800"
                        />
                        <div className="min-w-0">
                          <dt className="sr-only">Lokasi</dt>
                          <dd className="break-words">{program.location}</dd>
                        </div>
                      </div>
                    ) : null}

                    {program.registrationMaxQuota !== undefined &&
                    program.registrationMaxQuota !== null ? (
                      <div className="flex items-start gap-2">
                        <Users
                          size={16}
                          weight="bold"
                          aria-hidden="true"
                          className="mt-0.5 shrink-0 text-amber-800"
                        />
                        <div className="min-w-0">
                          <dt className="sr-only">Kuota Maksimal</dt>
                          <dd>
                            Kuota maksimal {program.registrationMaxQuota} peserta
                          </dd>
                        </div>
                      </div>
                    ) : null}
                  </dl>

                  <div className="mt-auto pt-5">
                    <div className="border-t border-zinc-200 pt-4">
                      {hasInternalAction ? (
                        <Link
                          href={`/program-kerja/${program.id}/daftar`}
                          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-zinc-950 shadow-xs transition-colors hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2 sm:w-auto"
                        >
                          Daftar Sekarang
                        </Link>
                      ) : hasExternalAction ? (
                        <a
                          href={program.gformLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-zinc-950 shadow-xs transition-colors hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2 sm:w-auto"
                        >
                          Daftar Sekarang
                          <ArrowSquareOut
                            size={16}
                            weight="bold"
                            aria-hidden="true"
                          />
                        </a>
                      ) : program.status === "open" ? (
                        <p className="text-sm font-medium text-zinc-700">
                          Tautan pendaftaran belum tersedia
                        </p>
                      ) : program.status === "upcoming" ? (
                        <p className="text-sm font-medium text-amber-900">
                          Pendaftaran segera dibuka
                        </p>
                      ) : (
                        <p className="text-sm font-medium text-zinc-700">
                          Pendaftaran telah ditutup
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
