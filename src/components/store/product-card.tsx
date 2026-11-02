import Image from "next/image";
import Link from "next/link";
import { localized, localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionary";
import type { ProductSummary } from "@/lib/catalog/queries";
import { productImageUrl } from "@/lib/catalog/images";
import { Price } from "./price";

export function ProductCard({
  product,
  locale,
  dict,
  currency,
  priority = false,
}: {
  product: ProductSummary;
  locale: Locale;
  dict: Dictionary;
  currency: string;
  priority?: boolean;
}) {
  const name = localized(product.name, locale);
  const soldOut = product.stock <= 0;
  return (
    <Link href={localePath(locale, `/product/${product.slug}`)} className="group flex flex-col gap-3">
      <div className="relative aspect-[4/5] overflow-hidden rounded-image bg-tissue">
        {product.image ? (
          <Image
            src={productImageUrl(product.image.storage_path)}
            alt={localized(product.image.alt_text, locale) || name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            priority={priority}
            className={`object-cover transition-opacity duration-300 group-hover:opacity-90 ${soldOut ? "opacity-60" : ""}`}
          />
        ) : null}
        {soldOut ? (
          <span className="absolute bottom-2 left-2 rounded-pill bg-paper/90 px-2.5 py-1 text-xs">{dict.product.outOfStock}</span>
        ) : null}
      </div>
      <div className="flex flex-col gap-0.5">
        <h3 className="font-sans text-sm leading-snug text-ink group-hover:underline group-hover:underline-offset-4 sm:text-base">{name}</h3>
        <Price
          price={product.price_minor}
          sale={product.sale_price_minor}
          currency={currency}
          locale={locale}
          wasLabel={dict.product.was}
          className="text-sm text-ink-muted sm:text-base"
        />
        {product.personalisable ? <span className="text-xs text-ink-muted">{dict.product.personalisable}</span> : null}
      </div>
    </Link>
  );
}
