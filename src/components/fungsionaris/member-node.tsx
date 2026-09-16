import { useId } from "react";
import Image from "next/image";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import type { Person } from "@/lib/fungsionaris-data";

interface MemberNodeProps {
  person: Person;
  size?: "lg" | "md" | "sm";
  highlight?: boolean;
}

export function MemberNode({
  person,
  size = "md",
  highlight = false,
}: MemberNodeProps) {
  const gradientId = useId();

  const sizeConfig = {
    lg: {
      container: "w-[136px] h-[136px] sm:w-[160px] sm:h-[160px]",
      nameText: "text-sm sm:text-base max-w-[210px]",
      roleText: "text-xs sm:text-sm",
    },
    md: {
      container: "w-[110px] h-[110px] sm:w-[128px] sm:h-[128px]",
      nameText: "text-xs sm:text-sm max-w-[170px]",
      roleText: "text-[11px] sm:text-xs",
    },
    sm: {
      container: "w-[88px] h-[88px] sm:w-[102px] sm:h-[102px]",
      nameText: "text-xs max-w-[140px]",
      roleText: "text-[10px] sm:text-[11px]",
    },
  }[size];

  return (
    <div className="group flex flex-col items-center text-center transition-transform duration-300 hover:-translate-y-1.5">
      {/* Frame Container */}
      <div className={`relative ${sizeConfig.container} flex items-center justify-center`}>
        {/* Ambient Glow for Highlight / Pimpinan */}
        {highlight && (
          <div className="absolute inset-2 rounded-full bg-amber-400/25 blur-md transition-all duration-500 group-hover:bg-amber-400/40 group-hover:blur-lg" />
        )}

        {/* Circular Avatar Photo (Center) */}
        <div className="absolute inset-[13%] overflow-hidden rounded-full border-2 border-white bg-zinc-900 shadow-md">
          {person.photo ? (
            <Image
              src={person.photo}
              alt={person.name}
              fill
              sizes="(min-width: 640px) 150px, 100px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="relative h-full w-full">
              <ProfileAvatar />
            </div>
          )}
        </div>

        {/* Outer Tech Horizon Crest SVG Frame */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full transition-transform duration-700 ease-out group-hover:rotate-45"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`${gradientId}-gold`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="35%" stopColor="#f59e0b" />
              <stop offset="70%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id={`${gradientId}-silver`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f4f4f5" />
              <stop offset="50%" stopColor="#d4d4d8" />
              <stop offset="100%" stopColor="#a1a1aa" />
            </linearGradient>
          </defs>

          {/* 1. Fine Orbital Tech Track with dashes */}
          <circle
            cx="100"
            cy="100"
            r="94"
            stroke={highlight ? `url(#${gradientId}-gold)` : "#e4e4e7"}
            strokeWidth={highlight ? "1.5" : "1"}
            strokeDasharray={highlight ? "3 5" : "2 6"}
            strokeOpacity={highlight ? "0.75" : "0.6"}
            className="transition-all duration-500 group-hover:stroke-amber-400 group-hover:stroke-opacity-100"
          />

          {/* 2. Dual Aerodynamic Horizon Curves (Reinvensi Innovation Arcs) */}
          {/* Top-Right Sweep */}
          <path
            d="M 100 12 A 88 88 0 0 1 188 100"
            stroke={highlight ? `url(#${gradientId}-gold)` : "#cbd5e1"}
            strokeWidth={highlight ? "4" : "2.5"}
            strokeLinecap="round"
            className="transition-all duration-500 group-hover:stroke-amber-500"
          />
          {/* Bottom-Left Sweep */}
          <path
            d="M 100 188 A 88 88 0 0 1 12 100"
            stroke={highlight ? `url(#${gradientId}-gold)` : "#cbd5e1"}
            strokeWidth={highlight ? "4" : "2.5"}
            strokeLinecap="round"
            className="transition-all duration-500 group-hover:stroke-amber-500"
          />

          {/* 3. Four Cardinal Precision Diamond Pips */}
          {/* North */}
          <polygon
            points="100,3 103,9 100,15 97,9"
            fill={highlight ? "#f59e0b" : "#94a3b8"}
            className="transition-colors duration-300 group-hover:fill-amber-500"
          />
          {/* East */}
          <polygon
            points="197,100 191,103 185,100 191,97"
            fill={highlight ? "#f59e0b" : "#94a3b8"}
            className="transition-colors duration-300 group-hover:fill-amber-500"
          />
          {/* South */}
          <polygon
            points="100,197 103,191 100,185 97,191"
            fill={highlight ? "#f59e0b" : "#94a3b8"}
            className="transition-colors duration-300 group-hover:fill-amber-500"
          />
          {/* West */}
          <polygon
            points="3,100 9,103 15,100 9,97"
            fill={highlight ? "#f59e0b" : "#94a3b8"}
            className="transition-colors duration-300 group-hover:fill-amber-500"
          />

          {/* 4. Inner Ring Hugging Photo */}
          <circle
            cx="100"
            cy="100"
            r="75"
            stroke={highlight ? `url(#${gradientId}-gold)` : "#e2e8f0"}
            strokeWidth={highlight ? "2" : "1.5"}
            fill="none"
            className="transition-all duration-500 group-hover:stroke-amber-400"
          />
        </svg>
      </div>

      {/* Identitas Nama & Jabatan */}
      <div className="mt-3 flex flex-col items-center">
        <p
          className={`font-heading font-bold leading-tight text-zinc-900 transition-colors group-hover:text-amber-600 ${sizeConfig.nameText}`}
        >
          {person.name}
        </p>
        <span
          className={`mt-1.5 inline-block rounded-full font-semibold transition-colors ${
            highlight
              ? "border border-amber-300/80 bg-amber-50 px-2.5 py-0.5 text-xs text-amber-800 shadow-sm"
              : "border border-zinc-200/80 bg-zinc-50 px-2 py-0.5 text-[11px] text-zinc-600 group-hover:border-amber-300 group-hover:bg-amber-50 group-hover:text-amber-800"
          } ${sizeConfig.roleText}`}
        >
          {person.role}
        </span>
      </div>
    </div>
  );
}
