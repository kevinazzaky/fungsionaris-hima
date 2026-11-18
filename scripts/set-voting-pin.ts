import { loadEnvConfig } from "@next/env";
import { parseArgs } from "node:util";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { validateNewVotingPin } from "../src/domain/voting-pin";
import { hashVotingAdminPin } from "../src/use-cases/voting-pin";

loadEnvConfig(process.cwd());

async function main() {
  const { values } = parseArgs({
    options: { pin: { type: "string" } },
  });
  if (!values.pin) {
    throw new Error(
      "Gunakan: npm run db:voting-pin -- --pin \"PIN_BARU\" (4 sampai 200 karakter)",
    );
  }
  const pin = validateNewVotingPin(values.pin, values.pin);
  const { DATABASE_URL } = process.env;
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL belum diatur di environment.");
  }
  const hash = await hashVotingAdminPin(pin);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: DATABASE_URL }),
  });
  try {
    await prisma.$executeRaw`INSERT INTO voting_settings(id) VALUES ('main') ON CONFLICT (id) DO NOTHING`;
    await prisma.votingSettings.update({
      where: { id: "main" },
      data: {
        adminPinHash: hash,
        pinVersion: { increment: 1 },
        pinUpdatedAt: new Date(),
      },
    });
    console.log(
      "PIN Pemilihan Ketua berhasil disimpan terenkripsi; sesi lama otomatis dikunci.",
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Pengaturan PIN gagal.",
  );
  process.exitCode = 1;
});
