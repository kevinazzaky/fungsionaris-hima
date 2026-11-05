import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { isDatabaseConfigured } from "@/lib/backend-config";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaConnectionString?: string;
};

export function getPrisma() {
  const connectionString = process.env.DATABASE_URL;
  if (!isDatabaseConfigured())
    throw new Error(
      "DATABASE_URL belum diisi dengan koneksi PostgreSQL yang valid.",
    );
  if (
    !globalForPrisma.prisma ||
    globalForPrisma.prismaConnectionString !== connectionString
  ) {
    const previous = globalForPrisma.prisma;
    const adapter = new PrismaPg({
      connectionString,
      max: 5,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
    });
    globalForPrisma.prisma = new PrismaClient({ adapter });
    globalForPrisma.prismaConnectionString = connectionString;
    if (previous) {
      void previous.$disconnect().catch(() => {
        console.error("Gagal menutup pool Prisma dari konfigurasi sebelumnya.");
      });
    }
  }
  return globalForPrisma.prisma;
}
