"use client";

import { createPortal } from "react-dom";
import { PendingLabel } from "./pending-label";

export function NavigationFeedback({ pending }: { pending: boolean }) {
  if (!pending || typeof document === "undefined") return null;
  return createPortal(
    <div className="navigation-feedback" role="status">
      <PendingLabel pending text="Membuka halaman…" />
    </div>,
    document.body,
  );
}
