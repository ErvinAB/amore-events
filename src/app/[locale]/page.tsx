import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, localized, localePath } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionary";
import { getCategories, listProducts } from "@/lib/catalog/queries";
import { getStoreSettings } from "@/lib/catalog/settings";
import { ProductCard } from "@/components/store/product-card";
import { ButtonLink } from "@/components/ui/button";

// V0.1 homepage: deliberately simple. Final layout waits for real photography (D8).
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

  return (
    <main id="main" className="flex-1">
      <section className="bg-tissue">
        <div className="gutter mx-auto flex max-w-content flex-col gap-6 py-16 sm:py-24">
          <h1 className="heading-display max-w-[16ch]">{dict.home.heroTitle}</h1>
          <p className="max-w-[46ch] text-lg text-ink-muted">{dict.home.heroBody}</p>
          <div>
            <ButtonLink href={localePath(locale, "/shop")}>{dict.home.heroCta}</ButtonLink>
          </div>
        </div>
      </section>

      {categories.length ? (
        <section className="gutter mx-auto max-w-content py-12 sm:py-16" aria-labelledby="cats">
          <h2 id="cats" className="heading-2 mb-6">
            {dict.home.categoriesTitle}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={localePath(locale, `/category/${c.slug}`)}
                  className="flex min-h-touch items-center rounded-pill border border-line-strong px-5 hover:border-ink"
                >
                  {localized(c.name, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="gutter mx-auto max-w-content pb-16 sm:pb-24" aria-labelledby="featured">
        <h2 id="featured" className="heading-2 mb-6">
          {dict.home.featuredTitle}
        </h2>
        {products.length ? (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
            {products.map((p, i) => (
              <li key={p.id}>
                <ProductCard product={p} locale={locale} dict={dict} currency={settings.currency_code} priority={i < 2} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-muted">{dict.home.emptyCatalogue}</p>
        )}
      </section>
    </main>
  );
}
