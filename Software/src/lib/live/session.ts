// Server-side half of the /live gate. Never import this from a client component:
// it reads process.env and uses node:crypto.
//
// This is a demonstration gate, not a security boundary. One shared ID and
// passphrase, no accounts, no hashing at rest, no server-side attempt limit.

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const LIVE_COOKIE = "live_session";
export const SESSION_SECONDS = 8 * 60 * 60;

/** Both variables must be present; otherwise every unlock fails and says so. */
export const isLiveConfigured = () => Boolean(process.env.LIVE_ACCESS_ID && process.env.LIVE_PASSPHRASE);

// Comparing digests keeps the check a fixed length, so neither the length nor
// the position of a wrong character is observable.
const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();

export function credentialsMatch(accessId: string, passphrase: string): boolean {
  if (!isLiveConfigured()) return false;
  const id = timingSafeEqual(digest(accessId), digest(process.env.LIVE_ACCESS_ID!)) ? 1 : 0;
  const pass = timingSafeEqual(digest(passphrase), digest(process.env.LIVE_PASSPHRASE!)) ? 1 : 0;
  // Bitwise, not &&, so both comparisons always run and neither field can be
  // probed on its own.
  return (id & pass) === 1;
}

// The cookie carries its own expiry, signed with the passphrase so it cannot be
// forged from the browser and so rotating the passphrase invalidates sessions.
const sign = (payload: string) => createHmac("sha256", process.env.LIVE_PASSPHRASE ?? "").update(payload).digest("base64url");

export const issueSession = (now = Date.now()) => {
  const expires = String(now + SESSION_SECONDS * 1000);
  return `${expires}.${sign(expires)}`;
};

export function verifySession(value: string | undefined, now = Date.now()): boolean {
  if (!value || !isLiveConfigured()) return false;
  const dot = value.indexOf(".");
  if (dot <= 0) return false;
  const expires = value.slice(0, dot);
  const signature = value.slice(dot + 1);
  const at = Number(expires);
  if (!Number.isFinite(at) || at <= now) return false;
  const expected = sign(expires);
  if (signature.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(signature, "utf8"), Buffer.from(expected, "utf8"));
}
