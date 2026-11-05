import { loadEnvConfig } from "@next/env";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import sharp from "sharp";
import { initialHero } from "../src/lib/content-seed";
import { MEDIA_BUCKET, MAX_UPLOAD_BYTES } from "../src/lib/backend-config";

loadEnvConfig(process.cwd());

async function main() {
  const { DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY } =
    process.env;
  if (!DATABASE_URL || !NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SECRET_KEY)
    throw new Error("Konfigurasi Supabase belum lengkap.");
  const storage = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).storage;
  const buckets = await storage.listBuckets();
  if (buckets.error) throw new Error("Bucket belum dapat diperiksa.");
  const existing = buckets.data.find((bucket) => bucket.id === MEDIA_BUCKET);
  if (!existing) {
    const result = await storage.createBucket(MEDIA_BUCKET, {
      public: true,
      allowedMimeTypes: ["image/webp"],
      fileSizeLimit: MAX_UPLOAD_BYTES,
    });
    if (result.error) throw new Error("Bucket media belum dapat dibuat.");
  } else if (!existing.public) {
    throw new Error(
      "Bucket media harus publik; periksa konfigurasi sebelum melanjutkan.",
    );
  }
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: DATABASE_URL }),
  });
  let migrated = 0;
  try {
    for (const entry of initialHero) {
      const hex = createHash("sha256")
        .update(entry.id)
        .digest("hex")
        .slice(0, 32);
      const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
      const old = await prisma.heroSlide.findUnique({ where: { id } });
      if (old && !old.imagePath.startsWith("/")) continue;
      const bytes = await sharp(
        await readFile(join(process.cwd(), "public", entry.imagePath)),
      )
        .rotate()
        .resize({
          width: 2000,
          height: 2000,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 85 })
        .toBuffer();
      if (bytes.byteLength > MAX_UPLOAD_BYTES)
        throw new Error("Foto awal melebihi batas upload.");
      const imagePath = `hero/${entry.id}.webp`;
      const uploaded = await storage
        .from(MEDIA_BUCKET)
        .upload(imagePath, bytes, { contentType: "image/webp", upsert: false });
      if (
        uploaded.error &&
        uploaded.error.message !== "The resource already exists" &&
        String(uploaded.error.statusCode) !== "409"
      )
        throw new Error("Upload foto hero awal gagal.");
      await prisma.heroSlide.upsert({
        where: { id },
        create: {
          id,
          title: entry.title,
          alt: entry.alt,
          sortOrder: entry.sortOrder,
          isPublished: true,
          imagePath,
        },
        update: { imagePath },
      });
      migrated++;
    }
    console.log(
      JSON.stringify({ migrated, heroSlides: await prisma.heroSlide.count() }),
    );
  } finally {
    await prisma.$disconnect();
  }
}
main().catch(() => {
  console.error(
    "Setup hero gagal. Periksa koneksi, migration dan bucket media, lalu jalankan ulang; data yang sudah tersimpan dipertahankan.",
  );
  process.exitCode = 1;
});
