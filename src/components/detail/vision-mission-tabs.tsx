"use client";

import { useState } from "react";
import type { ReactNode } from "react";

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
    <div className="overflow-hidden rounded-2xl border border-zinc-200">
      <div className="flex border-b border-zinc-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            aria-pressed={active === tab.key}
            className={`flex-1 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              active === tab.key
                ? "border-amber-500 text-zinc-900"
                : "border-transparent text-zinc-400 hover:text-zinc-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-6 sm:p-8">
        {current.icon}
        <p className="mt-4 text-base leading-relaxed text-zinc-700">
          {current.body}
        </p>
      </div>
    </div>
  );
}
