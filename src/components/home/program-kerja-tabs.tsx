"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  ArrowRight,
  Info,
  CaretLeft,
  CaretRight,
} from "@phosphor-icons/react/dist/ssr";
import { motion, AnimatePresence } from "motion/react";
import {
  ProgramModal,
  type ProgramItem,
} from "@/components/home/program-modal";

import type { Program } from "@/domain/programs";
import { programPeriods } from "./program-periods";

export function ProgramKerjaTabs({ programs }: { programs: Program[] }) {
  const periods = programPeriods(programs);
  const [active, setActive] = useState(periods[0]?.key || "");
  const [selectedProgram, setSelectedProgram] = useState<ProgramItem | null>(
    null,
  );
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const current = periods.find((p) => p.key === active) ??
    periods[0] ?? { key: "", label: "", programs: [] };
  const programCount = current.programs.length;

  const checkScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const atEnd = scrollLeft >= scrollWidth - clientWidth - 6;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(!atEnd);

    const card = el.querySelector<HTMLElement>("[data-proker-card]");
    if (card) {
      const cardWidth = card.offsetWidth + 20;
      const maxIndex = programCount - 1;
      const index = atEnd ? maxIndex : Math.round(scrollLeft / cardWidth);
      setActiveIndex(Math.max(0, Math.min(index, maxIndex)));
    }
  }, [programCount]);

  const handleTabChange = (key: string) => {
    setActive(key);
    setActiveIndex(0);
    setCanScrollLeft(false);
    setCanScrollRight(true);
    const el = scrollContainerRef.current;
    if (el) el.scrollTo({ left: 0, behavior: "instant" });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      checkScroll();
    }, 100);

    return () => clearTimeout(timer);
  }, [active, checkScroll]);

  useEffect(() => {
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [checkScroll]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-proker-card]");
    const cardWidth = card ? card.offsetWidth + 20 : el.clientWidth * 0.8;
    el.scrollBy({
      left: direction === "left" ? -cardWidth : cardWidth,
      behavior: "smooth",
    });
  };

  const scrollToIndex = (index: number) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const cards = el.querySelectorAll<HTMLElement>("[data-proker-card]");
    if (cards[index]) {
      cards[index].scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "start",
      });
    }
  };

  if (!periods.length)
    return (
      <p className="text-center text-zinc-600">
        Belum ada program kerja yang dipublikasikan.
      </p>
    );

  return (
    <div>
      {/* Sliding Pill Tab Switcher */}
      <div className="flex justify-center">
        <div className="relative inline-flex max-w-full flex-wrap justify-center rounded-full border border-zinc-200/80 bg-white/80 p-1 shadow-sm backdrop-blur-sm">
          {periods.map((period) => {
            const isSelected = current.key === period.key;
            return (
              <button
                key={period.key}
                type="button"
                onClick={() => handleTabChange(period.key)}
                aria-pressed={isSelected}
                className={`relative z-10 rounded-full px-6 py-2 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                  isSelected
                    ? "text-zinc-950"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                {isSelected && (
                  <motion.span
                    layoutId="active-period-pill"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className="absolute inset-0 z-[-1] rounded-full bg-amber-400 shadow-md shadow-amber-400/30"
                  />
                )}
                {period.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Carousel Container with Arrow Navigation */}
      <div className="relative mt-8">
        {/* Left Arrow Button */}
        <button
          type="button"
          onClick={() => scroll("left")}
          disabled={!canScrollLeft}
          aria-label="Geser ke program kerja sebelumnya"
          className={`absolute -left-3 sm:-left-5 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-zinc-200/90 bg-white/95 text-zinc-800 shadow-xl backdrop-blur-md transition-all duration-200 hover:bg-amber-400 hover:border-amber-400 hover:text-zinc-950 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
            !canScrollLeft
              ? "pointer-events-none opacity-0"
              : "opacity-100 cursor-pointer"
          }`}
        >
          <CaretLeft size={22} weight="bold" />
        </button>

        {/* Animated Carousel List */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current.key}
            ref={scrollContainerRef}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            onScroll={checkScroll}
            tabIndex={0}
            role="region"
            aria-label={`Daftar program kerja periode ${current.label}`}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") {
                e.preventDefault();
                scroll("left");
              } else if (e.key === "ArrowRight") {
                e.preventDefault();
                scroll("right");
              }
            }}
            className="flex gap-5 overflow-x-auto scroll-smooth snap-x snap-mandatory py-4 px-1 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {current.programs.map((program, i) =>
              program.image ? (
                <motion.button
                  key={program.id}
                  type="button"
                  data-proker-card
                  onClick={() => setSelectedProgram(program)}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.4,
                    delay: i * 0.08,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="group relative aspect-[3/4] w-[85%] max-w-[340px] sm:w-[calc((100%-20px)/2)] sm:max-w-none lg:w-[calc((100%-40px)/3)] shrink-0 snap-start cursor-pointer overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-900 text-left shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-amber-400/60 hover:shadow-xl hover:shadow-amber-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
                  aria-haspopup="dialog"
                  aria-label={`Lihat rincian program ${program.title}`}
                >
                  <Image
                    src={program.image}
                    alt={program.title}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 85vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent transition-opacity duration-300 group-hover:opacity-90" />

                  {/* Status Beacon on Top */}
                  <div className="absolute left-4 top-4 z-10">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold backdrop-blur-md ${
                        program.status === "open"
                          ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40"
                          : program.status === "upcoming"
                            ? "bg-amber-950/80 text-amber-300 border border-amber-500/40"
                            : "bg-zinc-900/85 text-zinc-300 border border-zinc-700/50"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          program.status === "open"
                            ? "bg-emerald-400 animate-pulse"
                            : program.status === "upcoming"
                              ? "bg-amber-400"
                              : "bg-zinc-400"
                        }`}
                      />
                      {program.statusText}
                    </span>
                  </div>

                  {/* Card Content at Bottom */}
                  <div className="relative z-10 flex h-full flex-col justify-end p-5">
                    <h3 className="font-heading text-base font-bold uppercase tracking-tight text-white transition-colors group-hover:text-amber-300 sm:text-lg">
                      {program.title}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-zinc-300 line-clamp-2">
                      {program.body}
                    </p>

                    <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 transition-transform group-hover:translate-x-1">
                      <span>Lihat Detail Program</span>
                      <ArrowRight size={13} weight="bold" />
                    </div>
                  </div>
                </motion.button>
              ) : (
                <motion.button
                  key={program.id}
                  type="button"
                  data-proker-card
                  onClick={() => setSelectedProgram(program)}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.4,
                    delay: i * 0.08,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="group relative flex aspect-[3/4] w-[85%] max-w-[340px] sm:w-[calc((100%-20px)/2)] sm:max-w-none lg:w-[calc((100%-40px)/3)] shrink-0 snap-start cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-amber-400/50 hover:shadow-xl hover:shadow-amber-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
                  aria-haspopup="dialog"
                  aria-label={`Lihat rincian program ${program.title}`}
                >
                  {/* Status Beacon Top */}
                  <div className="absolute top-5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold tracking-wider ${
                        program.status === "open"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : program.status === "upcoming"
                            ? "bg-amber-50 text-amber-900 border border-amber-200"
                            : "bg-zinc-100 text-zinc-700 border border-zinc-200"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          program.status === "open"
                            ? "bg-emerald-500 animate-pulse"
                            : program.status === "upcoming"
                              ? "bg-amber-500"
                              : "bg-zinc-400"
                        }`}
                      />
                      {program.statusText}
                    </span>
                  </div>

                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-500 transition-transform duration-300 group-hover:scale-110">
                    <program.icon size={28} weight="bold" />
                  </div>

                  <h3 className="font-heading mt-4 text-base font-bold text-zinc-900 transition-colors group-hover:text-amber-600 sm:text-lg">
                    {program.title}
                  </h3>

                  {program.executionDate ? (
                    <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-amber-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      {program.executionDate}
                    </p>
                  ) : null}

                  <p className="mt-2 text-xs leading-relaxed text-zinc-600 line-clamp-3">
                    {program.body}
                  </p>

                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-zinc-900 transition-colors group-hover:text-amber-600">
                    <Info size={14} weight="bold" className="text-amber-500" />
                    Lihat Detail
                    <ArrowRight
                      size={13}
                      weight="bold"
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </span>
                </motion.button>
              ),
            )}
          </motion.div>
        </AnimatePresence>

        {/* Right Arrow Button */}
        <button
          type="button"
          onClick={() => scroll("right")}
          disabled={!canScrollRight}
          aria-label="Geser ke program kerja berikutnya"
          className={`absolute -right-3 sm:-right-5 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-zinc-200/90 bg-white/95 text-zinc-800 shadow-xl backdrop-blur-md transition-all duration-200 hover:bg-amber-400 hover:border-amber-400 hover:text-zinc-950 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
            !canScrollRight
              ? "pointer-events-none opacity-0"
              : "opacity-100 cursor-pointer"
          }`}
        >
          <CaretRight size={22} weight="bold" />
        </button>
      </div>

      {/* Pagination dots indicator */}
      <div className="mt-4 flex items-center justify-center gap-2">
        {current.programs.map((program, idx) => {
          const isActive = idx === activeIndex;
          return (
            <button
              key={program.id}
              type="button"
              onClick={() => scrollToIndex(idx)}
              aria-label={`Lihat program ${idx + 1}: ${program.title}`}
              className={`h-2 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                isActive
                  ? "w-7 bg-amber-400 shadow-sm shadow-amber-400/40"
                  : "w-2 bg-zinc-300 hover:bg-zinc-400"
              }`}
            />
          );
        })}
      </div>

      {/* Program Detail Popup Modal */}
      <ProgramModal
        program={selectedProgram}
        onClose={() => setSelectedProgram(null)}
      />
    </div>
  );
}
