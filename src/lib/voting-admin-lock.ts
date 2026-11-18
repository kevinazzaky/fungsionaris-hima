import "server-only";
import { cookies } from "next/headers";
import { votingPinRepository } from "@/data/repositories/voting-pin";
import {
  VOTING_ADMIN_LOCK_COOKIE,
  VotingPinLockedError,
  type VotingPinLockState,
} from "@/domain/voting-pin";
import {
  resolveVotingLockSecret,
  verifyVotingAdminLockToken,
} from "@/use-cases/voting-pin";

export type VotingAdminLockStatus = {
  state: VotingPinLockState;
  unlocked: boolean;
  pinConfigured: boolean;
  expiresAt: number | null;
  pinUpdatedAt: string | null;
};

function cookieOptions(extra?: { maxAge?: number }) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...extra,
  };
}

export async function votingAdminLockStatus(
  adminId: string,
): Promise<VotingAdminLockStatus> {
  const hmacSecret = resolveVotingLockSecret();
  if (!hmacSecret) {
    return {
      state: "unavailable",
      unlocked: false,
      pinConfigured: false,
      expiresAt: null,
      pinUpdatedAt: null,
    };
  }
  let record: Awaited<ReturnType<typeof votingPinRepository.read>>;
  try {
    record = await votingPinRepository.read();
  } catch {
    return {
      state: "unavailable",
      unlocked: false,
      pinConfigured: false,
      expiresAt: null,
      pinUpdatedAt: null,
    };
  }
  if (!record?.adminPinHash) {
    return {
      state: "unconfigured",
      unlocked: false,
      pinConfigured: false,
      expiresAt: null,
      pinUpdatedAt: null,
    };
  }
  const cookieStore = await cookies();
  const token = cookieStore.get(VOTING_ADMIN_LOCK_COOKIE)?.value;
  const check = verifyVotingAdminLockToken(
    token,
    adminId,
    record.adminPinHash,
    record.pinVersion,
    hmacSecret,
  );
  const pinUpdatedAt = record.pinUpdatedAt?.toISOString() ?? null;
  if (!check.unlocked) {
    return {
      state: "locked",
      unlocked: false,
      pinConfigured: true,
      expiresAt: null,
      pinUpdatedAt,
    };
  }
  return {
    state: "unlocked",
    unlocked: true,
    pinConfigured: true,
    expiresAt: check.expiresAt,
    pinUpdatedAt,
  };
}

export async function requireVotingPin(adminId: string) {
  const status = await votingAdminLockStatus(adminId);
  if (status.state === "unavailable") {
    throw new VotingPinLockedError(
      "Status PIN Pemilihan Ketua belum dapat diperiksa dari database. Pastikan migrasi database sudah dijalankan.",
      false,
      "unavailable",
    );
  }
  if (status.state === "unconfigured") {
    throw new VotingPinLockedError(
      "PIN Pemilihan Ketua belum diatur. Buat PIN terlebih dahulu pada tab Pemilihan Ketua.",
      false,
      "unconfigured",
    );
  }
  if (!status.unlocked) {
    throw new VotingPinLockedError(
      "Akses Pemilihan Ketua sedang terkunci. Masukkan PIN untuk membuka.",
      true,
      "locked",
    );
  }
  return status;
}

export async function setVotingAdminLockCookie(token: string) {
  const cookieStore = await cookies();
  // Session cookie without maxAge ends on browser close and inside the signed payload at 30 minutes.
  cookieStore.set(VOTING_ADMIN_LOCK_COOKIE, token, cookieOptions());
}

export async function clearVotingAdminLockCookie() {
  const cookieStore = await cookies();
  cookieStore.set(VOTING_ADMIN_LOCK_COOKIE, "", cookieOptions({ maxAge: 0 }));
}
