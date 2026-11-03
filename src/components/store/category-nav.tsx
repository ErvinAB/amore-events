import Link from "next/link";
import { localized, localePath, type Locale } from "@/i18n/config";
import type { CategorySummary } from "@/lib/catalog/queries";

/**
 * Category chips: lets shoppers narrow scope from any listing.
 * Scrolls sideways on phones rather than wrapping into a wall of pills.
 */
export function CategoryNav({
  categories,
  locale,
  current,
  allLabel,
  label,
}: {
  categories: CategorySummary[];
  locale: Locale;
  /** Current category slug, null for "All", omitted when none is current (e.g. 404). */
  current?: string | null;
  allLabel: string;
  label: string;
}) {
  const items: { slug: string | null; href: string; name: string }[] = [
    { slug: null, href: localePath(locale, "/shop"), name: allLabel },
    ...categories.map((c) => ({ slug: c.slug, href: localePath(locale, `/category/${c.slug}`), name: localized(c.name, locale) })),
  ];
  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:px-0">
      <ul className="flex w-max gap-2 lg:w-auto lg:flex-wrap">
        {items.map((i) => {
          const active = current !== undefined && i.slug === current;
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-10 items-center rounded-pill border px-4 text-sm whitespace-nowrap transition-colors ${
                  active ? "border-ink bg-ink text-on-ink" : "border-line-strong bg-surface hover:border-ink"
                }`}
              >
                {i.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
