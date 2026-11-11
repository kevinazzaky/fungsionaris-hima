import { normalizeNim } from "../domain/voting";
import { ValidationError } from "../domain/admin";
import { issueVotingToken, voterKey } from "./voting-token";

export async function loadAdminVotingResults<T>(
  status: string,
  read: () => Promise<T>,
): Promise<T | null> {
  return status === "scheduled" || status === "closed" ? read() : null;
}

export async function prepareVotingSession(
  repository: {
    voterEligibility: (id: string, key: string) => Promise<{
      eligible: boolean;
      consumed: boolean;
    } | null>;
  },
  nim: unknown,
  electionId: string,
  secret: string,
  now = Date.now(),
) {
  const key = voterKey(normalizeNim(nim), electionId, secret);
  const voter = await repository.voterEligibility(electionId, key);
  if (!voter)
    throw new ValidationError(
      "NIM belum terdaftar untuk pemilihan ini. Periksa NIM atau hubungi panitia.",
    );
  if (voter.consumed)
    throw new ValidationError(
      "NIM ini sudah digunakan untuk memilih. Kamu tidak dapat memilih lagi pada periode ini.",
    );
  if (!voter.eligible)
    throw new ValidationError(
      "NIM ini belum memiliki hak pilih pada periode ini. Hubungi panitia.",
    );
  return {
    token: issueVotingToken(electionId, key, secret, now),
    message:
      "NIM diterima. Silakan baca profil kandidat, lalu tentukan pilihan Anda. Sesi berlaku selama 15 menit.",
  };
}
