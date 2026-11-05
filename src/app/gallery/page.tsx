import type { Metadata } from "next";
import { DetailHeader } from "@/components/detail/detail-header";
import { GalleryGrid } from "@/components/gallery/gallery-grid";

export const metadata: Metadata = {
  title: "Galeri Kegiatan | HIMA TI",
  description:
    "Dokumentasi momen dari berbagai program kerja dan kegiatan HIMA TI.",
};

import { loadPublicContent } from "@/data/public-content";

export default async function GalleryPage() {
  const { gallery } = await loadPublicContent();
  return (
    <>
      <DetailHeader
        title="Galeri Kegiatan"
        description="Dokumentasi momen dari berbagai program kerja dan kegiatan HIMA TI."
      />

      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <GalleryGrid photos={gallery} initialCount={12} step={12} />
      </section>
    </>
  );
}
