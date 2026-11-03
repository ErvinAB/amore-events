import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { isLocale, localePath } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionary";
import { CONFIRMATION_COOKIE, readConfirmation } from "@/lib/checkout/confirmation";
import { formatMoney } from "@/lib/money";
import { ButtonLink } from "@/components/ui/button";
import { ClearCartOnce } from "@/components/store/clear-cart-once";

export async function generateMetadata({ params }: PageProps<"/[locale]/order-success">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return { title: dict.success.title, robots: { index: false, follow: false } };
}

/**
 * Shows ONLY the signed, sanitized confirmation from this browser's cookie.
 * No query parameters, no lookup by order number, no customer data.
 */
export default async function OrderSuccessPage({ params }: PageProps<"/[locale]/order-success">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [dict, jar] = await Promise.all([getDictionary(locale), cookies()]);
  const confirmation = readConfirmation(jar.get(CONFIRMATION_COOKIE)?.value);
  const s = dict.success;

  return (
    <main id="main" className="gutter mx-auto flex w-full max-w-prose flex-1 flex-col gap-6 py-16 sm:py-24">
      {confirmation ? (
        <>
          <ClearCartOnce orderNumber={confirmation.orderNumber} />
          <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-full bg-success-tint">
            <svg viewBox="0 0 24 24" className="size-7 fill-none stroke-success stroke-2 [stroke-linecap:round] [stroke-linejoin:round]">
              <path d="m5 12.5 4.5 4.5L19 7.5" />
            </svg>
          </span>
          <h1 className="heading-display">{s.title}</h1>
          <p className="text-lg text-ink">{s.body}</p>
          <dl className="grid gap-4 rounded-image bg-tissue p-6 sm:grid-cols-2 sm:p-8">
            <div>
              <dt className="text-sm text-ink-muted">{s.orderNumber}</dt>
              <dd className="mt-1 font-serif text-h3 tabular-nums" translate="no">
                {confirmation.orderNumber}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-ink-muted">{s.total}</dt>
              <dd className="mt-1 font-serif text-h3 tabular-nums">
                {formatMoney(confirmation.totalMinor, { currency: confirmation.currency, locale })}
              </dd>
            </div>
          </dl>
          <p className="text-sm text-ink-muted">{s.keep}</p>
        </>
      ) : (
        <>
          <h1 className="heading-1">{s.missingTitle}</h1>
          <p className="text-ink-muted">{s.missingBody}</p>
        </>
      )}
      <div>
        <ButtonLink href={localePath(locale, "/shop")} variant="secondary">
          {s.continue}
        </ButtonLink>
      </div>
    </main>
  );
}

// Reads this browser's confirmation cookie at request time.
export const instant = false;
