import "server-only";
import { hmac, safeEqualHex } from "@/lib/server/secrets";

/**
 * The ONLY thing the success page can show: a sanitized summary signed by
 * the server and stored in a short-lived httpOnly cookie. There is no order
 * lookup by number, and no customer data is included.
 */
export const CONFIRMATION_COOKIE = "order_confirmation";
export const CONFIRMATION_MAX_AGE_S = 30 * 60;

export type Confirmation = { orderNumber: string; totalMinor: number; currency: string; issuedAt: number };

export function signConfirmation(c: Confirmation): string {
  const body = Buffer.from(JSON.stringify(c)).toString("base64url");
  return `${body}.${hmac("confirmation", body)}`;
}

export function readConfirmation(value: string | undefined, now = Date.now()): Confirmation | null {
  if (!value) return null;
  const [body, sig] = value.split(".");
  if (!body || !sig || !safeEqualHex(sig, hmac("confirmation", body))) return null;
  try {
    const c = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Confirmation;
    if (
      typeof c.orderNumber !== "string" ||
      !/^ORD-\d{4}-\d{6,}$/.test(c.orderNumber) ||
      !Number.isInteger(c.totalMinor) ||
      !/^[A-Z]{3}$/.test(c.currency) ||
      now - c.issuedAt > CONFIRMATION_MAX_AGE_S * 1000
    ) {
      return null;
    }
    return c;
  } catch {
    return null;
  }
}
