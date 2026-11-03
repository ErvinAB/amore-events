import { beforeAll, describe, expect, it } from "vitest";
import { issueFormToken, MIN_FILL_MS, verifyFormToken } from "@/lib/checkout/form-token";
import { readConfirmation, signConfirmation } from "@/lib/checkout/confirmation";
import { hmac } from "@/lib/server/secrets";

beforeAll(() => {
  process.env.CHECKOUT_SECRET = "test-secret-test-secret-test-secret-0123";
});

describe("form token", () => {
  it("rejects submissions that are too fast, accepts realistic ones", () => {
    const t0 = 1_800_000_000_000;
    const token = issueFormToken(t0);
    expect(verifyFormToken(token, t0 + 500)).toBe("tooFast");
    expect(verifyFormToken(token, t0 + MIN_FILL_MS + 1)).toBe("ok");
  });
  it("rejects forged, missing and expired tokens", () => {
    const t0 = 1_800_000_000_000;
    expect(verifyFormToken(`${t0}.${"0".repeat(64)}`, t0 + 10_000)).toBe("invalid");
    expect(verifyFormToken(undefined)).toBe("missing");
    expect(verifyFormToken(issueFormToken(t0), t0 + 7 * 3600_000)).toBe("expired");
  });
});

describe("confirmation cookie", () => {
  const c = { orderNumber: "ORD-2026-000142", totalMinor: 164000, currency: "MKD", issuedAt: Date.now() };
  it("round-trips a signed confirmation", () => {
    expect(readConfirmation(signConfirmation(c))).toEqual(c);
  });
  it("rejects tampering (e.g. changing the order number)", () => {
    const [body, sig] = signConfirmation(c).split(".");
    const forged = Buffer.from(JSON.stringify({ ...c, orderNumber: "ORD-2026-000001" })).toString("base64url");
    expect(readConfirmation(`${forged}.${sig}`)).toBeNull();
    expect(readConfirmation(`${body}.${"0".repeat(64)}`)).toBeNull();
  });
  it("expires", () => {
    expect(readConfirmation(signConfirmation({ ...c, issuedAt: Date.now() - 31 * 60_000 }))).toBeNull();
  });
  it("purposes are separated (a form-token signature is not a confirmation signature)", () => {
    expect(hmac("form-token", "x")).not.toBe(hmac("confirmation", "x"));
  });
});
