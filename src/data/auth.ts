import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { createAuthClient } from "@/data/supabase/server";
import { getPrisma } from "@/data/prisma";
import { isBackendConfigured } from "@/lib/backend-config";

export const getAdmin = cache(async () => {
  await connection();
  if (!isBackendConfigured()) return null;
  const client = await createAuthClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) return null;
  return getPrisma().adminUser.findUnique({
    where: { authId: user.id },
    select: { id: true, email: true },
  });
});

export class AccessError extends Error {
  constructor() {
    super("Silakan masuk menggunakan akun admin.");
  }
}

export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) throw new AccessError();
  return admin;
}
