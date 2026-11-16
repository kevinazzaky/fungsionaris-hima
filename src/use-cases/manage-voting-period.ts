import { validatePeriod } from "../domain/admin";

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
