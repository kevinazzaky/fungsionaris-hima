import Image from "next/image";
import { DetailHeader } from "@/components/detail/detail-header";

const photos = Array.from(
  { length: 14 },
  (_, i) => `/gallery/gallery-${String(i + 1).padStart(2, "0")}.webp`,
);

export default function GalleryPage() {
  return (
    <>
      <DetailHeader
        title="Galeri Kegiatan"
        description="Dokumentasi momen dari berbagai program kerja dan kegiatan HIMA TI."
      />

      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((src) => (
            <div
              key={src}
              className="relative h-0 w-full overflow-hidden rounded-xl pt-[100%]"
            >
              <Image
                src={src}
                alt="Dokumentasi kegiatan HIMA TI"
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                className="object-cover transition-transform duration-500 hover:scale-105"
              />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
