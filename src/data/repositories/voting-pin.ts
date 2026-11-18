import "server-only";
import { getPrisma } from "@/data/prisma";
import type {
  StoredVotingPinRecord,
  VotingPinRepository,
} from "@/use-cases/voting-pin";

export const votingPinRepository: VotingPinRepository = {
  async read(): Promise<StoredVotingPinRecord | null> {
    const row = await getPrisma().votingSettings.findUnique({
      where: { id: "main" },
      select: { adminPinHash: true, pinVersion: true, pinUpdatedAt: true },
    });
    return row
      ? {
          adminPinHash: row.adminPinHash,
          pinVersion: row.pinVersion,
          pinUpdatedAt: row.pinUpdatedAt,
        }
      : null;
  },

  async setupInitialPin(pinHash: string) {
    return getPrisma().$transaction(async (tx) => {
      await tx.$executeRaw`INSERT INTO voting_settings(id) VALUES ('main') ON CONFLICT (id) DO NOTHING`;
      const rows = await tx.$queryRaw<
        { admin_pin_hash: string | null; pin_version: number }[]
      >`SELECT admin_pin_hash, pin_version FROM voting_settings WHERE id='main' FOR UPDATE`;
      const current = rows[0];
      if (current?.admin_pin_hash) {
        return { status: "already_configured" } as const;
      }
      const nextVersion = Math.max(1, (current?.pin_version ?? 0) + 1);
      const updated = await tx.votingSettings.update({
        where: { id: "main" },
        data: {
          adminPinHash: pinHash,
          pinVersion: nextVersion,
          pinUpdatedAt: new Date(),
        },
        select: { adminPinHash: true, pinVersion: true, pinUpdatedAt: true },
      });
      return {
        status: "created",
        pinHash: updated.adminPinHash!,
        pinVersion: updated.pinVersion,
        pinUpdatedAt: updated.pinUpdatedAt!,
      } as const;
    });
  },

  async changePinWithVerification({
    verifyCurrent,
    isSameAsCurrent,
    createNextHash,
  }) {
    return getPrisma().$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        { admin_pin_hash: string | null; pin_version: number }[]
      >`SELECT admin_pin_hash, pin_version FROM voting_settings WHERE id='main' FOR UPDATE`;
      const current = rows[0];
      if (!current?.admin_pin_hash) {
        return { status: "unconfigured" } as const;
      }
      if (!(await verifyCurrent(current.admin_pin_hash))) {
        return { status: "invalid_current" } as const;
      }
      if (await isSameAsCurrent(current.admin_pin_hash)) {
        return { status: "same_as_current" } as const;
      }
      const nextHash = await createNextHash();
      const nextVersion = Math.max(1, current.pin_version + 1);
      const updated = await tx.votingSettings.update({
        where: { id: "main" },
        data: {
          adminPinHash: nextHash,
          pinVersion: nextVersion,
          pinUpdatedAt: new Date(),
        },
        select: { adminPinHash: true, pinVersion: true, pinUpdatedAt: true },
      });
      return {
        status: "updated",
        pinHash: updated.adminPinHash!,
        pinVersion: updated.pinVersion,
        pinUpdatedAt: updated.pinUpdatedAt!,
      } as const;
    });
  },
};
