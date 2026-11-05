import { Hero } from "@/components/home/hero";
import { AboutSection } from "@/components/home/about-section";
import { ProgramKerjaSection } from "@/components/home/program-kerja-section";
import { FungsionarisSection } from "@/components/home/fungsionaris-section";
import { PendaftaranSection } from "@/components/home/pendaftaran-section";
import { GallerySection } from "@/components/home/gallery-section";
import { SectionScroller } from "@/components/home/section-scroller";
import { loadPublicContent } from "@/data/public-content";
import { PublicContentProvider } from "@/components/public-content-provider";

import { loadPrograms } from "@/data/programs";

import { loadRegistrationSettings } from "@/data/registration-settings";

export default async function Home() {
  const [content, programs, registration] = await Promise.all([
    loadPublicContent(),
    loadPrograms(),
    loadRegistrationSettings(),
  ]);
  return (
    <PublicContentProvider {...content}>
      <SectionScroller />
      <Hero images={content.hero} />
      <AboutSection />
      <FungsionarisSection />
      <ProgramKerjaSection programs={programs} />
      <GallerySection />
      <PendaftaranSection
        isOpen={registration.isOpen}
        period={process.env.REGISTRATION_PERIOD || "2026"}
      />
    </PublicContentProvider>
  );
}
