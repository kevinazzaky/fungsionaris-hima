import { normalizeNim, normalizeVoterName } from "../domain/voting";
import { ValidationError } from "../domain/admin";
import { issueVotingToken, readVotingToken, voterKey } from "./voting-token";

export class VotingCheckLimitError extends ValidationError {}

export async function loadVotingSubmissionStatus(
  repository: { voterEligibility: (id: string, key: string) => Promise<{ consumed: boolean; tokenVersion?: number } | null> },
  token: unknown,
  secret: string,
  now = Date.now(),
) {
  const session = readVotingToken(token, secret, now);
  const voter = await repository.voterEligibility(session.electionId, session.voterKey);
  if (!voter) throw new ValidationError("Status suara belum dapat dipastikan. Hubungi panitia.");
  if (session.version !== (voter.tokenVersion ?? 0))
    throw new ValidationError("Periode telah direset. Periksa nama dan NIM kembali.");
  return { status: voter.consumed ? "recorded" as const : "not_recorded" as const };
}

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
      name: string | null;
      tokenVersion?: number;
    } | null>;
  },
  nim: unknown,
  electionId: string,
  secret: string,
  name: unknown,
  now = Date.now(),
  checkAllowed = true,
) {
  const enteredName = normalizeVoterName(name);
  const key = voterKey(normalizeNim(nim), electionId, secret);
  const voter = await repository.voterEligibility(electionId, key);
  const nameMatches = !!voter?.name && normalizeVoterName(voter.name).toLocaleLowerCase("id-ID") === enteredName.toLocaleLowerCase("id-ID");
  if (!checkAllowed && !(nameMatches && voter?.consumed))
    throw new VotingCheckLimitError("Terlalu banyak percobaan. Tunggu 10 menit, lalu coba lagi.");
  if (!voter)
    throw new ValidationError(
      "Nama dan NIM tidak cocok. Periksa kembali.",
    );
  if (!nameMatches)
    throw new ValidationError("Nama dan NIM tidak cocok. Periksa kembali.");
  if (voter.consumed)
    throw new ValidationError(
      "Nama dan NIM ini sudah digunakan untuk memilih pada periode ini.",
    );
  if (!voter.eligible)
    throw new ValidationError(
      "NIM ini belum memiliki hak pilih pada periode ini. Hubungi panitia.",
    );
  return {
    token: issueVotingToken(electionId, key, secret, now, voter.tokenVersion ?? 0),
    message:
      "NIM diterima. Silakan baca profil kandidat, lalu tentukan pilihan Anda. Sesi berlaku selama 15 menit.",
  };
}

export async function resetVotingPeriod(
  repository: {
    period(id: string): Promise<string>;
    reset(id: string, confirmation: string, actorId: string): Promise<{ ballotsRemoved: number; rightsRestored: number; action: string }>;
  },
  id: string,
  confirmation: unknown,
  actorId: string,
) {
  if (typeof confirmation !== "string" || confirmation.length > 50)
    throw new ValidationError("Isi konfirmasi reset sesuai periode.");
  const period = await repository.period(id);
  if (confirmation.trim() !== `RESET ${period}`)
    throw new ValidationError(`Ketik RESET ${period} untuk mengonfirmasi.`);
  return repository.reset(id, confirmation.trim(), actorId);
}
