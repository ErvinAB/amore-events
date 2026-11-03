import "server-only";
import { getCategories, listProducts } from "@/lib/catalog/queries";
import { getStoreSettings } from "@/lib/catalog/settings";
import { productImageUrl } from "@/lib/catalog/images";
import { localized } from "@/i18n/config";
import { formatMoney } from "@/lib/money";

/** Real catalogue data for the explorations (English). */
export async function labData() {
  const [categories, products, settings] = await Promise.all([getCategories(), listProducts({ limit: 8 }), getStoreSettings()]);
  const money = (m: number) => formatMoney(m, { currency: settings.currency_code, locale: "en" });
  return {
    categories: categories.map((c) => ({
      slug: c.slug,
      name: localized(c.name, "en"),
      image: c.image_path ? productImageUrl(c.image_path) : null,
    })),
    products: products.map((p) => ({
      slug: p.slug,
      name: localized(p.name, "en"),
      price: money(p.sale_price_minor ?? p.price_minor),
      was: p.sale_price_minor != null ? money(p.price_minor) : null,
      image: p.image ? productImageUrl(p.image.storage_path) : null,
      personalisable: p.personalisable,
      soldOut: p.stock <= 0,
    })),
    freeFrom: settings.free_delivery_threshold_minor ? money(settings.free_delivery_threshold_minor) : null,
  };
}
export type LabData = Awaited<ReturnType<typeof labData>>;
