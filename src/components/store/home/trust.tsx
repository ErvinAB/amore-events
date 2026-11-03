import { localized, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionary";
import type { StoreSettings } from "@/lib/catalog/settings";
import { formatMoney } from "@/lib/money";

type Icon = "cash" | "parcel" | "clock" | "phone";

/** 24px line icons, drawn to match the 1.5 stroke of the type. */
function TrustIcon({ name }: { name: Icon }) {
  const paths: Record<Icon, React.ReactNode> = {
    cash: (
      <>
        <rect x="2.75" y="6.75" width="18.5" height="10.5" rx="1.5" />
        <circle cx="12" cy="12" r="2.25" />
        <path d="M6 9.75v4.5M18 9.75v4.5" />
      </>
    ),
    parcel: (
      <>
        <path d="M3.75 7.5 12 3.75l8.25 3.75v9L12 20.25 3.75 16.5z" />
        <path d="M3.75 7.5 12 11.25l8.25-3.75M12 11.25v9" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="8.25" />
        <path d="M12 7.5V12l3 1.75" />
      </>
    ),
    phone: <path d="M6.5 3.75h3l1.5 4-2 1.25a10 10 0 0 0 6 6l1.25-2 4 1.5v3A1.75 1.75 0 0 1 18.5 19.25 15.5 15.5 0 0 1 4.75 5.5 1.75 1.75 0 0 1 6.5 3.75z" />,
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-7 shrink-0 fill-none stroke-ribbon stroke-[1.5] [stroke-linejoin:round] [stroke-linecap:round]">
      {paths[name]}
    </svg>
  );
}

/** Only facts the store is configured with. Nothing invented. */
export function TrustRow({ t, settings, locale }: { t: Dictionary["home"]; settings: StoreSettings; locale: Locale }) {
  const items: { icon: Icon; title: string; body: string }[] = [{ icon: "cash", title: t.trustCod, body: t.trustCodBody }];
  if (settings.free_delivery_threshold_minor) {
    items.push({
      icon: "parcel",
      title: t.trustFree,
      body: t.trustFreeBody.replace("{amount}", formatMoney(settings.free_delivery_threshold_minor, { currency: settings.currency_code, locale })),
    });
  }
  const estimate = settings.delivery_estimate ? localized({ en: settings.delivery_estimate.en ?? "", ...settings.delivery_estimate }, locale) : "";
  if (estimate) items.push({ icon: "clock", title: t.trustDelivery, body: estimate });
  if (settings.support_phone) items.push({ icon: "phone", title: t.trustHelp, body: t.trustHelpBody.replace("{phone}", settings.support_phone) });

  return (
    <section className="bg-tissue" aria-labelledby="home-trust">
      <div className="gutter mx-auto max-w-wide py-14 lg:py-16">
        <h2 id="home-trust" className="sr-only">
          {t.trustTitle}
        </h2>
        <ul className={`grid gap-8 sm:grid-cols-2 lg:gap-12 ${items.length > 2 ? "lg:grid-cols-4" : ""}`}>
          {items.map((i) => (
            <li key={i.title} className="flex gap-4">
              <TrustIcon name={i.icon} />
              <span>
                <span className="block font-serif text-h4">{i.title}</span>
                <span className="mt-1 block text-ink-muted">{i.body}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
