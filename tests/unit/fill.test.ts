import { describe, expect, it } from "vitest";
import { fill } from "@/i18n/fill";

describe("fill", () => {
  it("interpolates named values", () => {
    expect(fill("{fee} delivery, free over {amount}.", { fee: "MKD 150", amount: "MKD 3,000" })).toBe("MKD 150 delivery, free over MKD 3,000.");
  });
  it("does not double a full stop after a value that already ends in one", () => {
    expect(fill("Достава {fee}, бесплатна над {amount}.", { fee: "150 ден.", amount: "3.000 ден." })).toBe("Достава 150 ден., бесплатна над 3.000 ден.");
  });
  it("leaves unknown placeholders visible", () => {
    expect(fill("Hi {name}", {})).toBe("Hi {name}");
  });
});
