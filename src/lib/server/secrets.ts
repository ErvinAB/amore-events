import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * One server-only secret (CHECKOUT_SECRET), domain-separated per purpose so a
 * value signed for one use can never be replayed as another.
 */
function secret(): string {
  const s = process.env.CHECKOUT_SECRET;
  if (!s || s.length < 32) throw new Error("CHECKOUT_SECRET must be set (32+ chars) on the server.");
  return s;
}

export type HmacPurpose = "form-token" | "confirmation" | "ip";

export function hmac(purpose: HmacPurpose, value: string): string {
  return createHmac("sha256", secret()).update(`${purpose}\u0000${value}`).digest("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length || !/^[0-9a-f]+$/.test(a) || !/^[0-9a-f]+$/.test(b)) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}
