import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, localized, localePath } from "@/i18n/config";
import { fill, getDictionary } from "@/i18n/dictionary";
import { localeAlternates, openGraphLocale } from "@/i18n/seo";
import { getCategoryBySlug, getProductBySlug, listActiveProductSlugs, listProducts, type ProductSummary } from "@/lib/catalog/queries";
import { getStoreSettings } from "@/lib/catalog/settings";
import { productImageUrl } from "@/lib/catalog/images";
import { effectivePrice, formatMoney } from "@/lib/money";
import { Gallery } from "@/components/store/gallery";
import { Price } from "@/components/store/price";
import { ProductPurchase } from "@/components/store/product-purchase";
import { ProductGrid } from "@/components/store/product-grid";
import { TrustRow } from "@/components/store/trust-band";

const LOW_STOCK = 3;

/** Same category first, then the rest of the catalogue; never the product itself. */
async function relatedTo(productId: string, categorySlug: string | undefined): Promise<ProductSummary[]> {
  const category = categorySlug ? await getCategoryBySlug(categorySlug) : null;
  const [same, all] = await Promise.all([category ? listProducts({ categoryId: category.id }) : [], listProducts({ limit: 12 })]);
  const seen = new Set([productId]);
  const out: ProductSummary[] = [];
  for (const p of [...same, ...all]) {
    if (seen.has(p.id) || p.stock <= 0) continue;
    seen.add(p.id);
    out.push(p);
    if (out.length === 4) break;
  }
  return out;
}

export async function generateStaticParams() {
  const slugs = await listActiveProductSlugs();
  // Cache Components needs at least one value; unknown slugs render on demand.
  return slugs.length ? slugs.map((slug) => ({ slug })) : [{ slug: "__placeholder__" }];
}

export async function generateMetadata({ params }: PageProps<"/[locale]/product/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const product = await getProductBySlug(slug);
  if (!product) return {};
  const name = localized(product.name, locale);
  const description = localized(product.short_description, locale) || undefined;
  const image = product.images[0];
  return {
    title: name,
    description,
    alternates: localeAlternates(locale, `/product/${product.slug}`),
    openGraph: {
      title: name,
      description,
      ...openGraphLocale(locale),
      images: image
        ? [{ url: productImageUrl(image.storage_path), width: image.width ?? undefined, height: image.height ?? undefined, alt: name }]
        : undefined,
    },
  };
}

export default async function ProductPage({ params }: PageProps<"/[locale]/product/[slug]">) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const [product, dict, settings] = await Promise.all([getProductBySlug(slug), getDictionary(locale), getStoreSettings()]);
  if (!product) notFound();

  const name = localized(product.name, locale);
  const short = localized(product.short_description, locale);
  const description = localized(product.description, locale);
  const delivery = settings.delivery_estimate ? localized({ en: settings.delivery_estimate.en ?? "", ...settings.delivery_estimate }, locale) : "";
  const fee = settings.delivery_fee_minor;
  const freeFrom = settings.free_delivery_threshold_minor;
  const money = (minor: number) => formatMoney(minor, { currency: settings.currency_code, locale });
  const stockText =
    product.stock <= 0 ? dict.product.outOfStock : product.stock <= LOW_STOCK ? fill(dict.product.lowStock, { count: product.stock }) : dict.product.inStock;
  const category = product.categories[0];
  const related = await relatedTo(product.id, category?.slug);

  return (
    <main id="main" className="flex-1">
      <div className="mx-auto w-full max-w-wide pb-16 sm:gutter sm:pt-6 lg:pb-24">
        <nav aria-label={dict.product.breadcrumb} className="hidden pb-6 text-sm text-ink-muted sm:block">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href={localePath(locale)} className="hover:text-ink hover:underline">
                {dict.nav.home}
              </Link>
            </li>
            {category ? (
              <>
                <li aria-hidden="true">/</li>
                <li>
                  <Link href={localePath(locale, `/category/${category.slug}`)} className="hover:text-ink hover:underline">
                    {localized(category.name, locale)}
                  </Link>
                </li>
              </>
            ) : null}
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-ink">
              {name}
            </li>
          </ol>
        </nav>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-14">
          <Gallery
            images={product.images.map((img) => ({
              src: productImageUrl(img.storage_path),
              alt: localized(img.alt_text, locale) || name,
              width: img.width,
              height: img.height,
            }))}
            imageLabelTemplate={dict.product.image}
          />
          <div className="gutter flex flex-col gap-6 sm:px-0 lg:sticky lg:top-24 lg:self-start">
            <div className="flex flex-col gap-2">
              {category ? (
                <Link href={localePath(locale, `/category/${category.slug}`)} className="text-sm text-ink-muted hover:underline">
                  {localized(category.name, locale)}
                </Link>
              ) : null}
              <h1 className="heading-1">{name}</h1>
              <Price
                price={product.price_minor}
                sale={product.sale_price_minor}
                currency={settings.currency_code}
                locale={locale}
                wasLabel={dict.product.was}
                className="text-lg"
              />
              <p className={`text-sm ${product.stock <= 0 ? "text-error" : product.stock <= LOW_STOCK ? "text-warning" : "text-ink-muted"}`}>
                {stockText}
              </p>
              {short ? <p className="mt-2 text-ink-muted">{short}</p> : null}
            </div>

            <ProductPurchase
              productId={product.id}
              fields={product.fields}
              stock={product.stock}
              locale={locale}
              t={{ product: dict.product, personalise: dict.personalise }}
              bagHref={localePath(locale, "/cart")}
              name={name}
              priceLabel={money(effectivePrice(product))}
            />

            <dl className="flex flex-col divide-y divide-line border-y border-line text-sm">
              <div className="py-4">
                <dt className="font-medium">{dict.product.codTitle}</dt>
                <dd className="mt-1 text-ink-muted">{dict.product.codBody}</dd>
              </div>
              {/* Full cost near the buy button (configured facts only). */}
              {fee > 0 || delivery ? (
                <div className="py-4">
                  <dt className="font-medium">{dict.product.deliveryTitle}</dt>
                  <dd className="mt-1 text-ink-muted">
                    {fee > 0 ? fill(freeFrom ? dict.product.deliveryFeeFree : dict.product.deliveryFee, { fee: money(fee), amount: freeFrom ? money(freeFrom) : "" }) : null}
                    {fee > 0 && delivery ? " " : null}
                    {delivery}
                  </dd>
                </div>
              ) : null}
            </dl>

            {description ? (
              <section aria-labelledby="details">
                <h2 id="details" className="heading-3 mb-3">
                  {dict.product.description}
                </h2>
                <div className="max-w-prose whitespace-pre-line text-ink">{description}</div>
              </section>
            ) : null}
          </div>
        </div>
      </div>

      {related.length ? (
        <section className="gutter mx-auto max-w-wide pb-16 lg:pb-24" aria-labelledby="related">
          <h2 id="related" className="heading-1 mb-8">
            {dict.product.related}
          </h2>
          <ProductGrid products={related} locale={locale} dict={dict} currency={settings.currency_code} rail />
        </section>
      ) : null}
      <TrustRow t={dict.home} settings={settings} locale={locale} />
    </main>
  );
}

// Block until the catalogue lookup finishes so unknown, draft or archived
// items return a real HTTP 404 (a streamed skeleton would force a 200
// "soft 404"). Known items are prerendered, so navigation stays fast.
export const instant = false;
