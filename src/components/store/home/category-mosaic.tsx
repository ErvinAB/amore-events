import Image from "next/image";
import Link from "next/link";
import { localized, localePath, type Locale } from "@/i18n/config";
import type { CategorySummary } from "@/lib/catalog/queries";
import { productImageUrl } from "@/lib/catalog/images";

/**
 * One lead category (the owners' first in sort order) plus the rest.
 * Names sit under the images, never on top of them.
 */
export function CategoryMosaic({ categories, locale, title, allLabel }: { categories: CategorySummary[]; locale: Locale; title: string; allLabel: string }) {
  if (!categories.length) return null;
  const [lead, ...rest] = categories;
  const tile = (c: CategorySummary, isLead: boolean) => (
    <Link href={localePath(locale, `/category/${c.slug}`)} className="group flex h-full flex-col gap-3 outline-offset-4">
      <div className={`relative overflow-hidden rounded-image bg-tissue ${isLead ? "aspect-[5/4] lg:aspect-auto lg:flex-1" : "aspect-[4/5]"}`}>
        {c.image_path ? (
          <Image
            src={productImageUrl(c.image_path)}
            alt=""
            fill
            sizes={isLead ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 50vw"}
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02] motion-reduce:transition-none"
          />
        ) : null}
      </div>
      <span className={`font-serif decoration-taupe underline-offset-4 group-hover:underline ${isLead ? "text-h3 lg:text-h2" : "text-h4"}`}>
        {localized(c.name, locale)}
      </span>
    </Link>
  );
  return (
    <section className="gutter mx-auto max-w-wide py-14 lg:py-20" aria-labelledby="home-categories">
      <div className="mb-8 flex items-baseline justify-between gap-4">
        <h2 id="home-categories" className="heading-1">
          {title}
        </h2>
        <Link href={localePath(locale, "/shop")} className="shrink-0 border-b border-taupe text-sm hover:border-ink">
          {allLabel}
        </Link>
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-8 lg:grid-cols-4 lg:grid-rows-[auto_auto] lg:gap-x-5 lg:gap-y-10">
        <li className="col-span-2 lg:row-span-2">{tile(lead, true)}</li>
        {rest.map((c) => (
          <li key={c.id}>{tile(c, false)}</li>
        ))}
      </ul>
    </section>
  );
}
