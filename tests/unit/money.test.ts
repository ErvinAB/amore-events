import { describe, expect, it } from "vitest";
import { effectivePrice, formatMoney } from "@/lib/money";

describe("formatMoney()", () => {
  it("formats MKD in the English storefront without hardcoded symbols", () => {
    const s = formatMoney(120000, { currency: "MKD", locale: "en-GB" });
    expect(s).toContain("1,200");
    expect(s).toMatch(/MKD|ден/);
  });
  it("uses Macedonian number formatting for the mk locale", () => {
    const s = formatMoney(120000, { currency: "MKD", locale: "mk-MK" });
    expect(s).toContain("1.200");
  });
  it("keeps decimals when they are not zero", () => {
    expect(formatMoney(1999, { currency: "EUR", locale: "en-GB" })).toBe("€19.99");
  });
  it("strips .00 on whole amounts", () => {
    expect(formatMoney(2000, { currency: "EUR", locale: "en-GB" })).toBe("€20");
  });
});

describe("effectivePrice()", () => {
  it("uses the sale price when present", () => {
    expect(effectivePrice({ price_minor: 2500, sale_price_minor: 2000 })).toBe(2000);
    expect(effectivePrice({ price_minor: 2500, sale_price_minor: null })).toBe(2500);
  });
});
