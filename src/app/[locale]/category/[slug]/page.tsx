import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, localized } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionary";
import { localeAlternates, openGraphLocale } from "@/i18n/seo";
import { getCategories, getCategoryBySlug, listProducts } from "@/lib/catalog/queries";
import { getStoreSettings } from "@/lib/catalog/settings";
import { ProductGridPage } from "@/components/store/product-grid-page";

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/category/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const category = await getCategoryBySlug(slug);
  if (!category) return {};
  return {
    title: localized(category.name, locale),
    description: localized(category.description, locale) || undefined,
    alternates: localeAlternates(locale, `/category/${category.slug}`),
    openGraph: openGraphLocale(locale),
  };
}

export default async function CategoryPage({ params }: PageProps<"/[locale]/category/[slug]">) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();
  const [dict, products, settings, categories] = await Promise.all([
    getDictionary(locale),
    listProducts({ categoryId: category.id }),
    getStoreSettings(),
    getCategories(),
  ]);
  return (
    <ProductGridPage
      locale={locale}
      dict={dict}
      title={localized(category.name, locale)}
      intro={localized(category.description, locale) || undefined}
      products={products}
      settings={settings}
      categories={categories}
      currentSlug={category.slug}
      imagePath={category.image_path}
      showBrowseAll
    />
  );
}

// Block until the catalogue lookup finishes so unknown, draft or archived
// items return a real HTTP 404 (a streamed skeleton would force a 200
// "soft 404"). Known items are prerendered, so navigation stays fast.
export const instant = false;
