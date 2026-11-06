import { loadEnvConfig } from "@next/env";
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

loadEnvConfig(process.cwd());

async function main() {
  const { values } = parseArgs({
    options: { "auth-id": { type: "string" }, email: { type: "string" } },
  });
  const authId = values["auth-id"];
  const email = values.email?.trim().toLowerCase();
  if (!authId || !/^[0-9a-f-]{36}$/i.test(authId) || !email)
    throw new Error(
      "Gunakan: npm run db:admin -- --auth-id UUID --email email-pengurus",
    );
  const { DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY } =
    process.env;
  if (!DATABASE_URL || !NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SECRET_KEY)
    throw new Error("Konfigurasi Supabase dan database belum lengkap.");
  const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.admin.getUserById(authId);
  if (error || data.user.email?.toLowerCase() !== email)
    throw new Error(
      "UUID dan email tidak cocok dengan pengguna di Supabase Auth.",
    );
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: DATABASE_URL }),
  });
  try {
    await prisma.adminUser.upsert({
      where: { authId },
      create: { authId, email },
      update: { email },
    });
    console.log(
      "Akses admin diberikan kepada akun Supabase Auth yang diverifikasi.",
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Pemberian akses gagal.",
  );
  process.exitCode = 1;
});
