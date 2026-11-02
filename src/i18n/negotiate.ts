import { defaultLocale, isLocale, type Locale } from "./config";

/**
 * Pick a storefront locale: saved cookie → Accept-Language → default (en).
 * Accept-Language parsing is deliberately small: we only match the primary
 * language subtag against our three locales.
 */
export function negotiateLocale(cookieValue: string | undefined, acceptLanguage: string | null): Locale {
  if (isLocale(cookieValue)) return cookieValue;
  if (acceptLanguage) {
    const ranked = acceptLanguage
      .split(",")
      .map((part) => {
        const [tag, ...params] = part.trim().split(";");
        const q = params.find((p) => p.trim().startsWith("q="));
        return { lang: tag.toLowerCase().split("-")[0], q: q ? Number(q.trim().slice(2)) || 0 : 1 };
      })
      .filter((x) => x.q > 0)
      .sort((a, b) => b.q - a.q);
    for (const { lang } of ranked) if (isLocale(lang)) return lang;
  }
  return defaultLocale;
}
