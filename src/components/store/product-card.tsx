import Image from "next/image";
import Link from "next/link";
import { localized, localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionary";
import type { ProductSummary } from "@/lib/catalog/queries";
import { productImageUrl } from "@/lib/catalog/images";
import { Price } from "./price";
import { GiftTag } from "./gift-tag";

/**
 * Product card: 4:5 photo on a blush well, name, price. The gift tag marks
 * personalisable pieces. Sold-out is shown plainly, never hidden.
 */
export function ProductCard({
  product,
  locale,
  dict,
  currency,
  priority = false,
  sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw",
}: {
  product: ProductSummary;
  locale: Locale;
  dict: Dictionary;
  currency: string;
  priority?: boolean;
  sizes?: string;
}) {
  const name = localized(product.name, locale);
  const soldOut = product.stock <= 0;
  return (
    <Link href={localePath(locale, `/product/${product.slug}`)} className="group flex flex-col gap-3 outline-offset-4">
      <div className="relative aspect-[4/5] overflow-hidden rounded-image bg-tissue">
        {product.image ? (
          <Image
            src={productImageUrl(product.image.storage_path)}
            alt={localized(product.image.alt_text, locale) || name}
            fill
            sizes={sizes}
            priority={priority}
            className={`object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02] motion-reduce:transition-none ${soldOut ? "opacity-60" : ""}`}
          />
        ) : null}
        {product.personalisable && !soldOut ? (
          <span className="absolute top-3 left-0">
            <GiftTag>{dict.product.personalisable}</GiftTag>
          </span>
        ) : null}
        {soldOut ? (
          <span className="absolute bottom-3 left-3 rounded-pill bg-surface px-3 py-1 text-xs">{dict.product.outOfStock}</span>
        ) : null}
      </div>
      <div className="flex flex-col gap-0.5">
        <h3 className="font-sans text-[0.9375rem] leading-snug text-ink decoration-taupe underline-offset-4 group-hover:underline">{name}</h3>
        <Price
          price={product.price_minor}
          sale={product.sale_price_minor}
          currency={currency}
          locale={locale}
          wasLabel={dict.product.was}
          className="text-[0.9375rem] text-ink"
        />
      </div>
    </Link>
  );
}
