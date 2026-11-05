"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export function HeroSlideshow({
  images,
  interval = 5000,
}: {
  images: { src: string; alt: string }[];
  interval?: number;
}) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = setInterval(() => {
      setActive((i) => (i + 1) % images.length);
    }, interval);
    return () => clearInterval(id);
  }, [images.length, interval]);

  return (
    <>
      {images.map(({ src, alt }, i) => (
        <Image
          key={src}
          src={src}
          alt={alt}
          fill
          priority={i === 0}
          sizes="100vw"
          className={`object-cover transition-opacity duration-1000 ease-in-out motion-reduce:animate-none motion-reduce:transition-none ${
            i === active ? "opacity-100" : "opacity-0"
          } ${i === 0 ? "animate-hero-image" : ""}`}
        />
      ))}

      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
          {images.map(({ src }, i) => (
            <button
              key={src}
              type="button"
              aria-label={`Tampilkan foto ${i + 1}`}
              onClick={() => setActive(i)}
              aria-pressed={i === active}
              className={`relative flex h-11 w-11 items-center justify-center after:h-2 after:rounded-full after:transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
                i === active
                  ? "after:w-6 after:bg-amber-400"
                  : "after:w-2 after:bg-white/40 hover:after:bg-white/60"
              }`}
            />
          ))}
        </div>
      )}
    </>
  );
}
