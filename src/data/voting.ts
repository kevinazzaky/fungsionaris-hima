import "server-only";
import { connection } from "next/server";
import { isDatabaseConfigured, isVotingConfigured } from "@/lib/backend-config";
import { votingRepository } from "@/data/repositories/voting";
import type { VotingPublicData } from "@/domain/voting";

export function votingReady() {
  return isVotingConfigured();
}

export async function loadVoting(): Promise<VotingPublicData> {
  await connection();
  if (!isDatabaseConfigured()) return { election: null, available: false };
  try {
    return {
      election: await votingRepository.latest(),
      available: votingReady(),
    };
  } catch {
    return {
      election: null,
      available: false,
      error: "Informasi pemilihan belum dapat dimuat. Silakan coba lagi nanti.",
    };
  }
}
