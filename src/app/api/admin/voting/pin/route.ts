import { requireAdmin } from "@/data/auth";
import { getPrisma } from "@/data/prisma";
import { votingRepository } from "@/data/repositories/voting";
import { votingPinRepository } from "@/data/repositories/voting-pin";
import { apiError, assertSameOrigin, readJson } from "@/lib/api-response";
import {
  clearVotingAdminLockCookie,
  requireVotingPin,
  setVotingAdminLockCookie,
} from "@/lib/voting-admin-lock";
import { votingJson } from "@/lib/voting-api";
import {
  changeVotingAdminPin,
  setupVotingAdminPin,
  unlockVotingAdminPin,
} from "@/use-cases/voting-pin";

function requestNetwork(request: Request) {
  return process.env.VERCEL === "1"
    ? request.headers.get("x-vercel-forwarded-for") || "shared"
    : "shared";
}

function pinLimiter() {
  return {
    rate: (key: string, scope: string, limit: number, windowSeconds?: number) =>
      votingRepository.rate(key, scope, limit, windowSeconds),
    clearRate: async (key: string) => {
      await getPrisma().votingRateLimit.deleteMany({ where: { key } });
    },
  };
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    const input = await readJson(request, 2048);
    const result =
      input.action === "setup"
        ? await setupVotingAdminPin({
            adminId: admin.id,
            newPin: input.newPin,
            confirmPin: input.confirmPin,
            repository: votingPinRepository,
          })
        : await unlockVotingAdminPin({
            adminId: admin.id,
            pin: input.pin,
            network: requestNetwork(request),
            repository: votingPinRepository,
            limiter: pinLimiter(),
          });
    if (!result.ok) {
      return votingJson({ error: result.error }, result.status);
    }
    await setVotingAdminLockCookie(result.token);
    return votingJson(
      {
        unlocked: true,
        configured: true,
        expiresAt: result.expiresAt,
        pinUpdatedAt: result.pinUpdatedAt ?? null,
      },
      result.status,
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    await requireVotingPin(admin.id);
    const input = await readJson(request, 2048);
    const result = await changeVotingAdminPin({
      adminId: admin.id,
      currentPin: input.currentPin,
      newPin: input.newPin,
      confirmPin: input.confirmPin,
      network: requestNetwork(request),
      repository: votingPinRepository,
      limiter: pinLimiter(),
    });
    if (!result.ok) {
      return votingJson({ error: result.error }, result.status);
    }
    await setVotingAdminLockCookie(result.token);
    return votingJson({
      updated: true,
      expiresAt: result.expiresAt,
      pinUpdatedAt: result.pinUpdatedAt ?? null,
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    await requireAdmin();
    await clearVotingAdminLockCookie();
    return votingJson({ unlocked: false });
  } catch (error) {
    return apiError(error);
  }
}
