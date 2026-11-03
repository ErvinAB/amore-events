import "server-only";
import { hmac, safeEqualHex } from "@/lib/server/secrets";

/**
 * "Realistic form completion" check: the checkout form gets a signed
 * timestamp when it opens. Submissions faster than MIN_MS (bots) or older
 * than MAX_MS (stale tab → the client just fetches a fresh token) fail.
 */
export const MIN_FILL_MS = 3_000;
export const MAX_AGE_MS = 6 * 60 * 60 * 1000;

export function issueFormToken(now = Date.now()): string {
  return `${now}.${hmac("form-token", String(now))}`;
}

export type FormTokenResult = "ok" | "missing" | "invalid" | "tooFast" | "expired";

export function verifyFormToken(token: unknown, now = Date.now()): FormTokenResult {
  if (typeof token !== "string" || !token) return "missing";
  const [ts, sig] = token.split(".");
  if (!/^\d{13}$/.test(ts ?? "") || !sig || !safeEqualHex(sig, hmac("form-token", ts))) return "invalid";
  const age = now - Number(ts);
  if (age < MIN_FILL_MS) return "tooFast";
  if (age > MAX_AGE_MS) return "expired";
  return "ok";
}
