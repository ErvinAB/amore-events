import type { Locale } from "@/i18n/config";

/**
 * Money is stored as integer minor units (e.g. 129050 = 1,290.50 MKD).
 *
 * We do NOT use Intl.NumberFormat here: several browsers (e.g. Chrome)
 * ship without Macedonian/Albanian number data and silently fall back to
 * English, so server and browser would print different prices. This
 * formatter is deterministic and follows CLDR conventions for our locales.
 * Display locale and currency are independent (English shows MKD too).
 */
type LocaleFormat = { group: string; decimal: string; minGroupingDigits: 1 | 2; symbolFirst: boolean; space: string };

const formats: Record<Locale, LocaleFormat> = {
  en: { group: ",", decimal: ".", minGroupingDigits: 1, symbolFirst: true, space: " " },
  mk: { group: ".", decimal: ",", minGroupingDigits: 1, symbolFirst: false, space: " " },
  sq: { group: " ", decimal: ",", minGroupingDigits: 2, symbolFirst: false, space: " " },
};

/** Local symbols where the convention is well established; otherwise the ISO code. */
const symbols: Record<string, Partial<Record<Locale, string>> & { default?: string }> = {
  MKD: { en: "MKD", mk: "ден.", sq: "den" },
  EUR: { default: "€" },
  USD: { default: "$" },
  GBP: { default: "£" },
};

const zeroDecimalCurrencies = new Set(["JPY", "KRW", "VND", "CLP", "ISK", "HUF"]);

export function currencyFractionDigits(currency: string): number {
  return zeroDecimalCurrencies.has(currency.toUpperCase()) ? 0 : 2;
}

function group(intPart: string, f: LocaleFormat): string {
  if (intPart.length < 4 + (f.minGroupingDigits - 1)) return intPart;
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, f.group);
}

export function formatMoney(minor: number, { currency, locale }: { currency: string; locale: Locale }): string {
  const code = currency.toUpperCase();
  const f = formats[locale] ?? formats.en;
  const digits = currencyFractionDigits(code);
  const negative = minor < 0;
  const abs = Math.abs(Math.round(minor));
  const whole = Math.floor(abs / 10 ** digits);
  const frac = abs % 10 ** digits;
  let number = group(String(whole), f);
  if (digits > 0 && frac !== 0) number += f.decimal + String(frac).padStart(digits, "0");
  const sym = symbols[code]?.[locale] ?? symbols[code]?.default ?? code;
  const tight = sym.length === 1; // "€20", not "€ 20"
  const body = f.symbolFirst ? `${sym}${tight ? "" : f.space}${number}` : `${number}${f.space}${sym}`;
  return negative ? `-${body}` : body;
}

/** Price customers pay: sale price when set, otherwise the regular price. */
export function effectivePrice(p: { price_minor: number; sale_price_minor: number | null }): number {
  return p.sale_price_minor ?? p.price_minor;
}
