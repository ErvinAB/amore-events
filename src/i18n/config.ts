/**
 * Single source of truth for storefront locales.
 * English is the default and canonical locale. Nothing else in the app may
 * assume a default — import `defaultLocale` from here.
 */
export const locales = ["en", "mk", "sq"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeCookie = "store_locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

/** Per-locale metadata used for <html lang>, Intl formatting and Open Graph. */
export const localeMeta: Record<
  Locale,
  { label: string; htmlLang: string; intl: string; ogLocale: string }
> = {
  en: { label: "English", htmlLang: "en", intl: "en-GB", ogLocale: "en_GB" },
  mk: { label: "Македонски", htmlLang: "mk", intl: "mk-MK", ogLocale: "mk_MK" },
  sq: { label: "Shqip", htmlLang: "sq", intl: "sq-MK", ogLocale: "sq_AL" },
};

/** Translatable DB text: English required, others optional. */
export type LocalizedText = { en: string } & Partial<Record<Exclude<Locale, "en">, string>>;

/** Read a localized value, falling back to English when missing or blank. */
export function localized(value: LocalizedText | null | undefined, locale: Locale): string {
  if (!value) return "";
  const v = value[locale];
  return v && v.trim() ? v : value[defaultLocale] ?? "";
}

/** Prefix an internal path with a locale: localePath("mk", "/shop") → "/mk/shop". */
export function localePath(locale: Locale, path = "/"): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return clean === "/" ? `/${locale}` : `/${locale}${clean}`;
}
