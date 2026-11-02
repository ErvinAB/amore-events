import { describe, expect, it } from "vitest";
import { addLine, emptyCart, itemCount, lineIdFor, MAX_QTY, parseStoredCart, removeLine, setQuantity } from "@/lib/cart/lines";

const P = "6f1c2c3a-1111-4222-8333-444455556666";
const NAME = "7a1c2c3a-1111-4222-8333-444455556666";
const COLOUR = "8b1c2c3a-1111-4222-8333-444455556666";

describe("cart lines", () => {
  it("same product + same personalisation merges quantities", () => {
    let c = addLine(emptyCart(), { productId: P, quantity: 1, personalization: { [NAME]: "Ana", [COLOUR]: "gold" } });
    c = addLine(c, { productId: P, quantity: 2, personalization: { [COLOUR]: "gold", [NAME]: "Ana" } });
    expect(c.lines).toHaveLength(1);
    expect(c.lines[0].quantity).toBe(3);
  });

  it("same product with different engraving is a separate line", () => {
    let c = addLine(emptyCart(), { productId: P, quantity: 1, personalization: { [NAME]: "Ana" } });
    c = addLine(c, { productId: P, quantity: 1, personalization: { [NAME]: "Marko" } });
    expect(c.lines).toHaveLength(2);
    expect(new Set(c.lines.map((l) => l.lineId)).size).toBe(2);
    expect(itemCount(c)).toBe(2);
  });

  it("line ids are order-independent and stable", () => {
    expect(lineIdFor(P, { a: "1", b: "2" })).toBe(lineIdFor(P, { b: "2", a: "1" }));
    expect(lineIdFor(P, { a: "1" })).not.toBe(lineIdFor(P, { a: "2" }));
  });

  it("clamps quantities", () => {
    let c = addLine(emptyCart(), { productId: P, quantity: 500, personalization: {} });
    expect(c.lines[0].quantity).toBe(MAX_QTY);
    c = setQuantity(c, c.lines[0].lineId, 0);
    expect(c.lines).toHaveLength(0);
  });

  it("updates and removes lines", () => {
    let c = addLine(emptyCart(), { productId: P, quantity: 1, personalization: {} });
    c = setQuantity(c, c.lines[0].lineId, 4);
    expect(c.lines[0].quantity).toBe(4);
    c = removeLine(c, c.lines[0].lineId);
    expect(c.lines).toHaveLength(0);
  });

  it("does not store prices or names", () => {
    const c = addLine(emptyCart(), { productId: P, quantity: 1, personalization: {} });
    expect(Object.keys(c.lines[0]).sort()).toEqual(["addedAt", "lineId", "personalization", "productId", "quantity"]);
  });
});

describe("parseStoredCart()", () => {
  it("returns an empty cart for missing or broken data", () => {
    expect(parseStoredCart(null).lines).toEqual([]);
    expect(parseStoredCart("{not json").lines).toEqual([]);
  });
  it("drops tampered lines but keeps valid ones", () => {
    const good = { lineId: "x", productId: P, quantity: 1, personalization: {}, addedAt: 1 };
    const raw = JSON.stringify({ v: 1, lines: [good, { ...good, quantity: -5 }, { ...good, price: 1, productId: "nope" }] });
    expect(parseStoredCart(raw).lines).toEqual([good]);
  });
  it("strips unknown keys like a smuggled price", () => {
    const raw = JSON.stringify({ v: 1, lines: [{ lineId: "x", productId: P, quantity: 1, personalization: {}, addedAt: 1, price: 1 }] });
    expect(parseStoredCart(raw).lines[0]).not.toHaveProperty("price");
  });
});
