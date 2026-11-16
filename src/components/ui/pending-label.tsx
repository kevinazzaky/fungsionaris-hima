import type { PropsWithChildren } from "react";

export function PendingLabel({ pending, text = "Memproses…", children }: PropsWithChildren<{
  pending: boolean;
  text?: string;
}>) {
  if (!pending) return children;
  return <span className="pending-label">
    <svg width="18" height="18" viewBox="0 0 24 24" className="pending-spinner" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
    <span>{text}</span>
  </span>;
}
