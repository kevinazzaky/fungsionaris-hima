"use client";

import { useState } from "react";
import Image from "next/image";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";

const allPhotos = Array.from(
  { length: 14 },
  (_, i) => `/gallery/gallery-${String(i + 1).padStart(2, "0")}.webp`,
);

const PREVIEW_COUNT = 5;

const previewPhotos = [
  { src: allPhotos[7], className: "sm:col-span-2 sm:row-span-2" },
  { src: allPhotos[1], className: "" },
  { src: allPhotos[2], className: "" },
  { src: allPhotos[3], className: "" },
  { src: allPhotos[4], className: "" },
];

export function GallerySection() {
  const [showAll, setShowAll] = useState(false);

  return (
    <section id="galeri" className="scroll-mt-16 bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="text-center">
          <SectionHeading script="Galeri" bold="Kegiatan" className="text-center" />
        </Reveal>

        {/* Preview grid */}
        {!showAll && (
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:grid-rows-2">
            {previewPhotos.map((photo, i) => (
              <Reveal
                key={photo.src}
                delay={120 + i * 80}
                className={`relative h-0 w-full overflow-hidden rounded-xl pt-[100%] ${photo.className}`}
              >
                <Image
                  src={photo.src}
                  alt="Dokumentasi kegiatan HIMA TI"
                  fill
                  sizes="(min-width: 640px) 25vw, 50vw"
                  className="object-cover transition-transform duration-500 hover:scale-105"
                />
              </Reveal>
            ))}
          </div>
        )}

        {/* Full grid */}
        {showAll && (
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {allPhotos.map((src, i) => (
              <Reveal
                key={src}
                delay={60 + i * 40}
                className="relative h-0 w-full overflow-hidden rounded-xl pt-[100%]"
              >
                <Image
                  src={src}
                  alt="Dokumentasi kegiatan HIMA TI"
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                  className="object-cover transition-transform duration-500 hover:scale-105"
                />
              </Reveal>
            ))}
          </div>
        )}

        <Reveal delay={120 + PREVIEW_COUNT * 80} className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => setShowAll((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-zinc-950 shadow-[0_0_32px_-6px_rgba(251,191,36,0.55)] transition-all hover:bg-amber-300 hover:shadow-[0_0_40px_-4px_rgba(251,191,36,0.75)]"
          >
            {showAll ? "Sembunyikan" : "Lihat Semua Foto"}
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
