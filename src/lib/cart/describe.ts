"use server";

import { z } from "zod";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import type { LocalizedText } from "@/i18n/config";
import type { SelectOption } from "@/lib/personalization/validate";
import { MAX_LINES } from "./lines";

export type CartProductInfo = {
  id: string;
  slug: string;
  name: LocalizedText;
  price_minor: number;
  sale_price_minor: number | null;
  stock: number;
  image_path: string | null;
  fields: { id: string; label: LocalizedText; type: string; options: SelectOption[] | null }[];
};

/**
 * Public, read-only product info for displaying the bag. Only active
 * products are visible (RLS), so missing ids mean "no longer available".
 * Display only — checkout (V0.2) recalculates everything server-side.
 */
export async function describeCartProducts(productIds: unknown): Promise<CartProductInfo[]> {
  const ids = z.array(z.uuid()).max(MAX_LINES).safeParse(productIds);
  if (!ids.success || ids.data.length === 0) return [];
  const { data, error } = await createSupabasePublicClient()
    .from("products")
    .select(
      "id, slug, name, price_minor, sale_price_minor, stock, product_images(storage_path, sort_order), personalization_fields(id, label, type, options)",
    )
    .in("id", [...new Set(ids.data)]);
  if (error) throw new Error("Could not load bag");
  return (data ?? []).map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name as LocalizedText,
    price_minor: p.price_minor,
    sale_price_minor: p.sale_price_minor,
    stock: p.stock,
    image_path: [...p.product_images].sort((a, b) => a.sort_order - b.sort_order)[0]?.storage_path ?? null,
    fields: p.personalization_fields as CartProductInfo["fields"],
  }));
}
