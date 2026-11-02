import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { onest, spectral } from "../fonts";
import { isLocale, localeMeta, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionary";
import { site } from "@/config/site";

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
    openGraph: { siteName: site.name, locale: localeMeta[locale].ogLocale, type: "website" },
  };
}

export default async function StoreRootLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <html lang={localeMeta[locale].htmlLang} className={`${spectral.variable} ${onest.variable}`}>
      <body className="min-h-dvh flex flex-col">{children}</body>
    </html>
  );
}
