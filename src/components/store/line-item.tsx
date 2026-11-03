import Image from "next/image";
import { fill } from "@/i18n/fill";
import Link from "next/link";
import { localized, localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionary";
import type { QuotedLine } from "@/lib/checkout/quote";
import { productImageUrl } from "@/lib/catalog/images";
import { formatDateValue, formatMoney } from "@/lib/money";

/** One bag/checkout line: image, name, chosen personalisation, price. */
export function LineItem({
  line,
  locale,
  currency,
  t,
  compact = false,
  children,
}: {
  line: QuotedLine;
  locale: Locale;
  currency: string;
  t: Dictionary;
  compact?: boolean;
  children?: React.ReactNode;
}) {
  const name = line.name ? localized(line.name, locale) : "";
  const fmt = (m: number) => formatMoney(m, { currency, locale });
  const problem =
    line.status === "unavailable"
      ? t.bag.lineUnavailable
      : line.status === "insufficientStock"
        ? line.stock <= 0
          ? t.bag.lineStockNone
          : t.bag.lineStock.replace("{count}", String(line.stock))
        : line.status === "personalizationChanged"
          ? t.bag.linePersonalization
          : null;
  return (
    <div className="flex gap-4">
      <div className={`relative aspect-[4/5] shrink-0 self-start overflow-hidden rounded-image bg-tissue ${compact ? "w-16" : "w-20 sm:w-24"}`}>
        {line.imagePath ? <Image src={productImageUrl(line.imagePath)} alt="" fill sizes="96px" className="object-cover" /> : null}
        {compact ? (
          <span className="absolute top-1 right-1 flex min-w-5 items-center justify-center rounded-pill bg-ink px-1 text-[11px] leading-5 text-paper">
            {line.quantity}
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          {line.slug && name ? (
            <Link href={localePath(locale, `/product/${line.slug}`)} className="font-medium hover:underline">
              {name}
            </Link>
          ) : (
            <span className="font-medium text-ink-muted">—</span>
          )}
          {line.status !== "unavailable" ? <span className="shrink-0 tabular-nums">{fmt(line.lineTotalMinor)}</span> : null}
        </div>
        {line.personalization.map((p) => (
          <p key={p.label.en} className="text-sm break-words text-ink-muted">
            {localized(p.label, locale)}:{" "}
            <span className="whitespace-pre-line text-ink">
              {p.valueLabel ? localized(p.valueLabel, locale) : p.type === "date" ? formatDateValue(p.value, locale) : p.value}
            </span>
          </p>
        ))}
        {!compact && line.status !== "unavailable" && line.quantity > 1 ? (
          <p className="text-sm text-ink-muted">{fill(t.bag.each, { price: fmt(line.unitMinor) })}</p>
        ) : null}
        {problem ? (
          <p className="text-sm text-error" role="status">
            {problem}
          </p>
        ) : null}
        {children}
      </div>
    </div>
  );
}

export function Totals({
  subtotal,
  delivery,
  total,
  currency,
  locale,
  t,
}: {
  subtotal: number;
  delivery: number;
  total: number;
  currency: string;
  locale: Locale;
  t: Dictionary;
}) {
  const fmt = (m: number) => formatMoney(m, { currency, locale });
  return (
    <dl className="flex flex-col gap-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-ink-muted">{t.bag.subtotal}</dt>
        <dd className="tabular-nums">{fmt(subtotal)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-ink-muted">{t.bag.delivery}</dt>
        <dd className="tabular-nums">{delivery === 0 && subtotal > 0 ? t.bag.deliveryFree : fmt(delivery)}</dd>
      </div>
      <div className="mt-1 flex justify-between border-t border-line pt-3 text-base font-medium">
        <dt>{t.bag.total}</dt>
        <dd className="tabular-nums">{fmt(total)}</dd>
      </div>
    </dl>
  );
}
