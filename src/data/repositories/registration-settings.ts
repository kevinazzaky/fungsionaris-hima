import "server-only";
import { getPrisma } from "../prisma";
import type { RegistrationSettingsRepository } from "@/domain/registration-settings";

export const registrationSettingsRepository: RegistrationSettingsRepository = {
  async get() {
    return (
      (await getPrisma().registrationSettings.findUnique({
        where: { id: "main" },
        select: { isOpen: true },
      })) ?? { isOpen: false }
    );
  },
  setOpen: (isOpen) =>
    getPrisma().registrationSettings.upsert({
      where: { id: "main" },
      create: { id: "main", isOpen },
      update: { isOpen },
      select: { isOpen: true },
    }),
};
