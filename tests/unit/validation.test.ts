import { describe, expect, it } from "vitest";
import { cleanText, moneyInputValue, parseMoneyInput, readInt, readLocalized } from "@/lib/validation/common";
import { slugify } from "@/lib/slug";

function fd(entries: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
}

describe("slugify()", () => {
  it("transliterates Macedonian", () => {
    expect(slugify("Ѓердан со срце")).toBe("gjerdan-so-srce");
    expect(slugify("Љубов и годишнини")).toBe("ljubov-i-godishnini");
  });
  it("folds Albanian diacritics", () => {
    expect(slugify("Varëse çelësash")).toBe("varese-celesash");
  });
  it("handles English with symbols", () => {
    expect(slugify("  Home & Decor!! ")).toBe("home-decor");
  });
});

describe("readLocalized()", () => {
  it("requires English", () => {
    expect(readLocalized(fd({ "name.mk": "Накит" }), "name", { required: true, max: 100 }).error).toBe("required");
  });
  it("drops blank translations", () => {
    expect(readLocalized(fd({ "name.en": "Jewellery", "name.mk": "  " }), "name", { required: true, max: 100 }).value).toEqual({
      en: "Jewellery",
    });
  });
  it("optional field: empty is null, translation without English is an error", () => {
    expect(readLocalized(fd({}), "d", { required: false, max: 10 })).toEqual({ value: null });
    expect(readLocalized(fd({ "d.sq": "x" }), "d", { required: false, max: 10 }).error).toBe("required");
  });
  it("enforces max length", () => {
    expect(readLocalized(fd({ "n.en": "x".repeat(11) }), "n", { required: true, max: 10 }).error).toBe("tooLong");
  });
});

describe("cleanText()", () => {
  it("strips control characters but keeps newlines", () => {
    expect(cleanText(" a\u0000b\nc ")).toBe("ab\nc");
  });
});

describe("parseMoneyInput()", () => {
  it("parses whole and decimal amounts", () => {
    expect(parseMoneyInput("1200")).toBe(120000);
    expect(parseMoneyInput("1200,5")).toBe(120050);
    expect(parseMoneyInput("19.99")).toBe(1999);
  });
  it("rejects ambiguous or invalid input", () => {
    expect(parseMoneyInput("1.200,00")).toBeNaN();
    expect(parseMoneyInput("-5")).toBeNaN();
    expect(parseMoneyInput("abc")).toBeNaN();
  });
  it("returns null for empty", () => {
    expect(parseMoneyInput("")).toBeNull();
  });
  it("round-trips through moneyInputValue", () => {
    expect(moneyInputValue(120000)).toBe("1200");
    expect(moneyInputValue(120050)).toBe("1200.50");
  });
});

describe("readInt()", () => {
  it("bounds integers", () => {
    expect(readInt("5", { min: 0, max: 10 })).toBe(5);
    expect(readInt("11", { min: 0, max: 10 })).toBeNull();
    expect(readInt("1.5", { min: 0, max: 10 })).toBeNull();
  });
});
