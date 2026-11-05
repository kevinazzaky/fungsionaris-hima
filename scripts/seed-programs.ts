import { loadEnvConfig } from "@next/env";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { initialPrograms } from "../src/lib/program-seed";
import { MEDIA_BUCKET, MAX_UPLOAD_BYTES } from "../src/lib/backend-config";
loadEnvConfig(process.cwd());

async function main() {
  const { DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY } =
    process.env;
  if (!DATABASE_URL || !NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SECRET_KEY)
    throw new Error("Konfigurasi belum lengkap.");
  const storage = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).storage;
  const buckets = await storage.listBuckets();
  if (buckets.error) throw new Error("Bucket belum dapat dibaca.");
  const bucket = buckets.data.find((item) => item.id === MEDIA_BUCKET);
  if (!bucket) {
    const result = await storage.createBucket(MEDIA_BUCKET, {
      public: true,
      allowedMimeTypes: ["image/webp"],
      fileSizeLimit: MAX_UPLOAD_BYTES,
    });
    if (result.error) throw new Error("Bucket belum dapat dibuat.");
  } else if (!bucket.public) throw new Error("Bucket media harus publik.");
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: DATABASE_URL }),
  });
  let inserted = 0,
    photos = 0;
  try {
    for (const entry of initialPrograms) {
      await db.programPeriod.upsert({
        where: { period: entry.period },
        create: { period: entry.period },
        update: {},
      });
      const hex = createHash("sha256")
        .update(entry.id)
        .digest("hex")
        .slice(0, 32);
      const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
      const old = await db.program.findUnique({ where: { id } });
      if (old && (!old.imagePath || !old.imagePath.startsWith("/"))) continue;
      let imagePath: string | null = null;
      if (entry.imagePath) {
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
        imagePath = `programs/initial-${id}.webp`;
        const result = await storage
          .from(MEDIA_BUCKET)
          .upload(imagePath, bytes, {
            contentType: "image/webp",
            upsert: false,
          });
        if (
          result.error &&
          result.error.message !== "The resource already exists" &&
          String(result.error.statusCode) !== "409"
        )
          throw new Error("Upload foto program gagal.");
        photos++;
      }
      const { id: seedId, imageUrl, ...data } = entry;
      void seedId;
      void imageUrl;
      await db.program.upsert({
        where: { id },
        create: { ...data, id, imagePath },
        update: { imagePath },
      });
      inserted++;
    }
    console.log(
      JSON.stringify({
        migrated: inserted,
        photos,
        programs: await db.program.count(),
      }),
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch(() => {
  console.error(
    "Seed program gagal. Periksa migration, bucket dan file sumber lalu jalankan ulang. Data yang sudah tersimpan dipertahankan.",
  );
  process.exitCode = 1;
});
