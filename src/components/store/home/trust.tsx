import { localized, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionary";
import type { StoreSettings } from "@/lib/catalog/settings";
import { formatMoney } from "@/lib/money";

/** Only facts the store is configured with. Nothing invented. */
export function TrustRow({ t, settings, locale }: { t: Dictionary["home"]; settings: StoreSettings; locale: Locale }) {
  const items: { title: string; body: string }[] = [{ title: t.trustCod, body: t.trustCodBody }];
  if (settings.free_delivery_threshold_minor) {
    items.push({
      title: t.trustFree,
      body: t.trustFreeBody.replace("{amount}", formatMoney(settings.free_delivery_threshold_minor, { currency: settings.currency_code, locale })),
    });
  }
  const estimate = settings.delivery_estimate ? localized({ en: settings.delivery_estimate.en ?? "", ...settings.delivery_estimate }, locale) : "";
  if (estimate) items.push({ title: t.trustDelivery, body: estimate });
  if (settings.support_phone) items.push({ title: t.trustHelp, body: t.trustHelpBody.replace("{phone}", settings.support_phone) });

  return (
    <section className="gutter mx-auto max-w-wide py-14 lg:py-16" aria-labelledby="home-trust">
      <h2 id="home-trust" className="sr-only">
        {t.trustTitle}
      </h2>
      <ul className={`grid gap-8 border-t border-line pt-8 sm:grid-cols-2 ${items.length > 2 ? "lg:grid-cols-4" : ""}`}>
        {items.map((i) => (
          <li key={i.title} className="flex gap-3">
            <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-taupe" />
            <span>
              <span className="block font-medium">{i.title}</span>
              <span className="text-sm text-ink-muted">{i.body}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
