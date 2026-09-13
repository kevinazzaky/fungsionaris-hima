import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

export function GlowButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-zinc-950 shadow-[0_0_32px_-6px_rgba(251,191,36,0.55)] transition-all hover:bg-amber-300 hover:shadow-[0_0_40px_-4px_rgba(251,191,36,0.75)]"
    >
      {children}
      <ArrowRight size={16} weight="bold" />
    </Link>
  );
}
