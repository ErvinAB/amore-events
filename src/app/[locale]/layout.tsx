import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { onest, spectral } from "../fonts";
import { isLocale, localeMeta, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionary";
import { localeAlternates, openGraphLocale } from "@/i18n/seo";
import { site } from "@/config/site";
import { getCategories } from "@/lib/catalog/queries";
import { getStoreSettings } from "@/lib/catalog/settings";
import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import { formatMoney } from "@/lib/money";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    metadataBase: new URL(site.url),
    title: { default: site.name, template: `%s · ${site.name}` },
    description: dict.meta.defaultDescription,
    alternates: localeAlternates(locale, "/"),
    openGraph: { siteName: site.name, type: "website", ...openGraphLocale(locale) },
  };
}

export default async function StoreRootLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [dict, categories, settings] = await Promise.all([getDictionary(locale), getCategories(), getStoreSettings()]);

  return (
    <html lang={localeMeta[locale].htmlLang} className={`${spectral.variable} ${onest.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <Header
          locale={locale}
          dict={dict}
          categories={categories}
          freeDeliveryFrom={
            settings.free_delivery_threshold_minor
              ? formatMoney(settings.free_delivery_threshold_minor, { currency: settings.currency_code, locale })
              : null
          }
        />
        {children}
        <Footer locale={locale} dict={dict} categories={categories} settings={settings} />
      </body>
    </html>
  );
}
