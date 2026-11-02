import type { Metadata } from "next";
import { defaultLocale, localeMeta, locales, localePath, type Locale } from "./config";
import { site } from "@/config/site";

/**
 * Canonical + hreflang alternates for a storefront path ("/product/x").
 * Canonical is the page's own locale URL; x-default points at English.
 */
export function localeAlternates(locale: Locale, path: string): Metadata["alternates"] {
  const languages: Record<string, string> = {};
  for (const l of locales) languages[localeMeta[l].htmlLang] = `${site.url}${localePath(l, path)}`;
  languages["x-default"] = `${site.url}${localePath(defaultLocale, path)}`;
  return { canonical: `${site.url}${localePath(locale, path)}`, languages };
}

export function openGraphLocale(locale: Locale) {
  return {
    locale: localeMeta[locale].ogLocale,
    alternateLocale: locales.filter((l) => l !== locale).map((l) => localeMeta[l].ogLocale),
  };
}
