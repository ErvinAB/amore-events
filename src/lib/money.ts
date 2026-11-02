/**
 * Money is stored as integer minor units (e.g. 120000 = 1,200.00 MKD).
 * Display locale and currency are independent: the English storefront still
 * shows the store currency.
 */
export function formatMoney(
  minor: number,
  { currency, locale }: { currency: string; locale: string },
): string {
  const fmt = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    trailingZeroDisplay: "stripIfInteger",
  });
  const digits = fmt.resolvedOptions().maximumFractionDigits ?? 2;
  return fmt.format(minor / 10 ** digits);
}

/** Price customers pay: sale price when set, otherwise the regular price. */
export function effectivePrice(p: { price_minor: number; sale_price_minor: number | null }): number {
  return p.sale_price_minor ?? p.price_minor;
}
