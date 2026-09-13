import { Hero } from "@/components/home/hero";
import { AboutSection } from "@/components/home/about-section";
import { ProgramKerjaSection } from "@/components/home/program-kerja-section";
import { FungsionarisSection } from "@/components/home/fungsionaris-section";
import { PendaftaranSection } from "@/components/home/pendaftaran-section";
import { GallerySection } from "@/components/home/gallery-section";

export default function Home() {
  return (
    <>
      <Hero />
      <AboutSection />
      <ProgramKerjaSection />
      <FungsionarisSection />
      <GallerySection />
      <PendaftaranSection />
    </>
  );
}
