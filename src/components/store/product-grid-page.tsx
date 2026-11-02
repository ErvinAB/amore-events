import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { localePath } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionary";
import { fill } from "@/i18n/dictionary";
import type { ProductSummary } from "@/lib/catalog/queries";
import { ProductCard } from "./product-card";

export function ProductGridPage({
  locale,
  dict,
  title,
  intro,
  products,
  currency,
  showBrowseAll,
}: {
  locale: Locale;
  dict: Dictionary;
  title: string;
  intro?: string;
  products: ProductSummary[];
  currency: string;
  showBrowseAll?: boolean;
}) {
  return (
    <main id="main" className="gutter mx-auto w-full max-w-content flex-1 py-10 sm:py-14">
      <div className="mb-8 flex flex-col gap-2 sm:mb-10">
        <h1 className="heading-1">{title}</h1>
        {intro ? <p className="max-w-prose text-ink-muted">{intro}</p> : null}
        <p className="text-sm text-ink-muted">
          {products.length === 1 ? dict.shop.productCountOne : fill(dict.shop.productCount, { count: products.length })}
        </p>
      </div>
      {products.length ? (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
          {products.map((p, i) => (
            <li key={p.id}>
              <ProductCard product={p} locale={locale} dict={dict} currency={currency} priority={i < 2} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-start gap-4 border-t border-line pt-8">
          <p className="text-ink-muted">{dict.shop.empty}</p>
          {showBrowseAll ? (
            <Link href={localePath(locale, "/shop")} className="underline underline-offset-4">
              {dict.shop.browseAll}
            </Link>
          ) : null}
        </div>
      )}
    </main>
  );
}
