import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { ValidationError } from "../domain/admin";
import {
  VOTING_ADMIN_LOCK_TTL_MS,
  VOTING_ADMIN_PIN_MAX_LENGTH,
  VotingPinLockedError,
  validateNewVotingPin,
} from "../domain/voting-pin";

type EnvMap = Record<string, string | undefined>;

export type StoredVotingPinRecord = {
  adminPinHash: string | null;
  pinVersion: number;
  pinUpdatedAt: Date | null;
};

export type VotingPinRepository = {
  read(): Promise<StoredVotingPinRecord | null>;
  setupInitialPin(
    pinHash: string,
  ): Promise<
    | { status: "created"; pinHash: string; pinVersion: number; pinUpdatedAt: Date }
    | { status: "already_configured" }
  >;
  changePinWithVerification(options: {
    verifyCurrent: (storedHash: string) => Promise<boolean>;
    isSameAsCurrent: (storedHash: string) => Promise<boolean>;
    createNextHash: () => Promise<string>;
  }): Promise<
    | { status: "updated"; pinHash: string; pinVersion: number; pinUpdatedAt: Date }
    | { status: "unconfigured" | "invalid_current" | "same_as_current" }
  >;
};

export type PinRateLimiter = {
  rate(
    key: string,
    scope: string,
    limit: number,
    windowSeconds?: number,
  ): Promise<boolean>;
  clearRate?(key: string): Promise<void>;
};

export type VerifyVotingPinResult =
  | {
      ok: true;
      status: 200 | 201;
      token: string;
      expiresAt: number;
      pinUpdatedAt?: string | null;
    }
  | { ok: false; status: 403 | 409 | 429; error: string };

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };

/** Resolves the HMAC key material available on configured admin/voting servers. */
export function resolveVotingLockSecret(env: EnvMap = process.env): string | null {
  const secret = env.VOTING_SECRET?.trim() || env.SUPABASE_SECRET_KEY?.trim();
  return secret ? secret : null;
}

