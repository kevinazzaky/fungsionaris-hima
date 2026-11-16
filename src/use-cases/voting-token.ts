import { createHmac, timingSafeEqual } from "node:crypto";
import { ValidationError } from "../domain/admin";

export function voterKey(nim: string, electionId: string, secret: string) {
  return createHmac("sha256", secret)
    .update(`dpt:${electionId}:${nim}`)
    .digest("hex");
}

export function issueVotingToken(
  electionId: string,
  key: string,
  secret: string,
  now = Date.now(),
) {
  const payload = Buffer.from(
    JSON.stringify({ electionId, voterKey: key, expires: now + 15 * 60_000 }),
  ).toString("base64url");
  return `${payload}.${createHmac("sha256", secret).update(`token:${payload}`).digest("base64url")}`;
}

export function readVotingToken(
  token: unknown,
  secret: string,
  now = Date.now(),
): { electionId: string; voterKey: string; expires: number } {
  try {
    if (typeof token !== "string" || token.length > 1000) throw new Error();
    const [payload, signature, extra] = token.split(".");
    const expected = createHmac("sha256", secret)
      .update(`token:${payload}`)
      .digest();
    const received = Buffer.from(signature || "", "base64url");
    if (
      extra ||
      received.length !== expected.length ||
      !timingSafeEqual(expected, received)
    )
      throw new Error();
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (
      typeof data.electionId !== "string" ||
      !/^[a-f0-9]{64}$/.test(data.voterKey) ||
      !Number.isFinite(data.expires) ||
      data.expires <= now
    )
      throw new Error();
    return data;
  } catch {
    throw new ValidationError(
      "Sesi memilih tidak valid atau kedaluwarsa. Masukkan NIM kembali.",
    );
  }
}
