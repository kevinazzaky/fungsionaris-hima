export function ProfileAvatar() {
  return (
    <div className="absolute inset-0 flex items-end justify-center overflow-hidden bg-zinc-700">
      <svg
        viewBox="0 0 100 80"
        xmlns="http://www.w3.org/2000/svg"
        className="w-[75%] translate-y-[8%]"
        aria-hidden="true"
      >
        {/* Head */}
        <circle cx="50" cy="22" r="18" fill="#a1a1aa" />
        {/* Shoulders */}
        <ellipse cx="50" cy="72" rx="36" ry="28" fill="#a1a1aa" />
      </svg>
    </div>
  );
}
