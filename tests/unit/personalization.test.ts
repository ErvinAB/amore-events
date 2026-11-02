import { describe, expect, it } from "vitest";
import { charLength, normalizeValue, validatePersonalization, type PersonalizationField } from "@/lib/personalization/validate";

const f = (over: Partial<PersonalizationField>): PersonalizationField => ({
  id: "f",
  label: { en: "Label" },
  type: "text",
  required: false,
  placeholder: null,
  help_text: null,
  max_length: null,
  options: null,
  sort_order: 0,
  ...over,
});

// The brief's example: Engraved Heart Necklace
const name = f({ id: "name", label: { en: "Name" }, type: "text", required: true, max_length: 20 });
const date = f({ id: "date", label: { en: "Special Date" }, type: "date" });
const colour = f({
  id: "colour",
  label: { en: "Colour" },
  type: "select",
  required: true,
  options: [
    { value: "gold", label: { en: "Gold" } },
    { value: "silver", label: { en: "Silver" } },
    { value: "rose-gold", label: { en: "Rose Gold" } },
  ],
});
const fields = [name, date, colour];

describe("validatePersonalization() — necklace example", () => {
  it("accepts a valid configuration and omits empty optionals", () => {
    expect(validatePersonalization(fields, { name: "  Ana ", colour: "gold", date: "" })).toEqual({
      ok: true,
      values: { name: "Ana", colour: "gold" },
    });
  });
  it("requires required fields", () => {
    const r = validatePersonalization(fields, { colour: "gold" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.name).toBe("required");
  });
  it("enforces max length by characters (Cyrillic counts as one each)", () => {
    expect(validatePersonalization(fields, { name: "Ѓ".repeat(20), colour: "gold" }).ok).toBe(true);
    const r = validatePersonalization(fields, { name: "Ѓ".repeat(21), colour: "gold" });
    expect(!r.ok && r.errors.name).toBe("tooLong");
  });
  it("rejects options that are not offered", () => {
    const r = validatePersonalization(fields, { name: "Ana", colour: "platinum" });
    expect(!r.ok && r.errors.colour).toBe("invalidOption");
  });
  it("rejects impossible dates", () => {
    const r = validatePersonalization(fields, { name: "Ana", colour: "gold", date: "2026-02-30" });
    expect(!r.ok && r.errors.date).toBe("invalidDate");
    expect(validatePersonalization(fields, { name: "Ana", colour: "gold", date: "2024-02-29" }).ok).toBe(true);
  });
  it("rejects unknown field ids (tampered or stale)", () => {
    const r = validatePersonalization(fields, { name: "Ana", colour: "gold", injected: "x" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.unknownFields).toBe(true);
  });
  it("rejects non-string values", () => {
    const r = validatePersonalization(fields, { name: { evil: true }, colour: "gold" });
    expect(!r.ok && r.errors.name).toBe("required");
  });
});

describe("normalizeValue()", () => {
  it("strips control and bidi-override characters", () => {
    expect(normalizeValue("text", "A\u0000n‮a")).toBe("Ana");
  });
  it("collapses newlines in single-line fields but keeps them in textarea", () => {
    expect(normalizeValue("text", "Ana\nMarko")).toBe("Ana Marko");
    expect(normalizeValue("textarea", "Line 1\r\n\n\n\nLine 2")).toBe("Line 1\n\nLine 2");
  });
});

describe("charLength()", () => {
  it("counts emoji as one character", () => {
    expect(charLength("♥️")).toBe(2);
    expect(charLength("😀")).toBe(1);
  });
});

describe("defaults", () => {
  it("applies a default max length when the owner left it empty", () => {
    const t = f({ id: "t", type: "text" });
    expect(validatePersonalization([t], { t: "x".repeat(60) }).ok).toBe(true);
    expect(validatePersonalization([t], { t: "x".repeat(61) }).ok).toBe(false);
  });
});
