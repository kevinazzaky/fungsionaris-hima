import "server-only";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import {
  MAX_UPLOAD_BYTES,
  MEDIA_BUCKET,
  REGISTRATION_BUCKET,
} from "@/lib/backend-config";
import { ValidationError } from "@/domain/admin";

function storageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Supabase Storage belum dikonfigurasi.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).storage;
}

export function mediaUrl(path: string) {
  if (path.startsWith("/") && !path.startsWith("//")) return path;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) throw new Error("Supabase URL belum dikonfigurasi.");
  return `${base}/storage/v1/object/public/${MEDIA_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

export async function uploadImage(
  file: File,
  folder: "members" | "gallery" | "hero" | "programs",
) {
  if (!file.size || file.size > MAX_UPLOAD_BYTES)
    throw new ValidationError("Foto maksimal 3 MB.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new ValidationError("Foto harus JPG, PNG, atau WebP.");
  let bytes: Buffer;
  try {
    bytes = await sharp(Buffer.from(await file.arrayBuffer()), {
      limitInputPixels: 40000000,
    })
      .rotate()
      .resize({
        width: 2000,
        height: 2000,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    throw new ValidationError("Berkas tidak dapat dibaca sebagai foto.");
  }
  if (bytes.byteLength > MAX_UPLOAD_BYTES)
    throw new ValidationError(
      "Foto hasil kompresi masih melebihi 3 MB. Kurangi resolusi foto.",
    );
  const path = `${folder}/${crypto.randomUUID()}.webp`;
  const { error } = await storageClient()
    .from(MEDIA_BUCKET)
    .upload(path, bytes, { contentType: "image/webp", upsert: false });
  if (error) throw new Error("Gagal mengunggah foto ke storage.");
  return path;
}

export async function uploadRegistrationFile(file: File) {
  if (!file.size || file.size > MAX_UPLOAD_BYTES)
    throw new ValidationError("PDF maksimal 3 MB.");
  const bytes = Buffer.from(await file.arrayBuffer());
  if (
    file.type !== "application/pdf" ||
    bytes.subarray(0, 5).toString() !== "%PDF-"
  ) {
    throw new ValidationError("Berkas harus berupa PDF yang valid.");
  }
  const path = `${crypto.randomUUID()}.pdf`;
  const { error } = await storageClient()
    .from(REGISTRATION_BUCKET)
    .upload(path, bytes, { contentType: "application/pdf", upsert: false });
  if (error) throw new Error("Gagal menyimpan berkas pendaftaran.");
  return path;
}

export async function removeFile(bucket: string, path: string) {
  if (path.startsWith("/")) return;
  const { error } = await storageClient().from(bucket).remove([path]);
  if (error) throw new Error("Gagal membersihkan berkas storage.");
}

export async function registrationFileUrl(path: string) {
  const { data, error } = await storageClient()
    .from(REGISTRATION_BUCKET)
    .createSignedUrl(path, 60, { download: true });
  if (error) throw new Error("Gagal membuat tautan unduh berkas.");
  return data.signedUrl;
}
