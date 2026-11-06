import "server-only";
import { connection } from "next/server";
import { isDatabaseConfigured } from "@/lib/backend-config";
import { initialPrograms } from "@/lib/program-seed";
import { programRepository } from "./repositories/programs";

export async function loadPrograms() {
  if (!isDatabaseConfigured()) return initialPrograms;
  await connection();
  return programRepository.list(true);
}
