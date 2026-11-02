import { z } from "zod";

/**
 * Cart lines hold ONLY what the customer chose: product id, quantity and
 * personalisation values. No names, prices or stock — those are always
 * re-read from the server (checkout recalculates everything).
 */
export const MAX_QTY = 20;
export const MAX_LINES = 50;

export const cartLineSchema = z.object({
  lineId: z.string().min(1).max(200),
  productId: z.uuid(),
  quantity: z.number().int().min(1).max(MAX_QTY),
  personalization: z.record(z.uuid(), z.string().max(500)),
  addedAt: z.number().int().nonnegative(),
});
export type CartLine = z.infer<typeof cartLineSchema>;

export const cartSchema = z.object({ v: z.literal(1), lines: z.array(cartLineSchema).max(MAX_LINES) });
export type Cart = z.infer<typeof cartSchema>;

export const emptyCart = (): Cart => ({ v: 1, lines: [] });

/** FNV-1a 32-bit — small, stable, good enough to key cart lines. */
function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/**
 * Same product + same personalisation → same line (quantities merge).
 * Different engraving → different line.
 */
export function lineIdFor(productId: string, personalization: Record<string, string>): string {
  const canonical = JSON.stringify(Object.keys(personalization).sort().map((k) => [k, personalization[k]]));
  return `${productId}:${fnv1a(canonical)}`;
}

export function addLine(cart: Cart, input: { productId: string; quantity: number; personalization: Record<string, string> }, now = Date.now()): Cart {
  const lineId = lineIdFor(input.productId, input.personalization);
  const qty = clampQty(input.quantity);
  const existing = cart.lines.find((l) => l.lineId === lineId);
  if (existing) {
    return { ...cart, lines: cart.lines.map((l) => (l.lineId === lineId ? { ...l, quantity: clampQty(l.quantity + qty) } : l)) };
  }
  const lines = [...cart.lines, { lineId, productId: input.productId, quantity: qty, personalization: { ...input.personalization }, addedAt: now }];
  return { ...cart, lines: lines.slice(-MAX_LINES) };
}

export function setQuantity(cart: Cart, lineId: string, quantity: number): Cart {
  if (quantity <= 0) return removeLine(cart, lineId);
  return { ...cart, lines: cart.lines.map((l) => (l.lineId === lineId ? { ...l, quantity: clampQty(quantity) } : l)) };
}

export function removeLine(cart: Cart, lineId: string): Cart {
  return { ...cart, lines: cart.lines.filter((l) => l.lineId !== lineId) };
}

export function itemCount(cart: Cart): number {
  return cart.lines.reduce((n, l) => n + l.quantity, 0);
}

export function clampQty(q: number): number {
  return Math.max(1, Math.min(MAX_QTY, Math.trunc(Number.isFinite(q) ? q : 1)));
}

/** Parse stored JSON; anything malformed is dropped rather than trusted. */
export function parseStoredCart(raw: string | null): Cart {
  if (!raw) return emptyCart();
  try {
    const json: unknown = JSON.parse(raw);
    const full = cartSchema.safeParse(json);
    if (full.success) return full.data;
    // Keep the valid lines of a partially corrupted cart.
    const lines = Array.isArray((json as { lines?: unknown })?.lines) ? (json as { lines: unknown[] }).lines : [];
    return { v: 1, lines: lines.flatMap((l) => {
      const r = cartLineSchema.safeParse(l);
      return r.success ? [r.data] : [];
    }).slice(0, MAX_LINES) };
  } catch {
    return emptyCart();
  }
}
