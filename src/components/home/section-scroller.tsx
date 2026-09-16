"use client";

import { useEffect } from "react";

export function SectionScroller() {
  useEffect(() => {
    const targetId = sessionStorage.getItem("scroll_to_section");
    if (targetId) {
      sessionStorage.removeItem("scroll_to_section");
      const timeout = setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }, 150);
      return () => clearTimeout(timeout);
    }
  }, []);

  return null;
}
