import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionary";
import { getStoreSettings } from "@/lib/catalog/settings";
import { BagView } from "@/components/store/bag-view";

export async function generateMetadata({ params }: PageProps<"/[locale]/cart">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return { title: dict.bag.title, robots: { index: false } };
}

export default async function CartPage({ params }: PageProps<"/[locale]/cart">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [dict, settings] = await Promise.all([getDictionary(locale), getStoreSettings()]);
  return (
    <main id="main" className="gutter mx-auto w-full max-w-prose flex-1 py-10 sm:py-14">
      <h1 className="heading-1 mb-8">{dict.bag.title}</h1>
      <BagView locale={locale} currency={settings.currency_code} t={dict} />
    </main>
  );
}
