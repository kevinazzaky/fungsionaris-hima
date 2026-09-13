import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

export function DetailHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="bg-zinc-950 px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-white/60 transition-colors hover:text-amber-400"
        >
          <ArrowLeft size={16} weight="bold" />
          Kembali ke Beranda
        </Link>
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-white/70">
          {description}
        </p>
      </div>
    </div>
  );
}