function scryptDerived(pin: string, saltHex: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(pin, saltHex, 64, SCRYPT_PARAMS, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

/** Produces a salted scrypt hash so plaintext PINs are never stored in DB. */
export async function hashVotingAdminPin(pin: string): Promise<string> {
  if (
    typeof pin !== "string" ||
    !pin.trim() ||
    pin.length > VOTING_ADMIN_PIN_MAX_LENGTH
  ) {
    throw new ValidationError("Format PIN tidak valid.");
  }
  const saltHex = randomBytes(16).toString("hex");
  const key = await scryptDerived(pin, saltHex);
  return `scrypt:v1:${saltHex}:${key.toString("hex")}`;
}

/** Verifies a PIN candidate against its stored scrypt hash in constant time. */
export async function verifyVotingAdminPinHash(
  provided: unknown,
  storedHash: string | null | undefined,
): Promise<boolean> {
  if (
    typeof provided !== "string" ||
    provided.length === 0 ||
    provided.length > VOTING_ADMIN_PIN_MAX_LENGTH ||
    typeof storedHash !== "string"
  ) {
    return false;
  }
  const parts = storedHash.split(":");
  if (
    parts.length !== 4 ||
    parts[0] !== "scrypt" ||
    parts[1] !== "v1" ||
    !/^[a-f0-9]{32}$/.test(parts[2]) ||
    !/^[a-f0-9]{128}$/.test(parts[3])
  ) {
    return false;
  }
  const expected = Buffer.from(parts[3], "hex");
  const derived = await scryptDerived(provided, parts[2]);
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(expected, derived);
}

// Mix pinHash + pinVersion into the cookie key so changing the PIN in DB immediately
// invalidates every unlock cookie previously issued on other browsers or devices.
function deriveLockSigningKey(
  pinHash: string,
  pinVersion: number,
  hmacSecret: string,
) {
  return createHmac("sha256", hmacSecret)
    .update(`voting-admin-cookie-key:v2:${pinVersion}:`)
    .update(pinHash)
    .digest();
}

export function issueVotingAdminLockToken(
  adminId: string,
  pinHash: string,
  pinVersion: number,
  hmacSecret: string,
  now = Date.now(),
  ttlMs = VOTING_ADMIN_LOCK_TTL_MS,
): { token: string; expiresAt: number } {
  const expiresAt = now + ttlMs;
  const payload = Buffer.from(
    JSON.stringify({
      v: 2,
      sub: adminId,
      pv: pinVersion,
      iat: now,
      exp: expiresAt,
    }),
  ).toString("base64url");
  const key = deriveLockSigningKey(pinHash, pinVersion, hmacSecret);
  const signature = createHmac("sha256", key)
    .update("lock-token:")
    .update(payload)
    .digest("base64url");
  return { token: `${payload}.${signature}`, expiresAt };
}

export function verifyVotingAdminLockToken(
  token: unknown,
  adminId: string,
  pinHash: string | null | undefined,
  pinVersion: number,
  hmacSecret: string,
  now = Date.now(),
): { unlocked: true; expiresAt: number } | { unlocked: false; expiresAt: null } {
  try {
    if (
      typeof token !== "string" ||
      token.length === 0 ||
      token.length > 1000 ||
      !adminId ||
      !pinHash ||
      !hmacSecret ||
      !Number.isInteger(pinVersion) ||
      pinVersion < 1
    ) {
      return { unlocked: false, expiresAt: null };
    }
    const parts = token.split(".");
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      return { unlocked: false, expiresAt: null };
    }
    const [payload, signature] = parts;
    const key = deriveLockSigningKey(pinHash, pinVersion, hmacSecret);
    const expected = Buffer.from(
      createHmac("sha256", key)
        .update("lock-token:")
        .update(payload)
        .digest("base64url"),
    );
    const received = Buffer.from(signature);
    if (
      received.length !== expected.length ||
      !timingSafeEqual(expected, received)
    ) {
      return { unlocked: false, expiresAt: null };
    }
    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Record<string, unknown>;
    if (
      data.v !== 2 ||
      data.sub !== adminId ||
      data.pv !== pinVersion ||
      typeof data.iat !== "number" ||
      typeof data.exp !== "number" ||
      !Number.isFinite(data.iat) ||
      !Number.isFinite(data.exp) ||
      data.iat > data.exp ||
      data.iat > now + 5_000 ||
      data.exp <= now
    ) {
      return { unlocked: false, expiresAt: null };
    }
    return { unlocked: true, expiresAt: data.exp };
  } catch {
    return { unlocked: false, expiresAt: null };
  }
}

export function votingPinRateBucket(
  adminId: string,
  network: string,
  hmacSecret: string,
): string {
  const hash = createHmac("sha256", hmacSecret)
    .update("admin-pin-rate:v1:")
    .update(`${adminId}:${network}`)
    .digest("hex");
  return `admin-pin:${hash}`;
}

export async function setupVotingAdminPin(options: {
  adminId: string;
  newPin: unknown;
  confirmPin: unknown;
  repository: VotingPinRepository;
  env?: EnvMap;
  now?: number;
}): Promise<VerifyVotingPinResult> {
  const hmacSecret = resolveVotingLockSecret(options.env ?? process.env);
  if (!hmacSecret) {
    throw new VotingPinLockedError(
      "Kunci server belum dikonfigurasi. Hubungi pengelola website.",
      false,
      "unavailable",
    );
  }
  const pin = validateNewVotingPin(options.newPin, options.confirmPin);
  const hash = await hashVotingAdminPin(pin);
  const result = await options.repository.setupInitialPin(hash);
  if (result.status === "already_configured") {
    return {
      ok: false,
      status: 409,
      error: "PIN Pemilihan Ketua sudah diatur. Masukkan PIN untuk membuka akses.",
    };
  }
  const issued = issueVotingAdminLockToken(
    options.adminId,
    result.pinHash,
    result.pinVersion,
    hmacSecret,
    options.now ?? Date.now(),
  );
  return {
    ok: true,
    status: 201,
    token: issued.token,
    expiresAt: issued.expiresAt,
    pinUpdatedAt: result.pinUpdatedAt.toISOString(),
  };
}

export async function unlockVotingAdminPin(options: {
  adminId: string;
  pin: unknown;
  network: string;
  repository: VotingPinRepository;
  limiter: PinRateLimiter;
  env?: EnvMap;
  now?: number;
}): Promise<VerifyVotingPinResult> {
  const hmacSecret = resolveVotingLockSecret(options.env ?? process.env);
  if (!hmacSecret) {
    throw new VotingPinLockedError(
      "Kunci server belum dikonfigurasi. Hubungi pengelola website.",
      false,
      "unavailable",
    );
  }
  if (
    typeof options.pin !== "string" ||
    options.pin.trim().length === 0 ||
    options.pin.length > VOTING_ADMIN_PIN_MAX_LENGTH
  ) {
    throw new ValidationError("Masukkan PIN Pemilihan Ketua.");
  }

  const record = await options.repository.read();
  if (!record?.adminPinHash) {
    throw new VotingPinLockedError(
      "PIN Pemilihan Ketua belum diatur. Buat PIN terlebih dahulu.",
      false,
      "unconfigured",
    );
  }

  const bucket = votingPinRateBucket(options.adminId, options.network, hmacSecret);
  const allowed = await options.limiter.rate(bucket, "admin_pin", 5, 600);
  if (!allowed) {
    return {
      ok: false,
      status: 429,
      error: "Terlalu banyak percobaan PIN. Tunggu 10 menit sebelum mencoba lagi.",
    };
  }

  const valid = await verifyVotingAdminPinHash(options.pin, record.adminPinHash);
  if (!valid) {
    return {
      ok: false,
      status: 403,
      error: "PIN Pemilihan Ketua tidak sesuai.",
    };
  }

  if (options.limiter.clearRate) {
    try {
      await options.limiter.clearRate(bucket);
    } catch {
      console.error("Voting PIN rate-limit cleanup pending");
    }
  }

  const issued = issueVotingAdminLockToken(
    options.adminId,
    record.adminPinHash,
    record.pinVersion,
    hmacSecret,
    options.now ?? Date.now(),
  );
  return {
    ok: true,
    status: 200,
    token: issued.token,
    expiresAt: issued.expiresAt,
    pinUpdatedAt: record.pinUpdatedAt?.toISOString() ?? null,
  };
}

export async function changeVotingAdminPin(options: {
  adminId: string;
  currentPin: unknown;
  newPin: unknown;
  confirmPin: unknown;
  network: string;
  repository: VotingPinRepository;
  limiter: PinRateLimiter;
  env?: EnvMap;
  now?: number;
}): Promise<VerifyVotingPinResult> {
  const hmacSecret = resolveVotingLockSecret(options.env ?? process.env);
  if (!hmacSecret) {
    throw new VotingPinLockedError(
      "Kunci server belum dikonfigurasi. Hubungi pengelola website.",
      false,
      "unavailable",
    );
  }
  if (
    typeof options.currentPin !== "string" ||
    options.currentPin.trim().length === 0 ||
    options.currentPin.length > VOTING_ADMIN_PIN_MAX_LENGTH
  ) {
    throw new ValidationError("Masukkan PIN saat ini.");
  }
  const validatedNewPin = validateNewVotingPin(options.newPin, options.confirmPin);

  const bucket = votingPinRateBucket(options.adminId, options.network, hmacSecret);
  const allowed = await options.limiter.rate(bucket, "admin_pin", 5, 600);
  if (!allowed) {
    return {
      ok: false,
      status: 429,
      error: "Terlalu banyak percobaan PIN. Tunggu 10 menit sebelum mencoba lagi.",
    };
  }

  const result = await options.repository.changePinWithVerification({
    verifyCurrent: (storedHash) => verifyVotingAdminPinHash(options.currentPin, storedHash),
    isSameAsCurrent: (storedHash) => verifyVotingAdminPinHash(validatedNewPin, storedHash),
    createNextHash: () => hashVotingAdminPin(validatedNewPin),
  });

  if (result.status !== "updated") {
    if (result.status === "unconfigured") {
      throw new VotingPinLockedError(
        "PIN Pemilihan Ketua belum diatur. Buat PIN terlebih dahulu.",
        false,
        "unconfigured",
      );
    }
    if (result.status === "invalid_current") {
      return {
        ok: false,
        status: 403,
        error: "PIN saat ini tidak sesuai.",
      };
    }
    throw new ValidationError("PIN baru harus berbeda dari PIN saat ini.");
  }

  if (options.limiter.clearRate) {
    try {
      await options.limiter.clearRate(bucket);
    } catch {
      console.error("Voting PIN rate-limit cleanup pending");
    }
  }

  const issued = issueVotingAdminLockToken(
    options.adminId,
    result.pinHash,
    result.pinVersion,
    hmacSecret,
    options.now ?? Date.now(),
  );
  return {
    ok: true,
    status: 200,
    token: issued.token,
    expiresAt: issued.expiresAt,
    pinUpdatedAt: result.pinUpdatedAt.toISOString(),
  };
}
