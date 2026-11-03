import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { localePath } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionary";
import { fill } from "@/i18n/dictionary";
import type { CategorySummary, ProductSummary } from "@/lib/catalog/queries";
import type { StoreSettings } from "@/lib/catalog/settings";
import { productImageUrl } from "@/lib/catalog/images";
import { CategoryNav } from "./category-nav";
import { ProductGrid } from "./product-grid";
import { TrustRow } from "./trust-band";

/** Shop and category listings: header (with the category photo when there is one), chips, grid, facts. */
export function ProductGridPage({
  locale,
  dict,
  title,
  intro,
  products,
  settings,
  categories,
  currentSlug,
  imagePath,
  showBrowseAll,
}: {
  locale: Locale;
  dict: Dictionary;
  title: string;
  intro?: string;
  products: ProductSummary[];
  settings: StoreSettings;
  categories: CategorySummary[];
  currentSlug: string | null;
  imagePath?: string | null;
  showBrowseAll?: boolean;
}) {
  const count = products.length === 1 ? dict.shop.productCountOne : fill(dict.shop.productCount, { count: products.length });
  return (
    <main id="main" className="flex-1">
      <header className="border-b border-line bg-surface">
        <div className={`mx-auto grid max-w-wide ${imagePath ? "lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]" : ""}`}>
          {imagePath ? (
            <div className="relative aspect-[2/1] bg-tissue lg:order-2 lg:aspect-auto lg:min-h-80">
              <Image src={productImageUrl(imagePath)} alt="" fill priority sizes="(min-width: 1440px) 785px, (min-width: 1024px) 55vw, 100vw" className="object-cover" />
            </div>
          ) : null}
          <div className="gutter flex flex-col justify-center gap-3 py-10 lg:py-14">
            <h1 className="heading-display">{title}</h1>
            {intro ? <p className="max-w-[44ch] text-lg text-ink-muted">{intro}</p> : null}
            <p className="text-sm text-ink-muted">{count}</p>
          </div>
        </div>
      </header>

      <div className="gutter mx-auto max-w-wide py-8 lg:py-10">
        <CategoryNav categories={categories} locale={locale} current={currentSlug} allLabel={dict.shop.all} label={dict.shop.browseCategories} />
      </div>

      <section className="gutter mx-auto max-w-wide pb-16 lg:pb-24" aria-label={title}>
        {products.length ? (
          <ProductGrid products={products} locale={locale} dict={dict} currency={settings.currency_code} priorityCount={imagePath ? 0 : 2} />
        ) : (
          <div className="flex flex-col items-start gap-4 border-t border-line pt-8">
            <p className="text-ink-muted">{dict.shop.empty}</p>
            {showBrowseAll ? (
              <Link href={localePath(locale, "/shop")} className="underline underline-offset-4">
                {dict.shop.browseAll}
              </Link>
            ) : null}
          </div>
        )}
      </section>

      <TrustRow t={dict.home} settings={settings} locale={locale} />
    </main>
  );
}
