import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionary";
import { listProducts } from "@/lib/catalog/queries";
import { getStoreSettings } from "@/lib/catalog/settings";
import { BagView } from "@/components/store/bag-view";
import { ProductGrid } from "@/components/store/product-grid";

export async function generateMetadata({ params }: PageProps<"/[locale]/cart">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return { title: dict.bag.title, robots: { index: false } };
}

export default async function CartPage({ params }: PageProps<"/[locale]/cart">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [dict, featured, settings] = await Promise.all([getDictionary(locale), listProducts({ featured: true, limit: 4 }), getStoreSettings()]);
  const ideas = featured.filter((p) => p.stock > 0);
  return (
    <main id="main" className="flex-1">
      <div className="gutter mx-auto w-full max-w-content py-10 sm:py-14">
        <h1 className="heading-1 mb-8">{dict.bag.title}</h1>
        <BagView locale={locale} t={dict} />
      </div>
      {ideas.length ? (
        <section className="gutter mx-auto max-w-content pb-16 lg:pb-24" aria-labelledby="bag-ideas">
          <h2 id="bag-ideas" className="heading-2 mb-6">
            {dict.home.featuredTitle}
          </h2>
          <ProductGrid products={ideas} locale={locale} dict={dict} currency={settings.currency_code} rail />
        </section>
      ) : null}
    </main>
  );
}
