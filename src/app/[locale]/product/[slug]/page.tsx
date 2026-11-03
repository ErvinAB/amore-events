import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, localized, localePath } from "@/i18n/config";
import { fill, getDictionary } from "@/i18n/dictionary";
import { localeAlternates, openGraphLocale } from "@/i18n/seo";
import { getProductBySlug, listActiveProductSlugs } from "@/lib/catalog/queries";
import { getStoreSettings } from "@/lib/catalog/settings";
import { productImageUrl } from "@/lib/catalog/images";
import { formatMoney } from "@/lib/money";
import { Gallery } from "@/components/store/gallery";
import { Price } from "@/components/store/price";
import { ProductPurchase } from "@/components/store/product-purchase";

const LOW_STOCK = 3;

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

  return (
    <main id="main" className="mx-auto w-full max-w-wide flex-1 pb-16 sm:gutter sm:pt-8 lg:pt-12">
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
    </main>
  );
}

// Block until the catalogue lookup finishes so unknown, draft or archived
// items return a real HTTP 404 (a streamed skeleton would force a 200
// "soft 404"). Known items are prerendered, so navigation stays fast.
export const instant = false;
