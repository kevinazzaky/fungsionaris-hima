export type RegistrationSettings = { isOpen: boolean };
export interface RegistrationSettingsRepository {
  get(): Promise<RegistrationSettings>;
  setOpen(isOpen: boolean): Promise<RegistrationSettings>;
}
