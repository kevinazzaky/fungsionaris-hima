"use client";

import { useState } from "react";
import Image from "next/image";

interface GalleryGridProps {
  photos: string[];
  initialCount?: number;
  step?: number;
}

export function GalleryGrid({
  photos,
  initialCount = 12,
  step = 12,
}: GalleryGridProps) {
  const [visibleCount, setVisibleCount] = useState(initialCount);

  const visiblePhotos = photos.slice(0, visibleCount);
  const hasMore = visibleCount < photos.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + step, photos.length));
  };

  return (
    <div className="flex flex-col items-center">
      <div className="grid w-full grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
        {visiblePhotos.map((src, index) => (
          <div
            key={src}
            className="group relative h-0 w-full overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-100 pt-[100%] shadow-sm transition-all duration-300 hover:border-amber-400/50 hover:shadow-lg hover:shadow-zinc-300/40"
          >
            <Image
              src={src}
              alt={`Dokumentasi kegiatan HIMA TI #${index + 1}`}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-950/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </div>
        ))}
      </div>

      {hasMore ? (
        <div className="mt-12 flex flex-col items-center gap-3 text-center">
          <p className="text-xs font-medium text-zinc-500">
            Menampilkan {visiblePhotos.length} dari {photos.length} foto
          </p>
          <button
            type="button"
            onClick={handleLoadMore}
            className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-7 py-3.5 text-sm font-bold text-zinc-950 shadow-[0_0_32px_-6px_rgba(251,191,36,0.55)] transition-all duration-200 hover:bg-amber-300 hover:shadow-[0_0_40px_-4px_rgba(251,191,36,0.8)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
          >
            <span>Muat Lebih Banyak</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 256 256"
              fill="currentColor"
              className="transition-transform duration-200"
            >
              <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="mt-12 text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-zinc-50 px-5 py-2 text-xs font-semibold text-zinc-500">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Semua {photos.length} foto telah ditampilkan
          </p>
        </div>
      )}
    </div>
  );
}
