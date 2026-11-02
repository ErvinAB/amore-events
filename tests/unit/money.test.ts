import { describe, expect, it } from "vitest";
import { effectivePrice, formatMoney } from "@/lib/money";

const nb = (s: string) => s.replace(/ /g, " ");

describe("formatMoney()", () => {
  it("English storefront still shows the store currency (MKD)", () => {
    expect(nb(formatMoney(129050, { currency: "MKD", locale: "en" }))).toBe("MKD 1,290.50");
    expect(nb(formatMoney(258100, { currency: "MKD", locale: "en" }))).toBe("MKD 2,581");
  });
  it("Macedonian conventions", () => {
    expect(nb(formatMoney(129050, { currency: "MKD", locale: "mk" }))).toBe("1.290,50 ден.");
    expect(nb(formatMoney(12000000, { currency: "MKD", locale: "mk" }))).toBe("120.000 ден.");
  });
  it("Albanian conventions (no grouping below 5 digits)", () => {
    expect(nb(formatMoney(258100, { currency: "MKD", locale: "sq" }))).toBe("2581 den");
    expect(nb(formatMoney(1258100, { currency: "MKD", locale: "sq" }))).toBe("12 581 den");
  });
  it("is configurable: other currencies work without code changes", () => {
    expect(formatMoney(1999, { currency: "EUR", locale: "en" })).toBe("€19.99");
    expect(formatMoney(2000, { currency: "EUR", locale: "en" })).toBe("€20");
    expect(nb(formatMoney(2000, { currency: "EUR", locale: "mk" }))).toBe("20 €");
    expect(nb(formatMoney(2000, { currency: "CHF", locale: "en" }))).toBe("CHF 20");
  });
  it("is identical regardless of the runtime's Intl data", () => {
    // Same input must always give the same string (server == browser).
    expect(formatMoney(5, { currency: "MKD", locale: "mk" })).toBe(formatMoney(5, { currency: "MKD", locale: "mk" }));
    expect(nb(formatMoney(5, { currency: "MKD", locale: "mk" }))).toBe("0,05 ден.");
  });
});

describe("effectivePrice()", () => {
  it("uses the sale price when present", () => {
    expect(effectivePrice({ price_minor: 2500, sale_price_minor: 2000 })).toBe(2000);
    expect(effectivePrice({ price_minor: 2500, sale_price_minor: null })).toBe(2500);
  });
});
