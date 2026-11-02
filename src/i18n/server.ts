import { notFound } from "next/navigation";
import { locale as localeParam } from "next/root-params";
import { isLocale, type Locale } from "./config";
import { getDictionary } from "./dictionary";

/** Current storefront locale from the [locale] root segment (Server Components only). */
export async function getLocale(): Promise<Locale> {
  const value = await localeParam();
  if (!isLocale(value)) notFound();
  return value;
}

export async function getLocaleAndDictionary() {
  const locale = await getLocale();
  return { locale, dict: await getDictionary(locale) };
}
