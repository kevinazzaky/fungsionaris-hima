"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";

import type { Program } from "@/domain/programs";
import { programPeriods } from "@/components/home/program-periods";

export function ProgramPeriodTabs({ programs }: { programs: Program[] }) {
  const periods = programPeriods(programs);
  const [active, setActive] = useState(periods[0]?.key || "");
  const current = periods.find((p) => p.key === active) ??
    periods[0] ?? { key: "", label: "", programs: [] };

  if (!periods.length)
    return (
      <p className="text-zinc-600">
        Belum ada program kerja yang dipublikasikan.
      </p>
    );

  return (
    <div>
      <div className="relative inline-flex max-w-full flex-wrap rounded-full border border-zinc-200/80 bg-white/80 p-1 shadow-sm backdrop-blur-sm">
        {periods.map((period) => {
          const isSelected = current.key === period.key;
          return (
            <button
              key={period.key}
              type="button"
              onClick={() => setActive(period.key)}
              aria-pressed={isSelected}
              className={`relative z-10 rounded-full px-6 py-2 text-sm font-semibold transition-colors duration-200 ${
                isSelected
                  ? "text-zinc-950"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              {isSelected && (
                <motion.span
                  layoutId="active-period-detail-tab"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  className="absolute inset-0 z-[-1] rounded-full bg-amber-400 shadow-md shadow-amber-400/30"
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
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 grid gap-6 sm:grid-cols-2"
        >
          {current.programs.map((program, idx) => (
            <motion.div
              key={program.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: idx * 0.08,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="group overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-amber-400/60 hover:shadow-xl hover:shadow-zinc-200/60"
            >
              {program.image && (
                <div className="relative aspect-video w-full overflow-hidden bg-zinc-100">
                  <Image
                    src={program.image}
                    alt={program.title}
                    fill
                    sizes="(min-width: 640px) 40vw, 90vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </div>
              )}
              <div className="p-7">
                <div className="inline-flex rounded-xl bg-amber-400/15 p-2.5 text-amber-500 transition-transform duration-300 group-hover:scale-110">
                  <program.icon size={26} weight="bold" />
                </div>
                <h3 className="mt-4 font-heading text-xl font-bold text-zinc-900">
                  {program.title}
                </h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-600">
                  {program.fullDescription || program.body}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
