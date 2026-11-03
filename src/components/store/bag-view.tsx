"use client";

import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionary";
import { cartActions, useCart } from "@/lib/cart/store";
import { useCartQuote } from "@/lib/cart/use-quote";
import { MAX_QTY } from "@/lib/cart/lines";
import { formatMoney } from "@/lib/money";
import { ButtonLink } from "@/components/ui/button";
import { LineItem, Totals } from "./line-item";

export function BagView({ locale, t }: { locale: Locale; t: Dictionary }) {
  const cart = useCart();
  const { quote, error, loading } = useCartQuote(cart.lines);

  if (cart.lines.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-ink-muted">{t.bag.empty}</p>
        <ButtonLink href={localePath(locale, "/shop")} variant="secondary">
          {t.bag.continue}
        </ButtonLink>
      </div>
    );
  }
  if (error) return <p className="text-error">{t.bag.loadError}</p>;

  const byId = new Map(quote?.lines.map((l) => [l.lineId, l]) ?? []);
  const hasProblems = quote ? !quote.canCheckout : false;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-14">
      <section aria-labelledby="bag-items" aria-busy={loading}>
        <h2 id="bag-items" className="sr-only">
          {t.bag.title}
        </h2>
        {hasProblems ? (
          <p role="alert" className="mb-4 rounded-control border border-error/30 bg-error-tint px-4 py-3 text-sm text-error">
            {t.bag.fixBag}
          </p>
        ) : null}
        <ul className="flex flex-col divide-y divide-line border-y border-line">
          {cart.lines.map((line) => {
            const q = byId.get(line.lineId);
            const max = Math.max(1, Math.min(MAX_QTY, q?.stock ?? MAX_QTY));
            return (
              <li key={line.lineId} className="py-5">
                {q ? (
                  <LineItem line={q} locale={locale} currency={quote!.currency} t={t}>
                    <div className="mt-2 flex items-center gap-4">
                      {q.status !== "unavailable" ? (
                        <div className="flex items-center rounded-pill border border-line-strong" role="group" aria-label={t.product.quantity}>
                          <button
                            type="button"
                            className="flex size-10 items-center justify-center disabled:opacity-40"
                            onClick={() => cartActions.setQuantity(line.lineId, line.quantity - 1)}
                            disabled={line.quantity <= 1}
                            aria-label={t.product.decrease}
                          >
                            −
                          </button>
                          <output className="w-7 text-center text-sm tabular-nums" aria-live="polite">
                            {line.quantity}
                          </output>
                          <button
                            type="button"
                            className="flex size-10 items-center justify-center disabled:opacity-40"
                            onClick={() => cartActions.setQuantity(line.lineId, line.quantity + 1)}
                            disabled={line.quantity >= max}
                            aria-label={t.product.increase}
                          >
                            +
                          </button>
                        </div>
                      ) : null}
                      <button type="button" onClick={() => cartActions.remove(line.lineId)} className="min-h-10 text-sm underline underline-offset-4">
                        {t.bag.remove}
                      </button>
                    </div>
                  </LineItem>
                ) : (
                  <div className="flex gap-4" aria-hidden="true">
                    <div className="aspect-[4/5] w-20 animate-pulse rounded-image bg-tissue sm:w-24" />
                    <div className="flex flex-1 flex-col gap-2">
                      <div className="h-5 w-2/3 rounded bg-tissue" />
                      <div className="h-4 w-1/3 rounded bg-tissue" />
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <aside className="flex h-fit flex-col gap-5 rounded-image bg-tissue p-5 sm:p-6 lg:sticky lg:top-24" aria-busy={loading}>
        {quote ? (
          <>
            <Totals subtotal={quote.subtotalMinor} delivery={quote.deliveryFeeMinor} total={quote.totalMinor} currency={quote.currency} locale={locale} t={t} />
            {quote.freeDeliveryThresholdMinor && quote.deliveryFeeMinor > 0 ? (
              <p className="text-sm text-ink-muted">
                {t.bag.freeDeliveryFrom.replace("{amount}", formatMoney(quote.freeDeliveryThresholdMinor, { currency: quote.currency, locale }))}
              </p>
            ) : null}
            <ButtonLink
              href={localePath(locale, "/checkout")}
              className="w-full"
              aria-disabled={!quote.canCheckout || loading}
              onClick={(e) => {
                if (!quote.canCheckout || loading) e.preventDefault();
              }}
            >
              {t.bag.checkout}
            </ButtonLink>
            <p className="text-sm text-ink-muted">{t.checkout.codBody}</p>
          </>
        ) : (
          <p className="text-sm text-ink-muted">{t.bag.updating}</p>
        )}
      </aside>
    </div>
  );
}
