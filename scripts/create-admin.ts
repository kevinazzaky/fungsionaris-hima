import { loadEnvConfig } from "@next/env";
import { randomBytes } from "node:crypto";
import { parseArgs } from "node:util";
import { createClient, type User } from "@supabase/supabase-js";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

loadEnvConfig(process.cwd());

async function main() {
  const { values } = parseArgs({
    options: {
      email: { type: "string" },
      json: { type: "boolean", default: false },
    },
  });
  const email = values.email?.trim().toLowerCase();
  if (
    !email ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new Error(
      "Gunakan: npm run db:create-admin -- --email email-pengurus",
    );
  }
  const { DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY } =
    process.env;
  if (!DATABASE_URL || !NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SECRET_KEY)
    throw new Error("Konfigurasi Supabase belum lengkap.");
  const client = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let user: User | undefined;
  for (let page = 1; ; page++) {
    const { data, error } = await client.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw new Error("Daftar pengguna Supabase belum dapat dibaca.");
    user = data.users.find((entry) => entry.email?.toLowerCase() === email);
    if (user || data.users.length < 1000) break;
  }
  let password: string | null = null;
  let created = false;
  if (user && !user.email_confirmed_at)
    throw new Error(
      "Email sudah terdaftar tetapi belum dikonfirmasi. Konfirmasikan akun di Supabase terlebih dahulu.",
    );
  if (!user) {
    password = `Aa1!${randomBytes(24).toString("base64url")}`;
    const { data, error } = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user)
      throw new Error("Akun Supabase belum dapat dibuat.");
    user = data.user;
    created = true;
  }
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: DATABASE_URL }),
  });
  try {
    await prisma.adminUser.upsert({
      where: { authId: user.id },
      create: { authId: user.id, email },
      update: { email },
    });
  } catch {
    if (created) {
      const { error } = await client.auth.admin.deleteUser(user.id);
      if (error)
        console.error(
          "Pembuatan akses gagal; periksa akun Auth baru sebelum mencoba kembali.",
        );
    }
    throw new Error("Akses admin belum dapat disimpan ke database.");
  } finally {
    await prisma.$disconnect();
  }
  const result = { email, created, password };
  if (values.json) console.log(JSON.stringify(result));
  else {
    console.log(`Akses admin aktif untuk ${email}.`);
    console.log(
      password
        ? `Password akun baru (tampil sekali): ${password}`
        : "Akun sudah ada. Password sebelumnya dipertahankan.",
    );
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Pembuatan admin gagal.",
  );
  process.exitCode = 1;
});
