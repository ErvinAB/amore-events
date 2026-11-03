import Link from "next/link";
import { localized, localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionary";
import type { CategorySummary } from "@/lib/catalog/queries";
import type { StoreSettings } from "@/lib/catalog/settings";
import { site } from "@/config/site";
import { formatMoney } from "@/lib/money";
import { fill } from "@/i18n/dictionary";
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
  const money = (m: number) => formatMoney(m, { currency: settings.currency_code, locale });
  const fee = settings.delivery_fee_minor;
  const freeFrom = settings.free_delivery_threshold_minor;
  const deliveryLine = fee > 0 ? fill(freeFrom ? dict.footer.deliveryFrom : dict.footer.deliveryFee, { fee: money(fee), amount: freeFrom ? money(freeFrom) : "" }) : "";
  const heading = "mb-4 font-sans text-sm font-medium";
  const link = "inline-flex min-h-9 items-center text-ink-muted hover:text-ink hover:underline underline-offset-4";
  const hasContact = !!(settings.support_phone || settings.support_email || socials.length);

  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className={`gutter mx-auto grid max-w-wide gap-10 py-14 sm:grid-cols-2 lg:py-20 ${hasContact ? "lg:grid-cols-[2fr_1fr_1.4fr_1fr]" : "lg:grid-cols-[2fr_1fr_1.4fr]"}`}>
        <div className="flex flex-col gap-3 sm:col-span-2 lg:col-span-1">
          <Link href={localePath(locale)} className="self-start font-serif text-h2">
            {site.name}
          </Link>
          <p className="max-w-[34ch] text-ink-muted">{dict.meta.defaultDescription}</p>
          <LanguageSwitcher current={locale} label={dict.nav.language} className="mt-3 -ml-2" />
        </div>
        <div>
          <h2 className={heading}>{dict.nav.shop}</h2>
          <ul className="flex flex-col text-sm">
            <li>
              <Link href={localePath(locale, "/shop")} className={link}>
                {dict.nav.shopAll}
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={localePath(locale, `/category/${c.slug}`)} className={link}>
                  {localized(c.name, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className={heading}>{dict.footer.help}</h2>
          <ul className="flex max-w-[32ch] flex-col gap-3 text-sm text-ink-muted">
            <li>
              <span className="block text-ink">{dict.product.codTitle}</span>
              {dict.product.codBody}
            </li>
            {deliveryLine ? (
              <li>
                <span className="block text-ink">{dict.product.deliveryTitle}</span>
                {deliveryLine}
              </li>
            ) : null}
          </ul>
        </div>
        {hasContact ? (
          <div>
            <h2 className={heading}>{dict.footer.contact}</h2>
            <ul className="flex flex-col text-sm">
              {settings.support_phone ? (
                <li>
                  <a href={`tel:${settings.support_phone.replace(/\s/g, "")}`} className={link}>
                    {settings.support_phone}
                  </a>
                </li>
              ) : null}
              {settings.support_email ? (
                <li>
                  <a href={`mailto:${settings.support_email}`} className={link}>
                    {settings.support_email}
                  </a>
                </li>
              ) : null}
              {socials.map(([label, href]) => (
                <li key={label}>
                  <a href={href} rel="noopener noreferrer" target="_blank" className={link}>
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
