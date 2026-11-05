import { MediaManager } from "@/components/admin/media-manager";

export default async function GalleryPage({
  searchParams,
}: PageProps<"/admin/galeri">) {
  const params = await searchParams;
  const tab = params.tab === "hero" ? "hero" : "gallery";
  return <MediaManager key={tab} initialTab={tab} />;
}
