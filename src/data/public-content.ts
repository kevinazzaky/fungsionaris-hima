import "server-only";
import { contentRepository } from "./repositories/content";
import { getPublicContent } from "@/use-cases/public-content";
import {
  initialMembers,
  initialGallery,
  initialHero,
} from "@/lib/content-seed";
import { connection } from "next/server";
import { isDatabaseConfigured } from "@/lib/backend-config";

export async function loadPublicContent() {
  if (!isDatabaseConfigured())
    return {
      members: initialMembers,
      gallery: initialGallery,
      hero: initialHero,
    };
  await connection();
  const [content, hero] = await Promise.all([
    getPublicContent(contentRepository(true)),
    contentRepository(true, "hero").gallery(),
  ]);
  return { ...content, hero };
}
