import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionary";
import { localeAlternates, openGraphLocale } from "@/i18n/seo";
import { getCategories, listProducts } from "@/lib/catalog/queries";
import { getStoreSettings } from "@/lib/catalog/settings";
import { ProductGridPage } from "@/components/store/product-grid-page";

export async function generateMetadata({ params }: PageProps<"/[locale]/shop">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return { title: dict.shop.title, alternates: localeAlternates(locale, "/shop"), openGraph: openGraphLocale(locale) };
}

export default async function ShopPage({ params }: PageProps<"/[locale]/shop">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [dict, products, settings, categories] = await Promise.all([getDictionary(locale), listProducts(), getStoreSettings(), getCategories()]);
  return (
    <ProductGridPage
      locale={locale}
      dict={dict}
      title={dict.shop.title}
      products={products}
      settings={settings}
      categories={categories}
      currentSlug={null}
    />
  );
}
