import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import type { LocalizedText } from "@/i18n/config";
import type { PersonalizationField } from "@/lib/personalization/validate";
import { CATALOG_TAG } from "./tags";

/*
 * Storefront catalogue reads. Cookie-less anonymous client, so RLS only
 * returns active products/categories. Cached and expired by admin edits
 * via updateTag(CATALOG_TAG).
 */

export type CategorySummary = { id: string; slug: string; name: LocalizedText; description: LocalizedText | null };

export type ProductImage = { storage_path: string; alt_text: LocalizedText | null; width: number | null; height: number | null };

export type ProductSummary = {
  id: string;
  slug: string;
  name: LocalizedText;
  price_minor: number;
  sale_price_minor: number | null;
  stock: number;
  is_new: boolean;
  image: ProductImage | null;
  personalisable: boolean;
};

export type ProductDetail = ProductSummary & {
  short_description: LocalizedText | null;
  description: LocalizedText | null;
  images: ProductImage[];
  fields: PersonalizationField[];
  categories: { slug: string; name: LocalizedText }[];
};

const BASE_SELECT =
  "id, slug, name, price_minor, sale_price_minor, stock, is_new, created_at, product_images(storage_path, alt_text, width, height, sort_order)";
const SUMMARY_SELECT = `${BASE_SELECT}, personalization_fields(id)`;

type SummaryRow = {
  id: string;
  slug: string;
  name: unknown;
  price_minor: number;
  sale_price_minor: number | null;
  stock: number;
  is_new: boolean;
  product_images: (ProductImage & { sort_order: number })[];
  personalization_fields: { id: string }[];
};

function toSummary(row: SummaryRow): ProductSummary {
  const images = [...row.product_images].sort((a, b) => a.sort_order - b.sort_order);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name as LocalizedText,
    price_minor: row.price_minor,
    sale_price_minor: row.sale_price_minor,
    stock: row.stock,
    is_new: row.is_new,
    image: images[0] ? { storage_path: images[0].storage_path, alt_text: images[0].alt_text, width: images[0].width, height: images[0].height } : null,
    personalisable: row.personalization_fields.length > 0,
  };
}

function tagged() {
  cacheTag(CATALOG_TAG);
  cacheLife("days");
}

export async function getCategories(): Promise<CategorySummary[]> {
  "use cache";
  tagged();
  const { data, error } = await createSupabasePublicClient()
    .from("categories")
    .select("id, slug, name, description")
    .order("sort_order")
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as CategorySummary[];
}

export async function getCategoryBySlug(slug: string): Promise<CategorySummary | null> {
  "use cache";
  tagged();
  const { data, error } = await createSupabasePublicClient()
    .from("categories")
    .select("id, slug, name, description")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return (data as CategorySummary) ?? null;
}

export async function listProducts(opts: { categoryId?: string; featured?: boolean; limit?: number } = {}): Promise<ProductSummary[]> {
  "use cache";
  tagged();
  const supabase = createSupabasePublicClient();
  let query = opts.categoryId
    ? supabase
        .from("products")
        .select(`${SUMMARY_SELECT}, product_categories!inner(category_id)`)
        .eq("product_categories.category_id", opts.categoryId)
    : supabase.from("products").select(SUMMARY_SELECT);
  if (opts.featured) query = query.eq("is_featured", true);
  query = query.order("created_at", { ascending: false }).limit(opts.limit ?? 200);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as SummaryRow[]).map(toSummary);
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  "use cache";
  tagged();
  const { data, error } = await createSupabasePublicClient()
    .from("products")
    .select(
      `${BASE_SELECT}, short_description, description,
       personalization_fields(id, label, type, required, placeholder, help_text, max_length, options, sort_order),
       product_categories(categories(slug, name, is_active))`,
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as SummaryRow & {
    short_description: LocalizedText | null;
    description: LocalizedText | null;
    personalization_fields: PersonalizationField[];
    product_categories: { categories: { slug: string; name: LocalizedText; is_active: boolean } | null }[];
  };
  return {
    ...toSummary(row),
    short_description: row.short_description,
    description: row.description,
    images: [...row.product_images].sort((a, b) => a.sort_order - b.sort_order),
    fields: [...row.personalization_fields].sort((a, b) => a.sort_order - b.sort_order),
    categories: row.product_categories
      .map((pc) => pc.categories)
      .filter((c): c is NonNullable<typeof c> => !!c && c.is_active)
      .map((c) => ({ slug: c.slug, name: c.name })),
  };
}

export async function listActiveProductSlugs(): Promise<string[]> {
  "use cache";
  tagged();
  const { data, error } = await createSupabasePublicClient().from("products").select("slug");
  if (error) throw error;
  return (data ?? []).map((r) => r.slug);
}
