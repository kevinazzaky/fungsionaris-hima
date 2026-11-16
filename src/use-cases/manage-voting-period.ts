import { validatePeriod, ValidationError } from "../domain/admin";

export function assertCanActivateVotingPeriod(
  current: { id: string; status: string; startsAt: Date | null; endsAt: Date | null } | null,
  nextId: string,
  now = Date.now(),
) {
  if (current && current.id !== nextId && current.status === "scheduled" &&
      current.startsAt && current.endsAt &&
      now >= current.startsAt.getTime() && now < current.endsAt.getTime())
    throw new ValidationError("Pemungutan suara periode aktif masih berlangsung. Tunggu jadwal selesai atau tutup voting sebelum mengganti periode aktif.");
}

type PeriodRepository = {
  findPeriod(period: string): Promise<{ id: string } | null>;
  create(period: string, actorId: string): Promise<string>;
};

export async function selectVotingPeriod(
  repository: PeriodRepository,
  input: unknown,
  actorId: string,
) {
  const period = validatePeriod(input);
  const existing = await repository.findPeriod(period);
  if (existing) return existing.id;
  try {
    return await repository.create(period, actorId);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      const concurrent = await repository.findPeriod(period);
      if (concurrent) return concurrent.id;
    }
    throw error;
  }
}
