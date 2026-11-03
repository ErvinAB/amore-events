import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, localePath } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionary";
import { getCategories, listProducts } from "@/lib/catalog/queries";
import { getStoreSettings } from "@/lib/catalog/settings";
import { ProductGrid } from "@/components/store/product-grid";
import { HomeHero } from "@/components/store/home/hero";
import { CategoryMosaic } from "@/components/store/home/category-mosaic";
import { PersonalisationStory } from "@/components/store/home/story";
import { TrustRow } from "@/components/store/trust-band";

// V0.25 "Modern Gift Atelier" homepage. Imagery is CC0 stand-ins (see src/config/home.ts).
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [dict, categories, featured, settings] = await Promise.all([
    getDictionary(locale),
    getCategories(),
    listProducts({ featured: true, limit: 8 }),
    getStoreSettings(),
  ]);
  const products = featured.length ? featured : await listProducts({ limit: 8 });
  const t = dict.home;

  return (
    <main id="main" className="flex-1">
      <HomeHero locale={locale} t={t} />
      <CategoryMosaic categories={categories} locale={locale} title={t.categoriesTitle} allLabel={t.allGifts} />

      <section className="gutter mx-auto max-w-wide pb-16 lg:pb-24" aria-labelledby="home-featured">
        <div className="mb-8 flex items-baseline justify-between gap-4">
          <h2 id="home-featured" className="heading-1">
            {t.featuredTitle}
          </h2>
          <Link href={localePath(locale, "/shop")} className="shrink-0 border-b border-taupe text-sm hover:border-ink">
            {t.allGifts}
          </Link>
        </div>
        {products.length ? (
          <ProductGrid products={products} locale={locale} dict={dict} currency={settings.currency_code} rail />
        ) : (
          <p className="text-ink-muted">{t.emptyCatalogue}</p>
        )}
      </section>

      <PersonalisationStory t={t} />
      <TrustRow t={t} settings={settings} locale={locale} />
    </main>
  );
}
