"use client";

import { useRef, useState } from "react";
import { ContentManager } from "./content-manager";

const tabs = [
  { id: "gallery", label: "Galeri" },
  { id: "hero", label: "Hero beranda" },
] as const;

export function MediaManager({
  initialTab,
}: {
  initialTab: "gallery" | "hero";
}) {
  const [active, setActive] = useState(initialTab);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  function select(index: number, focus = false) {
    const tab = tabs[index].id;
    setActive(tab);
    const url = new URL(window.location.href);
    if (tab === "hero") url.searchParams.set("tab", "hero");
    else url.searchParams.delete("tab");
    window.history.replaceState(null, "", url);
    if (focus) buttons.current[index]?.focus();
  }

  return (
    <>
      <div
        className="admin-media-tabs"
        role="tablist"
        aria-label="Kelola foto website"
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(button) => {
              buttons.current[index] = button;
            }}
            className="admin-button"
            type="button"
            role="tab"
            id={`media-tab-${tab.id}`}
            aria-controls={`media-panel-${tab.id}`}
            aria-selected={active === tab.id}
            tabIndex={active === tab.id ? 0 : -1}
            onClick={() => select(index)}
            onKeyDown={(event) => {
              let next: number;
              if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
              else if (event.key === "ArrowLeft")
                next = (index + tabs.length - 1) % tabs.length;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = tabs.length - 1;
              else return;
              event.preventDefault();
              select(next, true);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`media-panel-${tab.id}`}
          aria-labelledby={`media-tab-${tab.id}`}
          hidden={active !== tab.id}
          tabIndex={0}
        >
          <ContentManager kind={tab.id} />
        </div>
      ))}
    </>
  );
}
