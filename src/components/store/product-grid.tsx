import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionary";
import type { ProductSummary } from "@/lib/catalog/queries";
import { ProductCard } from "./product-card";

/**
 * The one product grid. Columns follow the count, so a short selection never
 * leaves empty slots. `rail` turns it into a swipeable row on phones (for
 * secondary selections like "You may also like"); the main listing stays a grid.
 */
export function ProductGrid({
  products,
  locale,
  dict,
  currency,
  rail = false,
  priorityCount = 0,
}: {
  products: ProductSummary[];
  locale: Locale;
  dict: Dictionary;
  currency: string;
  rail?: boolean;
  priorityCount?: number;
}) {
  const wide = products.length >= 4;
  const cols = wide ? "lg:grid-cols-4" : "lg:grid-cols-3";
  const sizes = wide
    ? "(min-width: 1440px) 330px, (min-width: 1024px) 24vw, (min-width: 640px) 33vw, 50vw"
    : `(min-width: 1440px) 440px, (min-width: 640px) 33vw, ${rail ? "72vw" : "50vw"}`;
  const list = rail
    ? `-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-x-4 sm:gap-y-10 sm:overflow-visible sm:px-0 lg:gap-x-6 ${cols}`
    : `grid grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-3 sm:gap-x-4 lg:gap-x-6 ${cols}`;
  return (
    <ul className={list}>
      {products.map((p, i) => (
        <li key={p.id} className={rail ? "w-[72%] shrink-0 snap-start sm:w-auto" : undefined}>
          <ProductCard product={p} locale={locale} dict={dict} currency={currency} sizes={sizes} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
