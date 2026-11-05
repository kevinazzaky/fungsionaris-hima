import "server-only";
import { connection } from "next/server";
import { isDatabaseConfigured } from "@/lib/backend-config";
import { registrationSettingsRepository } from "./repositories/registration-settings";

export async function loadRegistrationSettings() {
  if (!isDatabaseConfigured()) return { isOpen: false };
  await connection();
  return registrationSettingsRepository.get();
}
