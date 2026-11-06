"use client";

import { useState } from "react";
import Image from "next/image";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";

import { usePublicContent } from "@/components/public-content-provider";

const PREVIEW_COUNT = 8;

export function GallerySection() {
  const [showAll, setShowAll] = useState(false);
  const { gallery } = usePublicContent();
  const previewPhotos = gallery.slice(0, PREVIEW_COUNT);

  if (gallery.length === 0) return <section id="galeri" className="bg-white px-6 py-20 text-center"><SectionHeading script="Galeri" bold="Kegiatan" /><p className="mt-6 text-zinc-600">Belum ada dokumentasi kegiatan yang dipublikasikan.</p></section>;

  return (
    <section id="galeri" className="scroll-mt-16 bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="text-center">
          <SectionHeading script="Galeri" bold="Kegiatan" className="text-center" />
        </Reveal>

        {/* Preview grid: 8 uniform photos */}
        {!showAll && (
          <div className="mt-10 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
            {previewPhotos.map((photo, i) => (
              <Reveal
                key={photo.id}
                delay={80 + i * 40}
                className="group relative h-0 w-full overflow-hidden rounded-2xl border border-zinc-200/80 pt-[100%] shadow-sm transition-all duration-300 hover:border-amber-400/50 hover:shadow-lg hover:shadow-zinc-300/40"
              >
                <Image
                  src={photo.imageUrl}
                  alt={photo.alt}
                  fill
                  sizes="(min-width: 640px) 25vw, 50vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-950/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </Reveal>
            ))}
          </div>
        )}

        {/* Full grid with AnimatePresence */}
        {showAll && (
          <div className="mt-10 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
            {gallery.map((photo, i) => (
              <Reveal
                key={photo.id}
                delay={40 + i * 30}
                className="group relative h-0 w-full overflow-hidden rounded-2xl border border-zinc-200/80 pt-[100%] shadow-sm transition-all duration-300 hover:border-amber-400/50 hover:shadow-lg hover:shadow-zinc-300/40"
              >
                <Image
                  src={photo.imageUrl}
                  alt={photo.alt}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-950/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </Reveal>
            ))}
          </div>
        )}

        <Reveal delay={120} className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => setShowAll((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-7 py-3.5 text-sm font-bold text-zinc-950 shadow-[0_0_32px_-6px_rgba(251,191,36,0.55)] transition-all duration-200 hover:bg-amber-300 hover:shadow-[0_0_40px_-4px_rgba(251,191,36,0.8)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
          >
            {showAll ? "Sembunyikan" : `Lihat Semua Foto (${gallery.length})`}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 256 256"
              fill="currentColor"
              className={`transition-transform duration-300 ${showAll ? "rotate-180" : ""}`}
            >
              <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z" />
            </svg>
          </button>
        </Reveal>
      </div>
    </section>
  );
}
