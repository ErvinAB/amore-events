import "server-only";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { getStoreSettings } from "@/lib/catalog/settings";
import type { LocalizedText } from "@/i18n/config";
import { validatePersonalization, type PersonalizationField } from "@/lib/personalization/validate";
import { cartLineSchema, MAX_LINES, type CartLine } from "@/lib/cart/lines";
import { z } from "zod";

export type LineStatus = "ok" | "unavailable" | "insufficientStock" | "personalizationChanged";

export type QuotedLine = {
  lineId: string;
  productId: string;
  status: LineStatus;
  quantity: number;
  /** Total stock for the product (shared across lines of the same product). */
  stock: number;
  name: LocalizedText | null;
  slug: string | null;
  imagePath: string | null;
  unitMinor: number;
  regularMinor: number;
  lineTotalMinor: number;
  personalization: { label: LocalizedText; type: string; value: string; valueLabel: LocalizedText | null }[];
  /** Normalised values, ready for place_order (only when status is ok). */
  normalized: Record<string, string>;
};

export type CartQuote = {
  lines: QuotedLine[];
  subtotalMinor: number;
  deliveryFeeMinor: number;
  totalMinor: number;
  currency: string;
  freeDeliveryThresholdMinor: number | null;
  canCheckout: boolean;
};

export const quoteInputSchema = z.array(cartLineSchema).max(MAX_LINES);

/**
 * Authoritative quote from CURRENT database values (no cache, no browser
 * prices). For display; place_order() recomputes everything under lock.
 */
export async function quoteLines(lines: CartLine[]): Promise<CartQuote> {
  const settings = await getStoreSettings();
  const ids = [...new Set(lines.map((l) => l.productId))];
  const { data, error } = ids.length
    ? await createSupabasePublicClient()
        .from("products")
        .select(
          "id, slug, name, price_minor, sale_price_minor, stock, product_images(storage_path, sort_order), personalization_fields(id, label, type, required, placeholder, help_text, max_length, options, sort_order)",
        )
        .in("id", ids)
    : { data: [], error: null };
  if (error) throw new Error("quote failed");
  const products = new Map((data ?? []).map((p) => [p.id, p]));

  // Stock is per product, shared by all its lines.
  const qtyByProduct = new Map<string, number>();
  for (const l of lines) qtyByProduct.set(l.productId, (qtyByProduct.get(l.productId) ?? 0) + l.quantity);

  const quoted: QuotedLine[] = lines.map((line) => {
    const p = products.get(line.productId);
    if (!p) {
      return {
        lineId: line.lineId, productId: line.productId, status: "unavailable", quantity: line.quantity, stock: 0,
        name: null, slug: null, imagePath: null, unitMinor: 0, regularMinor: 0, lineTotalMinor: 0, personalization: [], normalized: {},
      };
    }
    const fields = ([...p.personalization_fields] as unknown as PersonalizationField[]).sort((a, b) => a.sort_order - b.sort_order);
    const unit = p.sale_price_minor ?? p.price_minor;
    const check = validatePersonalization(fields, line.personalization);
    const values = check.ok ? check.values : line.personalization;
    const status: LineStatus = !check.ok
      ? "personalizationChanged"
      : (qtyByProduct.get(p.id) ?? 0) > p.stock
        ? "insufficientStock"
        : "ok";
    return {
      lineId: line.lineId,
      productId: p.id,
      status,
      quantity: line.quantity,
      stock: p.stock,
      name: p.name as LocalizedText,
      slug: p.slug,
      imagePath: [...p.product_images].sort((a, b) => a.sort_order - b.sort_order)[0]?.storage_path ?? null,
      unitMinor: unit,
      regularMinor: p.price_minor,
      lineTotalMinor: unit * line.quantity,
      personalization: fields
        .filter((f) => values[f.id])
        .map((f) => ({
          label: f.label,
          type: f.type,
          value: values[f.id],
          valueLabel: f.type === "select" ? (f.options?.find((o) => o.value === values[f.id])?.label ?? null) : null,
        })),
      normalized: check.ok ? check.values : {},
    };
  });

  const subtotal = quoted.filter((l) => l.status === "ok").reduce((s, l) => s + l.lineTotalMinor, 0);
  const free = settings.free_delivery_threshold_minor != null && subtotal >= settings.free_delivery_threshold_minor;
  const delivery = subtotal === 0 || free ? 0 : settings.delivery_fee_minor;
  return {
    lines: quoted,
    subtotalMinor: subtotal,
    deliveryFeeMinor: delivery,
    totalMinor: subtotal + delivery,
    currency: settings.currency_code,
    freeDeliveryThresholdMinor: settings.free_delivery_threshold_minor,
    canCheckout: quoted.length > 0 && quoted.every((l) => l.status === "ok"),
  };
}
