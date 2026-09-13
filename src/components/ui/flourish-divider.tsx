export function FlourishDivider() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto flex max-w-xs items-center gap-4 px-6 text-amber-400/60"
    >
      <svg viewBox="0 0 100 4" className="h-1 flex-1" preserveAspectRatio="none">
        <line x1="0" y1="2" x2="100" y2="2" stroke="currentColor" strokeWidth="1" />
      </svg>
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 rotate-45">
        <rect x="1" y="1" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" />
      </svg>
      <svg viewBox="0 0 100 4" className="h-1 flex-1" preserveAspectRatio="none">
        <line x1="0" y1="2" x2="100" y2="2" stroke="currentColor" strokeWidth="1" />
      </svg>
    </div>
  );
}
