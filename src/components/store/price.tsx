import { formatMoney } from "@/lib/money";
import type { Locale } from "@/i18n/config";

/** Sale shows the paid price first, then the original struck through. */
export function Price({
  price,
  sale,
  currency,
  locale,
  wasLabel,
  className = "",
}: {
  price: number;
  sale: number | null;
  currency: string;
  locale: Locale;
  wasLabel: string;
  className?: string;
}) {
  const fmt = (m: number) => formatMoney(m, { currency, locale });
  if (sale == null) return <span className={className}>{fmt(price)}</span>;
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-2 ${className}`}>
      <span className="text-ribbon">{fmt(sale)}</span>
      <s className="text-[0.85em] text-ink-muted">
        <span className="sr-only">{wasLabel.replace("{price}", "")}</span>
        {fmt(price)}
      </s>
    </span>
  );
}
