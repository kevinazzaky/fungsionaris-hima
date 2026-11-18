import { ValidationError } from "./admin";

export const VOTING_ADMIN_LOCK_COOKIE = "hima_voting_admin_lock";
export const VOTING_ADMIN_PIN_MIN_LENGTH = 4;
export const VOTING_ADMIN_PIN_MAX_LENGTH = 200;
export const VOTING_ADMIN_LOCK_TTL_MS = 30 * 60_000;

export type VotingPinGateState = "unconfigured" | "locked" | "unavailable";
export type VotingPinLockState = VotingPinGateState | "unlocked";

/**
 * Thrown when an admin requests Election Management data without a valid
 * unlocked PIN session cookie (or when the DB PIN/schema is not ready yet).
 */
export class VotingPinLockedError extends Error {
  readonly status = 403;
  readonly code = "VOTING_PIN_LOCKED";
  readonly pinConfigured: boolean;
  readonly state: VotingPinGateState;

  constructor(
    message = "Akses Pemilihan Ketua sedang terkunci. Masukkan PIN untuk membuka.",
    pinConfigured = true,
    state: VotingPinGateState = pinConfigured ? "locked" : "unconfigured",
  ) {
    super(message);
    this.name = "VotingPinLockedError";
    this.pinConfigured = pinConfigured;
    this.state = state;
  }
}

export function validateNewVotingPin(pin: unknown, confirmPin: unknown): string {
  if (
    typeof pin !== "string" ||
    !pin.trim() ||
    pin.length < VOTING_ADMIN_PIN_MIN_LENGTH ||
    pin.length > VOTING_ADMIN_PIN_MAX_LENGTH
  ) {
    throw new ValidationError(
      `PIN harus ${VOTING_ADMIN_PIN_MIN_LENGTH} sampai ${VOTING_ADMIN_PIN_MAX_LENGTH} karakter.`,
    );
  }
  if (typeof confirmPin !== "string" || pin !== confirmPin) {
    throw new ValidationError("Konfirmasi PIN tidak cocok.");
  }
  return pin;
}
