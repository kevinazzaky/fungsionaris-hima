import { validatePeriod, ValidationError } from "../domain/admin";
import type { ProgramPeriodRepository } from "../domain/programs";

export async function saveProgramPeriod(
  repository: ProgramPeriodRepository,
  data: Record<string, unknown>,
  create: boolean,
) {
  const period = validatePeriod(data.period).replace("-", "/");
  if (typeof data.isPublished !== "boolean")
    throw new ValidationError("Status tampil periode tidak valid.");
  const input = { period, isPublished: data.isPublished };
  return create ? repository.create(input) : repository.setPublished(input);
}
