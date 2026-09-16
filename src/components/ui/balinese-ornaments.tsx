import { useId } from "react";

/**
 * Divider Ornamen Khas Bali (Padma & Patra Punggel)
 * Digunakan sebagai pemisah elegan di bawah judul section atau kartu.
 */
export function BalineseDivider({
  className = "",
  light = false,
}: {
  className?: string;
  light?: boolean;
}) {
  const id = useId();

  return (
    <div
      className={`flex items-center justify-center gap-3 py-2 select-none pointer-events-none ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 320 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-64 sm:w-80"
      >
        <defs>
          <linearGradient id={`${id}-left`} x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={light ? "#fbbf24" : "#d97706"} />
            <stop offset="60%" stopColor={light ? "#fbbf24" : "#f59e0b"} stopOpacity="0.8" />
            <stop offset="100%" stopColor={light ? "#fbbf24" : "#f59e0b"} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${id}-right`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={light ? "#fbbf24" : "#d97706"} />
            <stop offset="60%" stopColor={light ? "#fbbf24" : "#f59e0b"} stopOpacity="0.8" />
            <stop offset="100%" stopColor={light ? "#fbbf24" : "#f59e0b"} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${id}-center`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>

        {/* Garis Gradien Kiri */}
        <line x1="10" y1="14" x2="115" y2="14" stroke={`url(#${id}-left)`} strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="115" cy="14" r="2" fill={light ? "#fbbf24" : "#d97706"} />
        <circle cx="10" cy="14" r="1.5" fill={light ? "#fbbf24" : "#f59e0b"} opacity="0.5" />

        {/* Daun Patra Punggel Kiri (Ukiran Melengkung Khas Bali) */}
        <path
          d="M 124 14 C 130 9 135 7 142 10 C 147 12 145 16 140 17 C 136 18 132 15 135 12"
          stroke={light ? "#fde68a" : "#d97706"}
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />

        {/* Padma / Lotus Tengah (Simbol Kemuliaan & Kearifan Bali) */}
        {/* Kelopak Pusat */}
        <path
          d="M 160 4 C 156 9 156 16 160 22 C 164 16 164 9 160 4 Z"
          fill={`url(#${id}-center)`}
        />
        {/* Kelopak Samping Kiri */}
        <path
          d="M 160 14 C 153 9 146 11 148 18 C 151 21 156 19 160 16 Z"
          fill={light ? "#fde68a" : "#f59e0b"}
        />
        {/* Kelopak Samping Kanan */}
        <path
          d="M 160 14 C 167 9 174 11 172 18 C 169 21 164 19 160 16 Z"
          fill={light ? "#fde68a" : "#f59e0b"}
        />
        {/* Inti Permata Bunga (Bindu) */}
        <circle cx="160" cy="14" r="2.5" fill="#fef08a" />

        {/* Daun Patra Punggel Kanan (Ukiran Melengkung Khas Bali) */}
        <path
          d="M 196 14 C 190 9 185 7 178 10 C 173 12 175 16 180 17 C 184 18 188 15 185 12"
          stroke={light ? "#fde68a" : "#d97706"}
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />

        {/* Garis Gradien Kanan */}
        <circle cx="205" cy="14" r="2" fill={light ? "#fbbf24" : "#d97706"} />
        <line x1="205" y1="14" x2="310" y2="14" stroke={`url(#${id}-right)`} strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="310" cy="14" r="1.5" fill={light ? "#fbbf24" : "#f59e0b"} opacity="0.5" />
      </svg>
    </div>
  );
}

/**
 * Ornamen Sudut Ukiran Bali (Patra Punggel Corner)
 * Ditempelkan pada sudut-sudut kartu/kontainer untuk sentuhan arsitektur khas Bali.
 */
export function BalineseCorner({
  position = "top-left",
  className = "",
  size = 48,
}: {
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  className?: string;
  size?: number;
}) {
  const rotationClasses = {
    "top-left": "",
    "top-right": "rotate-90",
    "bottom-right": "rotate-180",
    "bottom-left": "-rotate-90",
  }[position];

  return (
    <div
      className={`pointer-events-none absolute select-none text-amber-500/30 transition-colors duration-300 group-hover:text-amber-500/60 ${rotationClasses} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full"
      >
        {/* Garis Bingkai Sudut Utama */}
        <path
          d="M 2 32 L 2 4 C 2 2.9 2.9 2 4 2 L 32 2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* Spiral Patra Punggel Utama */}
        <path
          d="M 6 6 C 14 6 22 10 26 18 C 29 25 25 32 18 31 C 12 30 11 23 16 19 C 20 16 24 19 22 23"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* Daun Tunas Kecil (Kuping Gajah Bali) */}
        <path
          d="M 6 6 C 6 14 10 22 18 26"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <circle cx="5" cy="5" r="2" fill="currentColor" />
        <circle cx="34" cy="2" r="1.5" fill="currentColor" />
        <circle cx="2" cy="34" r="1.5" fill="currentColor" />
      </svg>
    </div>
  );
}

/**
 * Mandala Motif Bunga Padma Bali (Watermark Background)
 * Digunakan sebagai latar belakang halus bertekstur kearifan lokal.
 */
export function BalineseWatermark({
  className = "",
  size = 280,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <div
      className={`pointer-events-none absolute select-none text-amber-500/5 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full"
      >
        {/* 8 Kelopak Padma Melingkar */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
          <g key={angle} transform={`rotate(${angle} 100 100)`}>
            {/* Kelopak Utama */}
            <path
              d="M 100 20 C 88 50 88 78 100 95 C 112 78 112 50 100 20 Z"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="currentColor"
              fillOpacity="0.3"
            />
            {/* Ujung Kuncup Patra */}
            <circle cx="100" cy="18" r="3" fill="currentColor" />
            <path
              d="M 100 45 C 93 60 93 72 100 82 C 107 72 107 60 100 45"
              stroke="currentColor"
              strokeWidth="1"
            />
          </g>
        ))}
        {/* Cincin Konsentris Tengah */}
        <circle cx="100" cy="100" r="32" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 4" />
        <circle cx="100" cy="100" r="18" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="6" fill="currentColor" />
      </svg>
    </div>
  );
}
