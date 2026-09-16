"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";

type Tab = {
  key: string;
  label: string;
  icon: ReactNode;
  body: string;
};

export function VisionMissionTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0].key);
  const current = tabs.find((tab) => tab.key === active) ?? tabs[0];

  return (
    <div className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-sm">
      <div className="relative flex border-b border-zinc-200/80 bg-zinc-50/50">
        {tabs.map((tab) => {
          const isSelected = active === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              aria-pressed={isSelected}
              className={`relative flex-1 py-4 text-center text-sm font-bold transition-colors duration-200 ${
                isSelected ? "text-zinc-950" : "text-zinc-400 hover:text-zinc-700"
              }`}
            >
              {tab.label}
              {isSelected && (
                <motion.div
                  layoutId="active-vm-indicator"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-amber-400 shadow-[0_-1px_6px_rgba(251,191,36,0.5)]"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="p-7 sm:p-10 min-h-[160px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex rounded-xl bg-amber-400/15 p-2.5 text-amber-500">
              {current.icon}
            </div>
            <p className="mt-4 text-base leading-relaxed text-zinc-600 sm:text-lg">
              {current.body}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
