import { describe, expect, it } from "vitest";
import { defaultLocale, localePath, localized } from "@/i18n/config";
import { negotiateLocale } from "@/i18n/negotiate";

describe("locale defaults", () => {
  it("English is the default locale", () => {
    expect(defaultLocale).toBe("en");
  });
});

describe("localized()", () => {
  const name = { en: "Heart necklace", mk: "Ѓердан срце", sq: "" };
  it("returns the requested translation", () => {
    expect(localized(name, "mk")).toBe("Ѓердан срце");
  });
  it("falls back to English when blank or missing", () => {
    expect(localized(name, "sq")).toBe("Heart necklace");
    expect(localized({ en: "Keyring" }, "mk")).toBe("Keyring");
  });
  it("handles null", () => {
    expect(localized(null, "en")).toBe("");
  });
});

describe("negotiateLocale()", () => {
  it("prefers a valid cookie", () => {
    expect(negotiateLocale("sq", "mk-MK,mk;q=0.9")).toBe("sq");
  });
  it("ignores an invalid cookie and uses Accept-Language", () => {
    expect(negotiateLocale("de", "mk-MK,mk;q=0.9,en;q=0.8")).toBe("mk");
  });
  it("respects q-values", () => {
    expect(negotiateLocale(undefined, "de;q=1, sq;q=0.5, mk;q=0.7")).toBe("mk");
  });
  it("falls back to English", () => {
    expect(negotiateLocale(undefined, "de-DE,fr;q=0.8")).toBe("en");
    expect(negotiateLocale(undefined, null)).toBe("en");
  });
});

describe("localePath()", () => {
  it("prefixes paths", () => {
    expect(localePath("mk", "/shop")).toBe("/mk/shop");
    expect(localePath("en")).toBe("/en");
  });
});

import { getDictionary } from "@/i18n/dictionary";
describe("getDictionary()", () => {
  it("keeps arrays as arrays and merges per item", async () => {
    const mk = await getDictionary("mk");
    expect(Array.isArray(mk.home.steps)).toBe(true);
    expect(mk.home.steps).toHaveLength(3);
    expect(mk.home.steps[0].title).toBe("Изберете производ");
  });
  it("falls back to English for missing keys", async () => {
    const sq = await getDictionary("sq");
    const en = await getDictionary("en");
    expect(Object.keys(sq.home).sort()).toEqual(Object.keys(en.home).sort());
  });
});
