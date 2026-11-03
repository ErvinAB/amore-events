import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionary";
import { getCategories, listProducts } from "@/lib/catalog/queries";
import { getStoreSettings } from "@/lib/catalog/settings";
import { ProductCard } from "@/components/store/product-card";
import { HomeHero } from "@/components/store/home/hero";
import { CategoryMosaic } from "@/components/store/home/category-mosaic";
import { PersonalisationStory } from "@/components/store/home/story";
import { TrustRow } from "@/components/store/home/trust";

// V0.25 "Modern Gift Atelier" homepage. Imagery is placeholder (see src/config/home.ts).
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
        <h2 id="home-featured" className="heading-1 mb-8">
          {t.featuredTitle}
        </h2>
        {products.length ? (
          <ul className="grid grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
            {products.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} locale={locale} dict={dict} currency={settings.currency_code} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-muted">{t.emptyCatalogue}</p>
        )}
      </section>

      <PersonalisationStory t={t} />
      <TrustRow t={t} settings={settings} locale={locale} />
    </main>
  );
}
