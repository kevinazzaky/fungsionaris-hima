import Image from "next/image";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { GlowButton } from "@/components/ui/glow-button";

const photos = [
  { src: "/gallery/gallery-01.webp", className: "sm:col-span-2 sm:row-span-2" },
  { src: "/gallery/gallery-02.webp", className: "" },
  { src: "/gallery/gallery-03.webp", className: "" },
  { src: "/gallery/gallery-04.webp", className: "" },
  { src: "/gallery/gallery-05.webp", className: "" },
];

export function GallerySection() {
  return (
    <section id="galeri" className="scroll-mt-16 bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="text-center">
          <SectionHeading script="Galeri" bold="Kegiatan" className="text-center" />
        </Reveal>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:grid-rows-2">
          {photos.map((photo, i) => (
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

        <Reveal delay={120 + photos.length * 80} className="mt-10 flex justify-center">
          <GlowButton href="/gallery">Lihat Semua Foto</GlowButton>
        </Reveal>
      </div>
    </section>
  );
}
