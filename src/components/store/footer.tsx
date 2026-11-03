import Link from "next/link";
import { localized, localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionary";
import type { CategorySummary } from "@/lib/catalog/queries";
import type { StoreSettings } from "@/lib/catalog/settings";
import { site } from "@/config/site";
import { LanguageSwitcher } from "./language-switcher";

/** Only shows contact details/socials the owners have actually entered. */
export function Footer({
  locale,
  dict,
  categories,
  settings,
}: {
  locale: Locale;
  dict: Dictionary;
  categories: CategorySummary[];
  settings: StoreSettings;
}) {
  const socials = [
    ["Instagram", settings.instagram_url],
    ["Facebook", settings.facebook_url],
    ["TikTok", settings.tiktok_url],
  ].filter((s): s is [string, string] => !!s[1]);
  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="gutter mx-auto grid max-w-wide gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-2">
          <p className="font-serif text-xl">{site.name}</p>
          <p className="max-w-xs text-sm text-ink-muted">{dict.meta.defaultDescription}</p>
          <LanguageSwitcher current={locale} label={dict.nav.language} className="-ml-2 mt-4" />
        </div>
        <div>
          <h2 className="mb-3 font-sans text-sm font-medium">{dict.nav.shop}</h2>
          <ul className="flex flex-col gap-1 text-sm">
            <li>
              <Link href={localePath(locale, "/shop")} className="inline-flex min-h-8 items-center hover:underline">
                {dict.nav.shopAll}
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={localePath(locale, `/category/${c.slug}`)} className="inline-flex min-h-8 items-center hover:underline">
                  {localized(c.name, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-3 font-sans text-sm font-medium">{dict.product.codTitle}</h2>
          <p className="max-w-xs text-sm text-ink-muted">{dict.product.codBody}</p>
        </div>
        {settings.support_phone || settings.support_email || socials.length ? (
          <div>
            <h2 className="mb-3 font-sans text-sm font-medium">{dict.footer.contact}</h2>
            <ul className="flex flex-col gap-1 text-sm">
              {settings.support_phone ? (
                <li>
                  <a href={`tel:${settings.support_phone.replace(/\s/g, "")}`} className="hover:underline">
                    {settings.support_phone}
                  </a>
                </li>
              ) : null}
              {settings.support_email ? (
                <li>
                  <a href={`mailto:${settings.support_email}`} className="hover:underline">
                    {settings.support_email}
                  </a>
                </li>
              ) : null}
              {socials.map(([label, href]) => (
                <li key={label}>
                  <a href={href} rel="noopener noreferrer" target="_blank" className="hover:underline">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </footer>
  );
}
