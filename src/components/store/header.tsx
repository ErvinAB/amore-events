import Link from "next/link";
import { localized, localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionary";
import type { CategorySummary } from "@/lib/catalog/queries";
import { site } from "@/config/site";
import { BagLink } from "./bag-link";
import { LanguageSwitcher } from "./language-switcher";
import { MobileMenu } from "./mobile-menu";

export function Header({ locale, dict, categories }: { locale: Locale; dict: Dictionary; categories: CategorySummary[] }) {
  const links = [
    { href: localePath(locale, "/shop"), label: dict.nav.shopAll },
    ...categories.map((c) => ({ href: localePath(locale, `/category/${c.slug}`), label: localized(c.name, locale) })),
  ];
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/85">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:bg-paper focus:px-4 focus:py-2">
        {dict.nav.skipToContent}
      </a>
      <div className="gutter mx-auto grid max-w-wide grid-cols-[1fr_auto_1fr] items-center lg:grid-cols-[auto_1fr_auto] lg:gap-10">
        <div className="-ml-3 flex items-center lg:hidden">
          <MobileMenu
            links={links}
            labels={{ open: dict.nav.menu, close: dict.nav.closeMenu, title: dict.nav.shop }}
            footer={<LanguageSwitcher current={locale} label={dict.nav.language} />}
          />
        </div>
        <Link href={localePath(locale)} className="justify-self-center py-3 font-serif text-xl tracking-tight lg:justify-self-start lg:text-2xl">
          {site.name}
        </Link>
        <nav aria-label={dict.nav.shop} className="hidden lg:block">
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="flex min-h-touch items-center hover:underline hover:underline-offset-4">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="-mr-2 flex items-center justify-self-end">
          <LanguageSwitcher current={locale} label={dict.nav.language} className="hidden lg:block" />
          <BagLink href={localePath(locale, "/cart")} label={dict.nav.bag} labelWithCount={dict.nav.bagWithCount} />
        </div>
      </div>
    </header>
  );
}
