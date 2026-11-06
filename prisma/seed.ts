import { loadEnvConfig } from "@next/env";
import { createHash } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { initialMembers, initialGallery } from "../src/lib/content-seed";

loadEnvConfig(process.cwd());

function stableId(key: string) {
  const hex = createHash("sha256").update(key).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function main() {
  if (!process.env.DATABASE_URL)
    throw new Error("Isi DATABASE_URL di .env.local terlebih dahulu.");
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const [members, gallery] = await prisma.$transaction([
      prisma.member.createMany({
        data: initialMembers.map(({ id, ...person }) => ({
          ...person,
          id: stableId(id),
        })),
        skipDuplicates: true,
      }),
      prisma.galleryPhoto.createMany({
        data: initialGallery.map(
          ({ id, title, alt, imagePath, sortOrder, isPublished }) => ({
            id: stableId(id),
            title,
            alt,
            imagePath,
            sortOrder,
            isPublished,
          }),
        ),
        skipDuplicates: true,
      }),
    ]);
    console.log(
      `Konten awal: ${members.count} fungsionaris dan ${gallery.count} foto ditambahkan. Data yang sudah ada tidak ditimpa.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Seed gagal.");
  process.exitCode = 1;
});
